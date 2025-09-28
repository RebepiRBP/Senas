from fastapi import APIRouter, HTTPException, Depends, status
from sqlalchemy.orm import Session
from typing import List, Dict, Any
from app.database.database import get_db
from app.core.security import get_current_active_user
from app.models.user import User
from app.models.model import Model
from app.schemas.learning import (
    LearningCompareRequest,
    LearningCompareResponse,
    LearningReferenceResponse,
    LearningSessionStats,
    LearningProgressUpdate
)
from app.services.learning_service import LearningService

router = APIRouter()

@router.get("/{model_id}/references", response_model=List[LearningReferenceResponse])
async def get_learning_references(
    model_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    model = db.query(Model).filter(
        Model.id == model_id,
        Model.user_id == current_user.id
    ).first()
    
    if not model:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Model not found"
        )
    
    learning_service = LearningService()
    references = await learning_service.get_reference_images(model_id)
    
    if not references:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No reference images found for this model"
        )
    
    return references

@router.post("/{model_id}/compare", response_model=LearningCompareResponse)
async def compare_practice(
    model_id: str,
    compare_request: LearningCompareRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    model = db.query(Model).filter(
        Model.id == model_id,
        Model.user_id == current_user.id
    ).first()
    
    if not model:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Model not found"
        )
    
    if model.status != "ready":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Model is not ready for learning comparisons"
        )
    
    if not compare_request.landmarks or len(compare_request.landmarks) != 21:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid landmarks data: expected 21 landmarks"
        )
    
    if not compare_request.targetLabel or not compare_request.targetLabel.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Target label is required"
        )
    
    if compare_request.targetLabel not in (model.labels or []):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Target label not found in model labels"
        )
    
    try:
        learning_service = LearningService()
        result = await learning_service.compare_with_target(
            model_id,
            compare_request.landmarks,
            compare_request.targetLabel
        )
        return result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error during comparison: {str(e)}"
        )

@router.get("/{model_id}/stats", response_model=LearningSessionStats)
async def get_learning_stats(
    model_id: str,
    session_id: str = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    model = db.query(Model).filter(
        Model.id == model_id,
        Model.user_id == current_user.id
    ).first()
    
    if not model:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Model not found"
        )
    
    learning_service = LearningService()
    stats = await learning_service.get_session_stats(model_id, session_id)
    return stats

@router.post("/{model_id}/progress")
async def update_learning_progress(
    model_id: str,
    progress_update: LearningProgressUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    model = db.query(Model).filter(
        Model.id == model_id,
        Model.user_id == current_user.id
    ).first()
    
    if not model:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Model not found"
        )
    
    learning_service = LearningService()
    result = await learning_service.update_progress(
        model_id,
        current_user.id,
        progress_update
    )
    
    return {"success": True, "progress": result}

@router.get("/{model_id}/performance/{label}")
async def get_label_performance(
    model_id: str,
    label: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    model = db.query(Model).filter(
        Model.id == model_id,
        Model.user_id == current_user.id
    ).first()
    
    if not model:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Model not found"
        )
    
    if label not in (model.labels or []):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Label not found in model"
        )
    
    learning_service = LearningService()
    performance = await learning_service.get_label_performance(
        model_id,
        label,
        current_user.id
    )
    
    return performance

@router.delete("/{model_id}/reset")
async def reset_learning_progress(
    model_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    model = db.query(Model).filter(
        Model.id == model_id,
        Model.user_id == current_user.id
    ).first()
    
    if not model:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Model not found"
        )
    
    learning_service = LearningService()
    result = await learning_service.reset_user_progress(
        model_id,
        current_user.id
    )
    
    return {"success": True, "message": "Learning progress reset successfully"}