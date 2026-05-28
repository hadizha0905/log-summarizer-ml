"""
Тестирование ML пайплайна обработки логов
Юнит-тесты и интеграционные тесты
"""

import pytest
import asyncio
from datetime import datetime, timedelta
from pathlib import Path
import numpy as np
from unittest.mock import Mock, patch

from app.services.ml_service import MLService
from app.services.log_processor import LogProcessor
from app.models.log_entry import LogEntry, LogLevel

class TestMLPipeline:
    """Тестирование ML пайплайна"""
    
    @pytest.fixture
    def ml_service(self):
        """Фикстура для ML сервиса"""
        return MLService()
    
    @pytest.fixture
    def sample_log_entries(self):
        """Фикстура с примером логов"""
        return [
            LogEntry(
                session_id="test_session",
                timestamp=datetime.now(),
                level=LogLevel.ERROR,
                raw_message="Database connection failed: timeout after 30s",
                cleaned_message="Database connection failed: timeout",
                severity_score=0.8
            ),
            LogEntry(
                session_id="test_session",
                timestamp=datetime.now(),
                level=LogLevel.CRITICAL,
                raw_message="OutOfMemoryError: Java heap space",
                cleaned_message="OutOfMemoryError",
                severity_score=1.0
            ),
            LogEntry(
                session_id="test_session",
                timestamp=datetime.now(),
                level=LogLevel.INFO,
                raw_message="Service started successfully",
                cleaned_message="Service started",
                severity_score=0.1
            ),
        ]
    
    @pytest.mark.asyncio
    async def test_embedding_generation(self, ml_service, sample_log_entries):
        """Тест генерации эмбеддингов"""
        embeddings = await ml_service.generate_embeddings(sample_log_entries)
        
        assert len(embeddings) == len(sample_log_entries)
        assert all(isinstance(emb, np.ndarray) for emb in embeddings)
        assert all(emb.shape[0] == 384 for emb in embeddings)  # Размерность miniLM
        
    @pytest.mark.asyncio
    async def test_error_clustering(self, ml_service, sample_log_entries):
        """Тест кластеризации ошибок"""
        embeddings = await ml_service.generate_embeddings(sample_log_entries)
        clusters = await ml_service.cluster_errors(sample_log_entries, embeddings)
        
        # Должны быть кластеры только для ошибок
        assert len(clusters) >= 1
        assert clusters[0].size >= 1
        assert "failed" in clusters[0].representative_message.lower() or \
               "memory" in clusters[0].representative_message.lower()
    
    @pytest.mark.asyncio
    async def test_summary_generation(self, ml_service, sample_log_entries):
        """Тест генерации суммаризации"""
        embeddings = await ml_service.generate_embeddings(sample_log_entries)
        clusters = await ml_service.cluster_errors(sample_log_entries, embeddings)
        
        summary = await ml_service.generate_summary(sample_log_entries, clusters)
        
        assert isinstance(summary, str)
        assert len(summary) > 20
        assert any(word in summary.lower() for word in ['error', 'failed', 'memory'])
    
    @pytest.mark.asyncio
    async def test_anomaly_detection(self, ml_service, sample_log_entries):
        """Тест обнаружения аномалий"""
        embeddings = await ml_service.generate_embeddings(sample_log_entries)
        anomalies = await ml_service.detect_anomalies(sample_log_entries, embeddings)
        
        # Критические ошибки должны быть аномалиями
        critical_anomalies = [a for a in anomalies 
                             if a['log_entry'].level == LogLevel.CRITICAL]
        assert len(critical_anomalies) >= 1
        
        for anomaly in anomalies:
            assert 'anomaly_score' in anomaly
            assert 'reason' in anomaly
            assert anomaly['anomaly_score'] >= 0
    
    @pytest.mark.asyncio
    async def test_root_cause_analysis(self, ml_service, sample_log_entries):
        """Тест анализа корневых причин"""
        embeddings = await ml_service.generate_embeddings(sample_log_entries)
        anomalies = await ml_service.detect_anomalies(sample_log_entries, embeddings)
        
        if anomalies:
            root_cause = await ml_service.analyze_root_cause(anomalies[0], sample_log_entries)
            assert isinstance(root_cause, str)
            assert len(root_cause) > 10
    
    def test_severity_calculation(self, ml_service):
        """Тест расчета серьезности"""
        log_processor = LogProcessor()
        
        critical_log = "CRITICAL: Database is down! Fatal error occurred"
        warning_log = "WARNING: Connection pool at 80% capacity"
        info_log = "INFO: User logged in successfully"
        
        critical_severity = log_processor._calculate_severity(
            critical_log, LogLevel.CRITICAL
        )
        warning_severity = log_processor._calculate_severity(
            warning_log, LogLevel.WARNING
        )
        info_severity = log_processor._calculate_severity(
            info_log, LogLevel.INFO
        )
        
        assert critical_severity > warning_severity > info_severity
        assert 0 <= critical_severity <= 1
        assert 0 <= warning_severity <= 1
        assert 0 <= info_severity <= 1

class TestLogProcessor:
    """Тестирование процессора логов"""
    
    @pytest.fixture
    def log_processor(self):
        return LogProcessor()
    
    @pytest.mark.asyncio
    async def test_parse_syslog_format(self, log_processor, tmp_path):
        """Тест парсинга syslog формата"""
        log_content = """Jan 15 10:30:45 webserver apache[1234]: [error] client denied by server configuration
Jan 15 10:30:46 database postgres[5678]: [ERROR] could not connect to database
"""
        log_file = tmp_path / "test.log"
        log_file.write_text(log_content)
        
        entries = await log_processor.process_file(log_file, "test_session")
        
        assert len(entries) == 2
        assert entries[0].hostname == "webserver"
        assert entries[0].service_name == "apache"
        assert entries[0].level == LogLevel.ERROR
        
        assert entries[1].hostname == "database"
        assert entries[1].service_name == "postgres"
        assert entries[1].level == LogLevel.ERROR
    
    @pytest.mark.asyncio
    async def test_parse_json_format(self, log_processor, tmp_path):
        """Тест парсинга JSON формата"""
        log_content = '''
{"timestamp": "2024-01-15T10:30:45Z", "level": "ERROR", "message": "Connection timeout", "service": "api"}
{"timestamp": "2024-01-15T10:30:46Z", "level": "INFO", "message": "Request completed", "service": "api"}
'''
        log_file = tmp_path / "test.json"
        log_file.write_text(log_content)
        
        entries = await log_processor.process_file(log_file, "test_session")
        
        assert len(entries) == 2
        assert entries[0].level == LogLevel.ERROR
        assert entries[0].service_name == "api"
        assert "timeout" in entries[0].raw_message.lower()
    
    def test_message_cleaning(self, log_processor):
        """Тест очистки сообщений"""
        dirty_message = "2024-01-15 10:30:45 ERROR Connection failed from 192.168.1.100"
        cleaned = log_processor._clean_message(dirty_message)
        
        assert "[TIMESTAMP]" in cleaned
        assert "[IP]" in cleaned
        assert "ERROR" in cleaned
        assert "Connection failed" in cleaned

class TestAPIEndpoints:
    """Тестирование API эндпоинтов"""
    
    @pytest.mark.asyncio
    async def test_upload_logs_endpoint(self, client, sample_log_file):
        """Тест загрузки логов"""
        with open(sample_log_file, 'rb') as f:
            response = await client.post(
                "/api/v1/logs/upload",
                files={"file": ("test.log", f, "text/plain")}
            )
        
        assert response.status_code == 200
        data = response.json()
        assert "session_id" in data
        assert "total_entries" in data
    
    @pytest.mark.asyncio
    async def test_get_analysis_endpoint(self, client, test_session_id):
        """Тест получения анализа"""
        response = await client.get(f"/api/v1/analysis/{test_session_id}")
        
        assert response.status_code == 200
        data = response.json()
        assert "summary" in data
        assert "clusters" in data
        assert "anomalies" in data
    
    @pytest.mark.asyncio
    async def test_dashboard_metrics_endpoint(self, client):
        """Тест получения метрик дашборда"""
        response = await client.get("/api/v1/dashboard/metrics?timeRange=24h")
        
        assert response.status_code == 200
        data = response.json()
        assert "totalLogs" in data
        assert "errorCount" in data
        assert "systemHealth" in data

# Запуск тестов с покрытием
if __name__ == "__main__":
    pytest.main([
        __file__,
        "-v",
        "--cov=app",
        "--cov-report=html",
        "--cov-report=term-missing"
    ])