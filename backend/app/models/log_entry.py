"""Log entry model"""
from enum import Enum
from datetime import datetime
from typing import Optional
from pydantic import BaseModel

class LogLevel(str, Enum):
    """Log level enumeration"""
    DEBUG = "debug"
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"
    FATAL = "fatal"

class LogStatus(str, Enum):
    """Log processing status"""
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"

class LogEntry(BaseModel):
    """Log entry model"""
    session_id: Optional[str] = None
    timestamp: datetime
    level: LogLevel
    raw_message: str
    cleaned_message: Optional[str] = None
    line_number: int
    hostname: Optional[str] = None
    service_name: Optional[str] = None
    severity_score: float = 0.0
    has_error_keywords: bool = False
    
    class Config:
        use_enum_values = True