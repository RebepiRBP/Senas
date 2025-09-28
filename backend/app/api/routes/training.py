from fastapi import APIRouter, Depends, UploadFile, File
from sqlalchemy.orm import Session
from typing import List
from app.database.database import get_db
from app.core.security import get_current_active_user
from app.models.user import User
from app.schemas.training import TrainingDataCreate, TrainingResponse
from app.services.training_service import TrainingService

router = APIRouter()

@router.post("/upload-samples", response_model=TrainingResponse)
async def upload_training_samples(
    model_id: str,
    files: List[UploadFile] = File(...),
    labels: List[str] = [],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    training_service = TrainingService()
    result = await training_service.process_uploaded_samples(
        model_id, files, labels, current_user.id
    )
    return result

@router.post("/validate-samples")
async def validate_training_samples(
    training_data: TrainingDataCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    training_service = TrainingService()
    validation_result = await training_service.validate_samples(training_data)
    return validation_result

@router.get("/progress/{model_id}")
async def get_training_progress(
    model_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    training_service = TrainingService()
    progress = await training_service.get_training_progress(model_id)
    return progress

@router.post("/cancel/{model_id}")
async def cancel_training(
    model_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    training_service = TrainingService()
    result = await training_service.cancel_training(model_id)
    return result