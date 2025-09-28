from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.security import HTTPBearer
from contextlib import asynccontextmanager
import structlog
import os
from app.core.config import settings
from app.database.database import engine, Base
from app.api.routes import models, training, detection, auth
from app.api.routes.admin import admin_router
from app.api.routes.setup import setup_router
from app.api.routes.learning import router as learning_router
from app.api.routes.speech import router as speech_router
from app.api.routes.statistics import router as statistics_router
from app.core.init_db import init_database

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("Starting Sign Recognition API...")
   
    os.makedirs(settings.MODEL_DIR, exist_ok=True)
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    os.makedirs(settings.DATASET_DIR, exist_ok=True)
   
    print("Creating database tables...")
    from app.models import user, model, dataset, system_config, prediction_history, training_session
    Base.metadata.create_all(bind=engine)
   
    print("Initializing database with default admin user...")
    init_database()
   
    print("API ready!")
    yield
    print("Shutting down...")

app = FastAPI(
    title="Sign Recognition API",
    description="API para el sistema de reconocimiento de señas personalizado",
    version="1.0.0",
    lifespan=lifespan
)

security = HTTPBearer()
logger = structlog.get_logger()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

app.include_router(setup_router, prefix="/api/admin/setup", tags=["setup"])
app.include_router(auth.router, prefix="/api/auth", tags=["authentication"])
app.include_router(models.router, prefix="/api/models", tags=["models"])
app.include_router(training.router, prefix="/api/training", tags=["training"])
app.include_router(detection.router, prefix="/api/detection", tags=["detection"])
app.include_router(admin_router, prefix="/api/admin", tags=["admin"])
app.include_router(learning_router, prefix="/api/learning", tags=["learning"])
app.include_router(speech_router, prefix="/api/speech", tags=["speech"])
app.include_router(statistics_router, prefix="/api/statistics", tags=["statistics"])

@app.get("/")
async def root():
    return {
        "message": "Sign Recognition API",
        "version": "1.0.0",
        "status": "running",
        "features": ["detection", "training", "learning", "speech", "statistics"]
    }

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "version": "1.0.0"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
        log_level="info"
    )