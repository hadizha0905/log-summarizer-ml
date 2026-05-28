"""
Настройка базы данных с асинхронным подключением
Используем SQLAlchemy 2.0 с asyncpg для максимальной производительности
"""

from sqlalchemy.ext.asyncio import (
    AsyncSession, 
    create_async_engine, 
    async_sessionmaker,
    AsyncEngine
)
from sqlalchemy.orm import declarative_base, declared_attr
from sqlalchemy import Column, DateTime, func
from typing import AsyncGenerator
import asyncio
from contextlib import asynccontextmanager

from app.core.config import settings

class CustomBase:
    """Базовый класс для всех моделей с общими полями"""
    
    @declared_attr
    def __tablename__(cls):
        return cls.__name__.lower()
    
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime, onupdate=func.now())
    
Base = declarative_base(cls=CustomBase)

# Создаем асинхронный движок с пулом соединений
engine: AsyncEngine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.DEBUG,
    pool_size=settings.DATABASE_POOL_SIZE,
    max_overflow=settings.DATABASE_MAX_OVERFLOW,
    pool_pre_ping=True,  # Проверка соединений перед использованием
    pool_recycle=3600,   # Пересоздаем соединения каждый час
)

# Создаем фабрику сессий
AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)

async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Dependency для получения сессии базы данных"""
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()

@asynccontextmanager
async def get_db_context():
    """Контекстный менеджер для транзакций"""
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()

async def init_db():
    """Инициализация базы данных: создание таблиц и расширений"""
    # Включаем расширение pgvector для векторных операций
    async with engine.begin() as conn:
        await conn.execute("CREATE EXTENSION IF NOT EXISTS vector")
        await conn.run_sync(Base.metadata.create_all)

async def close_db():
    """Закрытие соединений с базой данных"""
    await engine.dispose()
    