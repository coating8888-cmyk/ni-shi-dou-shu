"""FastAPI main application for 倪師斗數 API."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.config import get_settings
from backend.api import chart, analysis, fengshui, divination, ai_reading

# Get settings
settings = get_settings()

# Create FastAPI app
app = FastAPI(
    title=settings.app_name,
    description="紫微斗數命盤分析 API，基於倪海廈老師的教學",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(chart.router)
app.include_router(analysis.router)
app.include_router(fengshui.router)
app.include_router(divination.router)
app.include_router(ai_reading.router)


@app.get("/")
async def root():
    """Root endpoint with welcome message."""
    return {
        "message": "歡迎使用倪師斗數 API",
        "description": "紫微斗數命盤分析系統，基於倪海廈老師的教學",
        "version": "1.0.0",
        "docs": "/docs",
        "endpoints": {
            "chart": {
                "stars": "/chart/stars - 取得星曜資料",
                "palaces": "/chart/palaces - 取得宮位資料",
                "patterns": "/chart/patterns - 取得格局資料",
                "analyze": "/chart/analyze-patterns - 分析命盤格局",
            },
            "analysis": {
                "full": "/analysis/full - 完整命盤分析",
                "rule_based": "/analysis/rule-based - 規則式分析",
            },
            "fengshui": {
                "analyze": "/fengshui/analyze - 風水分析",
                "rules": "/fengshui/rules - 風水規則",
                "positions": "/fengshui/positions - 方位與元素列表",
            },
            "divination": {
                "divine": "/divination/divine - 六壬速斷卜卦",
                "methods": "/divination/methods - 卜卦方法列表",
                "rules": "/divination/rules - 六壬速斷規則",
            },
        },
    }


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "app_name": settings.app_name,
        "debug": settings.debug,
        "openai_configured": bool(settings.openai_api_key),
        "anthropic_configured": bool(settings.anthropic_api_key),
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "backend.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.debug,
    )
