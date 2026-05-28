"""
FastAPI приложение Log Summarizer ML
Главная точка входа для бэкенда
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime
import logging
import os
from dotenv import load_dotenv

# Загружаем переменные окружения
load_dotenv()

# Настройка логирования
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Создание FastAPI приложения
app = FastAPI(
    title="Log Summarizer ML API",
    description="Автоматическая суммаризация логов серверного оборудования для быстрого поиска причин системных сбоев",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json"
)

# CORS middleware для фронтенда
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:8080",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Импортируем маршруты
from app.routes import logs, dashboard

# Регистрируем маршруты
app.include_router(logs.router)
app.include_router(dashboard.router)

# Здоровый корневой маршрут
@app.get("/")
async def root():
    """Главный эндпоинт API"""
    return {
        "message": "Log Summarizer ML API",
        "version": "1.0.0",
        "status": "running",
        "timestamp": datetime.now().isoformat(),
        "docs": "/docs"
    }

@app.get("/health")
async def health_check():
    """Проверка здоровья приложения"""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "service": "Log Summarizer ML",
        "uptime": "running"
    }

@app.get("/api/info")
async def get_info():
    """Информация об API"""
    return {
        "name": "Log Summarizer ML",
        "version": "1.0.0",
        "description": "Автоматическая суммаризация логов серверного оборудования",
        "endpoints": {
            "logs": "/api/logs",
            "dashboard": "/api/dashboard",
            "stats": "/api/stats"
        }
    }

# Обработка ошибок
@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    """Глобальный обработчик исключений"""
    logger.error(f"Ошибка: {str(exc)}", exc_info=True)
    return {
        "error": "Internal server error",
        "detail": str(exc),
        "timestamp": datetime.now().isoformat()
    }

# Запуск приложения
if __name__ == "__main__":
    import uvicorn
    
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", 8000))
    debug = os.getenv("DEBUG", "False").lower() == "true"
    
    logger.info(f"🚀 Запуск Log Summarizer ML на {host}:{port}")
    logger.info(f"📚 Документация доступна на http://{host}:{port}/docs")
    
    uvicorn.run(
        "main:app",
        host=host,
        port=port,
        reload=debug,
        log_level="info"
    )
