"""Summary model"""
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel

class Summary(BaseModel):
    """Log analysis summary"""
    session_id: str
    total_logs: int
    error_count: int
    critical_count: int
    warning_count: int
    summary_text: str
    top_errors: List[str]
    anomalies: List[dict]
    health_status: float
    created_at: datetime = datetime.now()