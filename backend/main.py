from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

app = FastAPI(title="Log Summarizer API")

# CORS middleware for frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "Log Summarizer API", "version": "1.0.0"}

@app.get("/health")
async def health():
    return {"status": "healthy"}

@app.post("/api/analyze")
async def analyze_logs(logs: dict):
    """Analyze logs and return summary"""
    return {
        "summary": "Log analysis summary",
        "total_logs": len(logs.get("logs", [])),
        "errors": 0,
        "warnings": 0
    }

@app.get("/api/dashboard")
async def get_dashboard():
    """Get dashboard statistics"""
    return {
        "total_logs": 1234,
        "errors": 47,
        "critical": 8,
        "health": 0,
        "system_status": "warning"
    }

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
