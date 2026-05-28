"""
Конфигурационный файл с переменными окружения
Используем Pydantic для type-safe конфигурации
"""

from typing import List, Optional
from pydantic_settings import BaseSettings
from pydantic import validator
import os

class Settings(BaseSettings):
    # App Settings
    APP_NAME: str = "Log Summarizer ML"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    ENVIRONMENT: str = "production"
    
    # Server Settings
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    WORKERS: int = 4
    
    # Database Settings
    DATABASE_URL: str = "postgresql+asyncpg://user:pass@localhost:5432/logsummarizer"
    DATABASE_POOL_SIZE: int = 20
    DATABASE_MAX_OVERFLOW: int = 10
    
    # Redis Settings
    REDIS_URL: str = "redis://localhost:6379/0"
    REDIS_CACHE_TTL: int = 3600  # 1 hour
    
    # Security
    SECRET_KEY: str = "your-super-secret-key-change-this"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    JWT_REFRESH_SECRET: str = "refresh-secret-key"
    
    # CORS Settings
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:8080"
    ]
    
    # ML Model Settings
    SUMMARIZATION_MODEL: str = "facebook/bart-large-cnn"
    CLASSIFICATION_MODEL: str = "microsoft/deberta-v3-base"
    EMBEDDING_MODEL: str = "sentence-transformers/all-MiniLM-L6-v2"
    DEVICE: str = "cuda"  # or "cpu"
    
    # Log Processing
    MAX_LOG_SIZE_MB: int = 100
    BATCH_SIZE: int = 1000
    SUPPORTED_FORMATS: List[str] = [".log", ".txt", ".csv", ".json"]
    
    # Anomaly Detection
    ANOMALY_CONTAMINATION: float = 0.1
    CLUSTERING_EPS: float = 0.5
    CLUSTERING_MIN_SAMPLES: int = 5
    
    # Rate Limiting
    RATE_LIMIT_REQUESTS: int = 100
    RATE_LIMIT_PERIOD: int = 60  # seconds
    
    @validator("BACKEND_CORS_ORIGINS", pre=True)
    def parse_cors_origins(cls, v):
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(",")]
        return v
    
    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()