"""
ML сервис для обработки логов
Включает суммаризацию, классификацию, кластеризацию и обнаружение аномалий
"""

import asyncio
from typing import List, Dict, Any, Tuple, Optional
import numpy as np
from collections import defaultdict
from datetime import datetime, timedelta
import torch
from transformers import (
    AutoTokenizer, 
    AutoModelForSeq2SeqLM,
    AutoModelForSequenceClassification,
    AutoModel
)
from sentence_transformers import SentenceTransformer
from sklearn.cluster import DBSCAN
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
import logging

from app.core.config import settings
from app.models.log_entry import LogEntry, LogLevel
from app.models.error_cluster import ErrorCluster
from app.models.summary import Summary

logger = logging.getLogger(__name__)

class MLService:
    """Главный ML сервис для анализа логов"""
    
    def __init__(self):
        self.device = torch.device(settings.DEVICE if torch.cuda.is_available() else "cpu")
        logger.info(f"Используем устройство: {self.device}")
        
        # Инициализация моделей
        self._init_models()
        
        # Кэш для быстрого доступа
        self.embedding_cache = {}
        
    def _init_models(self):
        """Инициализация всех ML моделей"""
        try:
            # Модель для суммаризации (BART)
            logger.info("Загрузка модели суммаризации...")
            self.summarizer_tokenizer = AutoTokenizer.from_pretrained(
                settings.SUMMARIZATION_MODEL
            )
            self.summarizer_model = AutoModelForSeq2SeqLM.from_pretrained(
                settings.SUMMARIZATION_MODEL
            ).to(self.device)
            
            # Модель для классификации (DeBERTa)
            logger.info("Загрузка модели классификации...")
            self.classifier_tokenizer = AutoTokenizer.from_pretrained(
                settings.CLASSIFICATION_MODEL
            )
            self.classifier_model = AutoModelForSequenceClassification.from_pretrained(
                settings.CLASSIFICATION_MODEL,
                num_labels=5  # 5 уровней серьезности
            ).to(self.device)
            
            # Модель для эмбеддингов (Sentence Transformers)
            logger.info("Загрузка модели эмбеддингов...")
            self.embedding_model = SentenceTransformer(
                settings.EMBEDDING_MODEL,
                device=self.device
            )
            
            logger.info("Все модели успешно загружены")
            
        except Exception as e:
            logger.error(f"Ошибка загрузки моделей: {e}")
            raise
    
    async def generate_embeddings(
        self, 
        log_entries: List[LogEntry],
        batch_size: int = 32
    ) -> List[np.ndarray]:
        """Генерация векторных представлений для логов"""
        embeddings = []
        texts = []
        
        for entry in log_entries:
            # Используем очищенное сообщение для эмбеддинга
            text = entry.cleaned_message or entry.raw_message
            texts.append(text)
        
        # Генерация эмбеддингов батчами для эффективности
        for i in range(0, len(texts), batch_size):
            batch = texts[i:i+batch_size]
            batch_embeddings = await asyncio.get_event_loop().run_in_executor(
                None,
                self.embedding_model.encode,
                batch,
                {
                    'show_progress_bar': False,
                    'convert_to_numpy': True,
                    'normalize_embeddings': True
                }
            )
            embeddings.extend(batch_embeddings)
            
            # Кэшируем результаты
            for j, embedding in enumerate(batch_embeddings):
                self.embedding_cache[texts[i+j]] = embedding
        
        return embeddings
    
    async def cluster_errors(
        self,
        log_entries: List[LogEntry],
        embeddings: List[np.ndarray]
    ) -> List[ErrorCluster]:
        """
        Кластеризация ошибок с использованием DBSCAN
        Группирует похожие сообщения об ошибках
        """
        # Фильтруем только ошибки и критические события
        error_entries = [
            entry for entry in log_entries 
            if entry.level in [LogLevel.ERROR, LogLevel.CRITICAL, LogLevel.FATAL]
        ]
        
        if not error_entries:
            return []
        
        # Получаем эмбеддинги только для ошибок
        error_indices = [log_entries.index(entry) for entry in error_entries]
        error_embeddings = np.array([embeddings[i] for i in error_indices])
        
        # Нормализация и кластеризация
        scaler = StandardScaler()
        normalized_embeddings = scaler.fit_transform(error_embeddings)
        
        # DBSCAN для кластеризации
        clustering = DBSCAN(
            eps=settings.CLUSTERING_EPS,
            min_samples=settings.CLUSTERING_MIN_SAMPLES,
            metric='cosine'
        )
        
        cluster_labels = clustering.fit_predict(normalized_embeddings)
        
        # Формируем кластеры
        clusters = []
        cluster_dict = defaultdict(list)
        
        for idx, label in enumerate(cluster_labels):
            if label != -1:  # -1 означает шум (не принадлежит ни одному кластеру)
                cluster_dict[label].append(error_entries[idx])
        
        for label, entries in cluster_dict.items():
            # Находим центр кластера (усредненный эмбеддинг)
            cluster_embeddings = [error_embeddings[error_indices.index(log_entries.index(entry))] 
                                 for entry in entries]
            center_embedding = np.mean(cluster_embeddings, axis=0)
            
            # Находим наиболее репрезентативное сообщение (ближайшее к центру)
            representative_idx = np.argmin([
                np.linalg.norm(emb - center_embedding) 
                for emb in cluster_embeddings
            ])
            representative_message = entries[representative_idx].raw_message
            
            # Создаем кластер
            cluster = ErrorCluster(
                cluster_id=f"cluster_{label}",
                error_messages=[entry.raw_message for entry in entries],
                representative_message=representative_message,
                size=len(entries),
                severity_score=np.mean([e.severity_score for e in entries]),
                first_occurrence=min(e.timestamp for e in entries),
                last_occurrence=max(e.timestamp for e in entries)
            )
            clusters.append(cluster)
        
        # Сортируем по размеру кластера (самые частые ошибки первыми)
        clusters.sort(key=lambda x: x.size, reverse=True)
        
        return clusters
    
    async def generate_summary(
        self,
        log_entries: List[LogEntry],
        clusters: List[ErrorCluster],
        max_length: int = 150,
        min_length: int = 30
    ) -> str:
        """
        Генерация суммаризации логов с помощью BART
        Создает человеко-читаемое описание проблем
        """
        # Формируем контекст для суммаризации
        context = self._build_summary_context(log_entries, clusters)
        
        # Токенизация
        inputs = self.summarizer_tokenizer(
            context,
            max_length=1024,
            truncation=True,
            return_tensors="pt"
        ).to(self.device)
        
        # Генерация суммаризации
        with torch.no_grad():
            summary_ids = self.summarizer_model.generate(
                inputs["input_ids"],
                max_length=max_length,
                min_length=min_length,
                length_penalty=2.0,
                num_beams=4,
                early_stopping=True,
                no_repeat_ngram_size=3,
                temperature=0.7
            )
        
        summary = self.summarizer_tokenizer.decode(
            summary_ids[0], 
            skip_special_tokens=True
        )
        
        return summary
    
    def _build_summary_context(
        self, 
        log_entries: List[LogEntry], 
        clusters: List[ErrorCluster]
    ) -> str:
        """Построение контекста для суммаризации"""
        context_parts = []
        
        # Общая статистика
        total_errors = len([e for e in log_entries if e.level in 
                          [LogLevel.ERROR, LogLevel.CRITICAL, LogLevel.FATAL]])
        context_parts.append(f"Total log entries: {len(log_entries)}")
        context_parts.append(f"Total errors: {total_errors}")
        
        # Топ кластеры ошибок
        if clusters:
            context_parts.append("\nMain error patterns:")
            for i, cluster in enumerate(clusters[:5]):  # Топ-5 кластеров
                context_parts.append(
                    f"{i+1}. {cluster.representative_message[:100]} "
                    f"(occurred {cluster.size} times)"
                )
        
        # Критические события по времени
        time_critical = [e for e in log_entries if e.severity_score > 0.8]
        if time_critical:
            context_parts.append("\nCritical events:")
            for event in time_critical[:10]:  # Последние 10 критических событий
                context_parts.append(f"- {event.raw_message[:150]}")
        
        return " ".join(context_parts)
    
    async def classify_error_severity(
        self,
        log_entry: LogEntry
    ) -> Dict[str, float]:
        """
        Классификация серьезности ошибки с помощью DeBERTa
        Возвращает вероятности для каждого уровня
        """
        # Подготовка текста
        text = f"Level: {log_entry.level.value}. Message: {log_entry.cleaned_message}"
        
        # Токенизация
        inputs = self.classifier_tokenizer(
            text,
            truncation=True,
            padding=True,
            max_length=512,
            return_tensors="pt"
        ).to(self.device)
        
        # Инференс
        with torch.no_grad():
            outputs = self.classifier_model(**inputs)
            probabilities = torch.nn.functional.softmax(outputs.logits, dim=-1)
        
        # Маппинг на уровни серьезности
        severity_levels = [
            LogLevel.DEBUG.value,
            LogLevel.INFO.value,
            LogLevel.WARNING.value,
            LogLevel.ERROR.value,
            LogLevel.CRITICAL.value
        ]
        
        probs = probabilities.cpu().numpy()[0]
        result = {level: float(prob) for level, prob in zip(severity_levels, probs)}
        
        return result
    
    async def detect_anomalies(
        self,
        log_entries: List[LogEntry],
        embeddings: List[np.ndarray]
    ) -> List[Dict[str, Any]]:
        """
        Обнаружение аномалий в логах с использованием Isolation Forest
        """
        # Используем эмбеддинги как признаки
        features = np.array(embeddings)
        
        # Дополнительные признаки
        timestamps = np.array([e.timestamp.timestamp() for e in log_entries])
        timestamps_normalized = (timestamps - timestamps.min()) / (timestamps.max() - timestamps.min() + 1e-8)
        
        # Частота ошибок (скользящее окно)
        error_freq = self._calculate_error_frequency(log_entries)
        
        # Комбинируем признаки
        combined_features = np.column_stack([
            features,
            timestamps_normalized.reshape(-1, 1),
            error_freq.reshape(-1, 1)
        ])
        
        # Обучение Isolation Forest
        iso_forest = IsolationForest(
            contamination=settings.ANOMALY_CONTAMINATION,
            random_state=42,
            n_estimators=100
        )
        
        predictions = iso_forest.fit_predict(combined_features)
        anomaly_scores = -iso_forest.score_samples(combined_features)
        
        # Формируем результаты
        anomalies = []
        for i, (pred, score) in enumerate(zip(predictions, anomaly_scores)):
            if pred == -1:  # Аномалия
                anomalies.append({
                    'log_entry': log_entries[i],
                    'anomaly_score': float(score),
                    'reason': self._explain_anomaly(log_entries[i], score)
                })
        
        # Сортируем по степени аномальности
        anomalies.sort(key=lambda x: x['anomaly_score'], reverse=True)
        
        return anomalies
    
    def _calculate_error_frequency(self, log_entries: List[LogEntry]) -> np.ndarray:
        """Расчет частоты ошибок во времени"""
        freq = np.zeros(len(log_entries))
        window_size = 100
        
        for i in range(len(log_entries)):
            start = max(0, i - window_size)
            window = log_entries[start:i+1]
            error_count = sum(1 for e in window if e.level in 
                            [LogLevel.ERROR, LogLevel.CRITICAL, LogLevel.FATAL])
            freq[i] = error_count / (i - start + 1)
        
        return freq
    
    def _explain_anomaly(self, log_entry: LogEntry, score: float) -> str:
        """Генерация объяснения для аномалии"""
        explanations = []
        
        if log_entry.severity_score > 0.8:
            explanations.append("critical severity level")
        
        if "out of memory" in log_entry.raw_message.lower():
            explanations.append("memory exhaustion detected")
        
        if "timeout" in log_entry.raw_message.lower():
            explanations.append("operation timeout")
        
        if "connection refused" in log_entry.raw_message.lower():
            explanations.append("service connection failure")
        
        if "deadlock" in log_entry.raw_message.lower():
            explanations.append("database deadlock detected")
        
        if not explanations:
            explanations.append("unusual pattern deviation from normal behavior")
        
        return f"High anomaly score ({score:.3f}): {', '.join(explanations)}"
    
    async def analyze_root_cause(
        self,
        anomaly: Dict[str, Any],
        log_entries: List[LogEntry]
    ) -> str:
        """
        Анализ вероятной причины аномалии
        """
        log_entry = anomaly['log_entry']
        timestamp = log_entry.timestamp
        
        # Ищем связанные события до аномалии
        time_window = timedelta(minutes=5)
        previous_events = [
            e for e in log_entries 
            if timestamp - time_window <= e.timestamp < timestamp
            and e.level in [LogLevel.ERROR, LogLevel.CRITICAL, LogLevel.WARNING]
        ]
        
        # Анализируем цепочку событий
        chain_analysis = self._analyze_event_chain(previous_events, log_entry)
        
        # Формируем гипотезы
        hypotheses = self._generate_hypotheses(chain_analysis)
        
        # Возвращаем наиболее вероятную причину
        return hypotheses[0] if hypotheses else "Unable to determine root cause automatically"
    
    def _analyze_event_chain(
        self, 
        previous_events: List[LogEntry], 
        current_event: LogEntry
    ) -> List[Dict[str, Any]]:
        """Анализ цепочки событий перед аномалией"""
        chain = []
        
        # Ищем типичные паттерны
        patterns = {
            'connection_pool': ['connection pool exhausted', 'too many connections'],
            'memory_leak': ['memory usage high', 'heap size increasing'],
            'deadlock': ['deadlock detected', 'lock timeout'],
            'timeout_chain': ['slow query', 'response timeout', 'retry exhausted']
        }
        
        for pattern_name, keywords in patterns.items():
            pattern_matches = [
                e for e in previous_events 
                if any(keyword in e.raw_message.lower() for keyword in keywords)
            ]
            if pattern_matches:
                chain.append({
                    'pattern': pattern_name,
                    'events': pattern_matches,
                    'likelihood': len(pattern_matches) / len(previous_events) if previous_events else 0
                })
        
        return sorted(chain, key=lambda x: x['likelihood'], reverse=True)
    
    def _generate_hypotheses(self, chain_analysis: List[Dict[str, Any]]) -> List[str]:
        """Генерация гипотез о причинах сбоя"""
        hypotheses = []
        
        for analysis in chain_analysis:
            pattern = analysis['pattern']
            if pattern == 'connection_pool':
                hypotheses.append(
                    "Database connection pool exhausted due to unclosed connections "
                    "or connection leaks. Consider increasing pool size or adding "
                    "connection timeout."
                )
            elif pattern == 'memory_leak':
                hypotheses.append(
                    "Memory leak detected in application. Check for unused objects, "
                    "caches that don't expire, or unclosed resources."
                )
            elif pattern == 'deadlock':
                hypotheses.append(
                    "Database deadlock caused by concurrent transactions. Consider "
                    "implementing retry logic and optimizing transaction order."
                )
            elif pattern == 'timeout_chain':
                hypotheses.append(
                    "Cascading timeouts due to slow upstream service. Check database "
                    "query performance and external API response times."
                )
        
        if not hypotheses:
            hypotheses.append(
                "Unusual error pattern without clear precursor. Check system resources "
                "and recent deployments for potential causes."
            )
        
        return hypotheses