"""
Обучение модели суммаризации на кастомном датасете логов
Fine-tuning BART для специфики серверных логов
"""

import torch
import torch.nn as nn
from torch.utils.data import Dataset, DataLoader
from transformers import (
    BartForConditionalGeneration,
    BartTokenizer,
    AdamW,
    get_linear_schedule_with_warmup,
    Seq2SeqTrainingArguments,
    Seq2SeqTrainer,
    DataCollatorForSeq2Seq
)
from datasets import Dataset as HFDataset
import pandas as pd
import numpy as np
from typing import Dict, List, Tuple
import json
from pathlib import Path
from sklearn.model_selection import train_test_split
import logging
from tqdm import tqdm
import wandb  # Для логирования метрик

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class LogSummaryDataset(Dataset):
    """Dataset для обучения модели суммаризации логов"""
    
    def __init__(
        self,
        data: List[Dict],
        tokenizer: BartTokenizer,
        max_input_length: int = 1024,
        max_output_length: int = 150
    ):
        self.data = data
        self.tokenizer = tokenizer
        self.max_input_length = max_input_length
        self.max_output_length = max_output_length
    
    def __len__(self):
        return len(self.data)
    
    def __getitem__(self, idx):
        item = self.data[idx]
        
        # Токенизация входного текста (логи)
        input_encoding = self.tokenizer(
            item['logs'],
            truncation=True,
            padding='max_length',
            max_length=self.max_input_length,
            return_tensors='pt'
        )
        
        # Токенизация выходного текста (суммаризация)
        output_encoding = self.tokenizer(
            item['summary'],
            truncation=True,
            padding='max_length',
            max_length=self.max_output_length,
            return_tensors='pt'
        )
        
        return {
            'input_ids': input_encoding['input_ids'].flatten(),
            'attention_mask': input_encoding['attention_mask'].flatten(),
            'labels': output_encoding['input_ids'].flatten()
        }

class LogSummarizerTrainer:
    """
    Тренер для модели суммаризации логов
    Поддерживает смешанную точность (FP16) и gradient accumulation
    """
    
    def __init__(
        self,
        model_name: str = "facebook/bart-large-cnn",
        device: str = "cuda" if torch.cuda.is_available() else "cpu"
    ):
        self.device = device
        logger.info(f"Инициализация тренера на устройстве: {device}")
        
        # Загрузка модели и токенизатора
        self.model = BartForConditionalGeneration.from_pretrained(model_name)
        self.tokenizer = BartTokenizer.from_pretrained(model_name)
        
        # Перемещение модели на устройство
        self.model.to(device)
        
        # Freeze некоторые слои для ускорения обучения
        self._freeze_layers()
        
    def _freeze_layers(self, freeze_encoder: bool = False):
        """Замораживает некоторые слои для transfer learning"""
        if freeze_encoder:
            for param in self.model.model.encoder.parameters():
                param.requires_grad = False
            logger.info("Encoder заморожен")
        
        # Размораживаем последние 2 слоя decoder для адаптации
        for layer in self.model.model.decoder.layers[-2:]:
            for param in layer.parameters():
                param.requires_grad = True
    
    def prepare_data(
        self,
        data_path: Path,
        val_split: float = 0.1,
        test_split: float = 0.1
    ) -> Tuple[HFDataset, HFDataset, HFDataset]:
        """
        Подготовка данных для обучения
        Ожидается JSON формат: [{"logs": "...", "summary": "..."}]
        """
        with open(data_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        # Разделение на train/val/test
        train_data, temp_data = train_test_split(
            data, test_size=val_split + test_split, random_state=42
        )
        val_data, test_data = train_test_split(
            temp_data, test_size=test_split/(val_split+test_split), random_state=42
        )
        
        # Конвертация в HuggingFace Dataset
        train_dataset = HFDataset.from_list(train_data)
        val_dataset = HFDataset.from_list(val_data)
        test_dataset = HFDataset.from_list(test_data)
        
        logger.info(f"Train size: {len(train_dataset)}")
        logger.info(f"Val size: {len(val_dataset)}")
        logger.info(f"Test size: {len(test_dataset)}")
        
        return train_dataset, val_dataset, test_dataset
    
    def preprocess_function(
        self,
        examples: Dict,
        max_input_length: int = 1024,
        max_output_length: int = 150
    ) -> Dict:
        """Функция предобработки для HF datasets"""
        
        # Токенизация входов
        model_inputs = self.tokenizer(
            examples['logs'],
            max_length=max_input_length,
            truncation=True,
            padding=False
        )
        
        # Токенизация выходов
        with self.tokenizer.as_target_tokenizer():
            labels = self.tokenizer(
                examples['summary'],
                max_length=max_output_length,
                truncation=True,
                padding=False
            )
        
        model_inputs['labels'] = labels['input_ids']
        return model_inputs
    
    def train(
        self,
        train_dataset: HFDataset,
        val_dataset: HFDataset,
        output_dir: str = "./models/log-summarizer",
        num_epochs: int = 5,
        batch_size: int = 8,
        learning_rate: float = 3e-5,
        use_wandb: bool = True
    ):
        """Запуск обучения модели"""
        
        # Инициализация WandB для мониторинга
        if use_wandb:
            wandb.init(
                project="log-summarizer",
                config={
                    "model": "bart-large-cnn",
                    "epochs": num_epochs,
                    "batch_size": batch_size,
                    "learning_rate": learning_rate,
                    "max_input_length": 1024,
                    "max_output_length": 150
                }
            )
        
        # Data collator для динамического паддинга
        data_collator = DataCollatorForSeq2Seq(
            tokenizer=self.tokenizer,
            model=self.model,
            padding=True
        )
        
        # Настройки обучения
        training_args = Seq2SeqTrainingArguments(
            output_dir=output_dir,
            evaluation_strategy="epoch",
            save_strategy="epoch",
            learning_rate=learning_rate,
            per_device_train_batch_size=batch_size,
            per_device_eval_batch_size=batch_size,
            weight_decay=0.01,
            save_total_limit=2,
            num_train_epochs=num_epochs,
            predict_with_generate=True,
            generation_max_length=150,
            logging_dir=f"{output_dir}/logs",
            logging_steps=100,
            report_to="wandb" if use_wandb else "none",
            load_best_model_at_end=True,
            metric_for_best_model="rouge1",
            greater_is_better=True,
            fp16=torch.cuda.is_available(),  # Смешанная точность
            gradient_accumulation_steps=2,
            warmup_steps=500,
            dataloader_num_workers=4
        )
        
        # Инициализация тренера
        trainer = Seq2SeqTrainer(
            model=self.model,
            args=training_args,
            data_collator=data_collator,
            train_dataset=train_dataset,
            eval_dataset=val_dataset,
            tokenizer=self.tokenizer,
            compute_metrics=self.compute_metrics
        )
        
        # Запуск обучения
        logger.info("Начало обучения...")
        trainer.train()
        
        # Сохранение финальной модели
        trainer.save_model(output_dir)
        self.tokenizer.save_pretrained(output_dir)
        logger.info(f"Модель сохранена в {output_dir}")
        
        if use_wandb:
            wandb.finish()
    
    def compute_metrics(self, eval_pred):
        """
        Вычисление метрик качества (ROUGE, BLEU)
        """
        from rouge_score import rouge_scorer
        from nltk.translate.bleu_score import sentence_bleu, SmoothingFunction
        
        predictions, labels = eval_pred
        decoded_preds = self.tokenizer.batch_decode(predictions, skip_special_tokens=True)
        
        # Замена -100 на pad_token_id
        labels = np.where(labels != -100, labels, self.tokenizer.pad_token_id)
        decoded_labels = self.tokenizer.batch_decode(labels, skip_special_tokens=True)
        
        # Вычисление ROUGE
        scorer = rouge_scorer.RougeScorer(['rouge1', 'rouge2', 'rougeL'], use_stemmer=True)
        rouge_scores = {'rouge1': [], 'rouge2': [], 'rougeL': []}
        
        for pred, label in zip(decoded_preds, decoded_labels):
            scores = scorer.score(pred, label)
            for key in rouge_scores:
                rouge_scores[key].append(scores[key].fmeasure)
        
        # Вычисление BLEU
        bleu_scores = []
        smoothie = SmoothingFunction().method4
        
        for pred, label in zip(decoded_preds, decoded_labels):
            bleu = sentence_bleu([label.split()], pred.split(), smoothing_function=smoothie)
            bleu_scores.append(bleu)
        
        metrics = {
            'rouge1': np.mean(rouge_scores['rouge1']),
            'rouge2': np.mean(rouge_scores['rouge2']),
            'rougeL': np.mean(rouge_scores['rougeL']),
            'bleu': np.mean(bleu_scores)
        }
        
        logger.info(f"Validation metrics: {metrics}")
        return metrics
    
    def evaluate_on_test(self, test_dataset: HFDataset) -> Dict:
        """Оценка модели на тестовом наборе данных"""
        from tqdm import tqdm
        
        self.model.eval()
        predictions = []
        references = []
        
        with torch.no_grad():
            for example in tqdm(test_dataset, desc="Evaluation"):
                input_ids = self.tokenizer(
                    example['logs'],
                    return_tensors='pt',
                    truncation=True,
                    max_length=1024
                ).input_ids.to(self.device)
                
                # Генерация суммаризации
                output_ids = self.model.generate(
                    input_ids,
                    max_length=150,
                    num_beams=4,
                    early_stopping=True,
                    no_repeat_ngram_size=3
                )
                
                prediction = self.tokenizer.decode(output_ids[0], skip_special_tokens=True)
                predictions.append(prediction)
                references.append(example['summary'])
        
        # Сохранение результатов
        results = {
            'predictions': predictions,
            'references': references
        }
        
        with open('test_results.json', 'w', encoding='utf-8') as f:
            json.dump(results, f, ensure_ascii=False, indent=2)
        
        return results

# Генерация синтетических данных для обучения (если нет реальных)
def generate_synthetic_data(num_samples: int = 10000) -> List[Dict]:
    """
    Генерация синтетических данных для обучения
    Имитация различных типов ошибок на серверах
    """
    import random
    
    error_templates = {
        'database': {
            'logs': [
                "Database connection pool exhausted. Active connections: 150, Max: 100",
                "Deadlock detected when updating users table. Transaction will be rolled back",
                "Query timeout after 30000ms: SELECT * FROM large_table WHERE ...",
                "Connection refused: could not connect to database server on host 'db.example.com'",
                "Disk full for database partition. Cannot write to WAL file"
            ],
            'summary': [
                "Database connection pool is full, need to increase max connections",
                "Deadlock occurred during concurrent transaction, implement retry logic",
                "Query taking too long to execute, need to optimize indexes",
                "Database server unreachable, check network connectivity",
                "Database disk space critically low, need to free up space or increase capacity"
            ]
        },
        'memory': {
            'logs': [
                "OutOfMemoryError: Java heap space. Used: 8GB, Max: 8GB",
                "Memory leak detected in application: heap size increasing by 100MB/hour",
                "GC overhead limit exceeded: 98% time spent in garbage collection",
                "Cannot allocate memory for new process: fork failed",
                "Swap space exhausted: 0 bytes available"
            ],
            'summary': [
                "Application running out of heap memory, increase JVM memory limits",
                "Memory leak detected, need to review resource management code",
                "Excessive garbage collection impacting performance, tune GC parameters",
                "System memory exhausted, check for memory leaks or increase RAM",
                "Swap space completely used, system may become unstable"
            ]
        },
        'network': {
            'logs': [
                "Connection timeout to upstream service after 5 retries",
                "TCP connection reset by peer while reading response",
                "DNS resolution failed for api.example.com: no such host",
                "Network latency spike detected: 500ms (normal: 50ms)",
                "SSL handshake failed: certificate expired"
            ],
            'summary': [
                "Upstream service unreachable, check service health and network",
                "Connection reset by remote host, investigate network stability",
                "DNS resolution failing, check DNS configuration",
                "Network latency unusually high, investigate routing issues",
                "SSL certificate expired, renew certificate"
            ]
        }
    }
    
    data = []
    
    for _ in range(num_samples):
        error_type = random.choice(list(error_templates.keys()))
        template = error_templates[error_type]
        
        log_template = random.choice(template['logs'])
        summary_template = random.choice(template['summary'])
        
        # Добавляем вариации
        timestamp = f"2024-01-{random.randint(1, 30):02d} {random.randint(0, 23):02d}:{random.randint(0, 59):02d}:{random.randint(0, 59):02d}"
        
        log = f"{timestamp} ERROR {log_template}"
        
        data.append({
            'logs': log,
            'summary': summary_template
        })
    
    return data

if __name__ == "__main__":
    # Пример использования
    
    # Генерация данных
    logger.info("Генерация синтетических данных...")
    synthetic_data = generate_synthetic_data(5000)
    
    with open('training_data.json', 'w', encoding='utf-8') as f:
        json.dump(synthetic_data, f, ensure_ascii=False, indent=2)
    
    # Инициализация тренера
    trainer = LogSummarizerTrainer()
    
    # Подготовка данных
    train_dataset, val_dataset, test_dataset = trainer.prepare_data(
        Path('training_data.json')
    )
    
    # Предобработка
    train_dataset = train_dataset.map(
        trainer.preprocess_function,
        batched=True,
        remove_columns=train_dataset.column_names
    )
    val_dataset = val_dataset.map(
        trainer.preprocess_function,
        batched=True,
        remove_columns=val_dataset.column_names
    )
    
    # Обучение
    trainer.train(
        train_dataset=train_dataset,
        val_dataset=val_dataset,
        num_epochs=10,
        batch_size=4,
        learning_rate=2e-5
    )
    
    # Оценка на тестовых данных
    test_results = trainer.evaluate_on_test(test_dataset)
    logger.info("Обучение завершено!")