from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List

class Settings(BaseSettings):
    PROJECT_NAME: str = "Sign Recognition System"
    VERSION: str = "1.0.0"

    HOST: str = "0.0.0.0"
    PORT: int = 8000
    DEBUG: bool = True

    SECRET_KEY: str = "your-secret-key-change-in-production"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 8
    ALGORITHM: str = "HS256"

    DATABASE_URL: str = "sqlite:///./signrecognition.db"

    REDIS_URL: str = "redis://localhost:6379"

    ALLOWED_HOSTS: List[str] = ["*"]

    UPLOAD_DIR: str = "uploads"
    MODEL_DIR: str = "models"
    DATASET_DIR: str = "datasets"

    MAX_FILE_SIZE: int = 10 * 1024 * 1024
    ALLOWED_IMAGE_TYPES: List[str] = ["image/jpeg", "image/png", "image/webp"]

    MIN_TRAINING_SAMPLES: int = 10
    MAX_TRAINING_SAMPLES: int = 1000
    DEFAULT_TRAINING_EPOCHS: int = 50
    BATCH_SIZE: int = 32

    MINIO_ENDPOINT: str = "localhost:9000"
    MINIO_ACCESS_KEY: str = "minioadmin"
    MINIO_SECRET_KEY: str = "minioadmin"
    MINIO_BUCKET: str = "sign-recognition"
    MINIO_SECURE: bool = False

    USE_S3: bool = False
    AWS_ACCESS_KEY_ID: str = ""
    AWS_SECRET_ACCESS_KEY: str = ""
    AWS_REGION: str = "us-west-2"
    AWS_BUCKET: str = "sign-recognition"

    LOG_LEVEL: str = "INFO"

    MONITORING_ENABLED: bool = True
    METRICS_PORT: int = 8001

    model_config = SettingsConfigDict(env_file=".env", case_sensitive=True)

settings = Settings()