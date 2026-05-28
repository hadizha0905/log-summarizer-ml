"""
Сервис для обработки и парсинга лог-файлов
Поддерживает различные форматы и потоковую обработку больших файлов
"""

import re
import json
import csv
from datetime import datetime
from typing import List, Dict, Any, AsyncGenerator, Optional
from pathlib import Path
import asyncio
from collections import defaultdict
import chardet  # Автоматическое определение кодировки

from app.core.config import settings
from app.models.log_entry import LogEntry, LogLevel, LogStatus
from app.utils.log_parser import LogParser

class LogProcessor:
    """Основной процессор логов с поддержкой потоковой обработки"""
    
    # Регулярные выражения для парсинга различных форматов
    PATTERNS = {
        # Стандартный формат syslog
        'syslog': re.compile(
            r'(?P<timestamp>\w+\s+\d+\s+\d+:\d+:\d+)\s+'
            r'(?P<hostname>\S+)\s+'
            r'(?P<service>\S+):\s+'
            r'(?P<message>.*)'
        ),
        # Apache/Nginx формат
        'web_log': re.compile(
            r'(?P<ip>\S+)\s+-\s+'
            r'(?P<user>\S+)\s+'
            r'\[(?P<timestamp>.*?)\]\s+'
            r'"(?P<method>\S+)\s+(?P<path>\S+)\s+(?P<protocol>\S+)"\s+'
            r'(?P<status>\d+)\s+'
            r'(?P<size>\d+)\s+'
            r'"(?P<referer>[^"]*)"\s+'
            r'"(?P<agent>[^"]*)"'
        ),
        # JSON формат
        'json': re.compile(r'^\{.*\}$'),
        # Python log формат
        'python': re.compile(
            r'(?P<timestamp>\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2},\d{3})\s+'
            r'(?P<level>\S+)\s+'
            r'(?P<module>\S+)\s+'
            r'(?P<message>.*)'
        )
    }
    
    # Ключевые слова для определения серьезности ошибок
    SEVERITY_KEYWORDS = {
        LogLevel.CRITICAL: [
            'fatal', 'critical', 'emergency', 'shutdown', 'out of memory',
            'segmentation fault', 'core dumped', 'system failure'
        ],
        LogLevel.ERROR: [
            'error', 'exception', 'failed', 'failure', 'timeout',
            'connection refused', 'access denied', 'invalid'
        ],
        LogLevel.WARNING: [
            'warning', 'warn', 'deprecated', 'slow query', 'retry',
            'fallback', 'rate limit'
        ]
    }
    
    def __init__(self):
        self.parser = LogParser()
        self.session_id = None
        
    async def process_file(
        self, 
        file_path: Path, 
        session_id: str,
        on_progress: Optional[callable] = None
    ) -> List[LogEntry]:
        """
        Асинхронная обработка файла с прогрессом
        Поддержка больших файлов через потоковое чтение
        """
        self.session_id = session_id
        log_entries = []
        
        # Определяем тип файла и кодировку
        file_type = file_path.suffix.lower()
        encoding = await self._detect_encoding(file_path)
        
        if file_type == '.json':
            log_entries = await self._process_json(file_path, encoding, on_progress)
        elif file_type == '.csv':
            log_entries = await self._process_csv(file_path, encoding, on_progress)
        else:
            log_entries = await self._process_text(file_path, encoding, on_progress)
        
        return log_entries
    
    async def _process_text(
        self, 
        file_path: Path, 
        encoding: str,
        on_progress: Optional[callable] = None
    ) -> List[LogEntry]:
        """Обработка текстовых лог-файлов"""
        entries = []
        line_number = 0
        
        # Сначала определяем формат логов по первым строкам
        format_type = await self._detect_format(file_path, encoding)
        
        async for line in self._read_file_async(file_path, encoding):
            line_number += 1
            
            if line_number % 1000 == 0 and on_progress:
                await on_progress(line_number)
            
            if not line.strip():
                continue
                
            # Парсим строку в зависимости от формата
            parsed = self._parse_line(line, format_type)
            
            if parsed:
                entry = self._create_log_entry(parsed, line_number, line)
                entries.append(entry)
        
        return entries
    
    async def _read_file_async(
        self, 
        file_path: Path, 
        encoding: str
    ) -> AsyncGenerator[str, None]:
        """Асинхронное чтение файла построчно"""
        loop = asyncio.get_event_loop()
        
        def read_lines():
            with open(file_path, 'r', encoding=encoding) as f:
                for line in f:
                    yield line
        
        for line in read_lines():
            yield line
            await asyncio.sleep(0)  # Позволяем другим задачам выполняться
    
    async def _detect_encoding(self, file_path: Path) -> str:
        """Автоматическое определение кодировки файла"""
        with open(file_path, 'rb') as f:
            raw_data = f.read(10000)  # Читаем первые 10KB для определения
            result = chardet.detect(raw_data)
            return result['encoding'] or 'utf-8'
    
    async def _detect_format(self, file_path: Path, encoding: str) -> str:
        """Определение формата логов по первым строкам"""
        with open(file_path, 'r', encoding=encoding) as f:
            sample = [f.readline() for _ in range(10)]
        
        for line in sample:
            for format_name, pattern in self.PATTERNS.items():
                if pattern.match(line):
                    return format_name
        
        return 'default'
    
    def _parse_line(self, line: str, format_type: str) -> Optional[Dict[str, Any]]:
        """Парсинг строки в зависимости от формата"""
        if format_type in self.PATTERNS:
            match = self.PATTERNS[format_type].match(line)
            if match:
                return match.groupdict()
        
        # Default parsing - ищем timestamp и уровень
        return self._default_parse(line)
    
    def _default_parse(self, line: str) -> Dict[str, Any]:
        """Default парсинг с поиском ключевой информации"""
        result = {'message': line, 'raw': line}
        
        # Ищем timestamp
        timestamp_match = re.search(r'\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}', line)
        if timestamp_match:
            result['timestamp'] = timestamp_match.group()
        
        # Ищем уровень лога
        for level, keywords in self.SEVERITY_KEYWORDS.items():
            for keyword in keywords:
                if keyword.lower() in line.lower():
                    result['level'] = level.value
                    break
        
        return result
    
    def _create_log_entry(
        self, 
        parsed: Dict[str, Any], 
        line_number: int, 
        raw_line: str
    ) -> LogEntry:
        """Создание объекта LogEntry из распарсенных данных"""
        
        # Обработка timestamp
        timestamp = parsed.get('timestamp')
        if isinstance(timestamp, str):
            try:
                timestamp = datetime.fromisoformat(timestamp)
            except:
                timestamp = datetime.now()
        elif not timestamp:
            timestamp = datetime.now()
        
        # Определение уровня логирования
        level = parsed.get('level')
        if level:
            try:
                level = LogLevel(level.lower())
            except:
                level = self._detect_level_from_message(raw_line)
        else:
            level = self._detect_level_from_message(raw_line)
        
        # Очистка сообщения
        message = parsed.get('message', raw_line)
        cleaned_message = self._clean_message(message)
        
        # Расчет severity score
        severity_score = self._calculate_severity(raw_line, level)
        
        return LogEntry(
            session_id=self.session_id,
            timestamp=timestamp,
            level=level,
            raw_message=raw_line,
            cleaned_message=cleaned_message,
            line_number=line_number,
            hostname=parsed.get('hostname'),
            service_name=parsed.get('service') or parsed.get('module'),
            severity_score=severity_score,
            has_error_keywords=severity_score > 0.5
        )
    
    def _detect_level_from_message(self, message: str) -> LogLevel:
        """Определение уровня логирования по содержимому"""
        message_lower = message.lower()
        
        for level, keywords in self.SEVERITY_KEYWORDS.items():
            for keyword in keywords:
                if keyword in message_lower:
                    return level
        
        return LogLevel.INFO
    
    def _calculate_severity(self, message: str, level: LogLevel) -> float:
        """Расчет числового значения серьезности ошибки"""
        base_score = {
            LogLevel.DEBUG: 0.0,
            LogLevel.INFO: 0.1,
            LogLevel.WARNING: 0.4,
            LogLevel.ERROR: 0.7,
            LogLevel.CRITICAL: 1.0,
            LogLevel.FATAL: 1.0
        }.get(level, 0.5)
        
        # Модифицируем на основе ключевых слов
        modifiers = {
            'out of memory': 0.3,
            'segmentation fault': 0.4,
            'database': 0.2,
            'connection': 0.15,
            'timeout': 0.2,
            'deadlock': 0.35
        }
        
        extra = 0
        message_lower = message.lower()
        for keyword, modifier in modifiers.items():
            if keyword in message_lower:
                extra += modifier
        
        return min(1.0, base_score + extra)
    
    def _clean_message(self, message: str) -> str:
        """Очистка и нормализация сообщения лога"""
        # Удаляем временные метки
        message = re.sub(r'\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}(?:,\d+)?', '[TIMESTAMP]', message)
        
        # Удаляем IP адреса
        message = re.sub(r'\b(?:\d{1,3}\.){3}\d{1,3}\b', '[IP]', message)
        
        # Удаляем email адреса
        message = re.sub(r'\S+@\S+', '[EMAIL]', message)
        
        # Удаляем hex значения
        message = re.sub(r'0x[0-9a-fA-F]+', '[HEX]', message)
        
        # Нормализация пробелов
        message = ' '.join(message.split())
        
        return message