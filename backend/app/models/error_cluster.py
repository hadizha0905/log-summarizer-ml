"""Error cluster model for grouped errors"""
from typing import List
from datetime import datetime
from pydantic import BaseModel

class ErrorCluster(BaseModel):
    """Clustered error patterns"""
    cluster_id: str
    error_messages: List[str]
    representative_message: str
    size: int
    severity_score: float
    first_occurrence: datetime
    last_occurrence: datetime
    
    class Config:
        use_enum_values = True