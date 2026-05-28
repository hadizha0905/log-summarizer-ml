"""Dashboard routes"""
from fastapi import APIRouter
from datetime import datetime

router = APIRouter(prefix="/api", tags=["dashboard"])

@router.get("/dashboard")
async def get_dashboard():
    """Get dashboard statistics"""
    return {
        "total_logs": 1234,
        "errors": 47,
        "critical": 8,
        "health": 92,
        "system_status": "operational",
        "timestamp": datetime.now().isoformat()
    }

@router.get("/stats")
async def get_stats():
    """Get detailed statistics"""
    return {
        "logs_processed": 1234,
        "errors_found": 47,
        "critical_issues": 8,
        "warnings": 156,
        "health_score": 92.5,
        "uptime_percentage": 99.8,
        "avg_response_time_ms": 145
    }