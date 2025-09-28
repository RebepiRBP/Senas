from fastapi import APIRouter, HTTPException, Depends, status
from sqlalchemy.orm import Session
from typing import List, Dict, Any
import uuid
import time
import json
from datetime import datetime
from app.database.database import get_db
from app.core.security import get_current_active_user
from app.models.user import User
from app.models.model import Model
from app.models.prediction_history import PredictionHistory
from app.schemas.detection import DetectionRequest, DetectionResponse, DetectionHistory
from app.services.ml_service import MLService

router = APIRouter()

@router.post("/{model_id}/predict", response_model=DetectionResponse)
async def predict_sign(
    model_id: str,
    detection_data: DetectionRequest,
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
            detail="Model is not ready for predictions"
        )

    ml_service = MLService()
    start_time = time.time()
    
    try:
        result = await ml_service.predict(model_id, detection_data.dict())
        processing_time = time.time() - start_time
        
        prediction_record = PredictionHistory(
            id=str(uuid.uuid4()),
            model_id=model_id,
            user_id=current_user.id,
            prediction=result["prediction"],
            confidence=result["confidence"],
            landmarks_data=json.dumps(detection_data.landmarks),
            created_at=datetime.utcnow(),
            processing_time=processing_time
        )
        
        db.add(prediction_record)
        db.commit()
        
        return DetectionResponse(
            id=prediction_record.id,
            model_id=model_id,
            prediction=result["prediction"],
            confidence=result["confidence"],
            probabilities=result.get("probabilities", {}),
            timestamp=datetime.utcnow().isoformat()
        )
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Prediction error: {str(e)}"
        )

@router.get("/{model_id}/history", response_model=List[DetectionHistory])
async def get_detection_history(
    model_id: str,
    limit: int = 50,
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

    history = db.query(PredictionHistory).filter(
        PredictionHistory.model_id == model_id,
        PredictionHistory.user_id == current_user.id
    ).order_by(PredictionHistory.created_at.desc()).limit(limit).all()

    return [
        DetectionHistory(
            id=record.id,
            model_id=record.model_id,
            prediction=record.prediction,
            confidence=record.confidence,
            timestamp=record.created_at.isoformat(),
            user_id=record.user_id
        )
        for record in history
    ]

@router.post("/{model_id}/batch-predict")
async def batch_predict(
    model_id: str,
    batch_data: List[DetectionRequest],
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

    ml_service = MLService()
    results = []
    
    try:
        for data in batch_data:
            start_time = time.time()
            result = await ml_service.predict(model_id, data.dict())
            processing_time = time.time() - start_time
            
            prediction_record = PredictionHistory(
                id=str(uuid.uuid4()),
                model_id=model_id,
                user_id=current_user.id,
                prediction=result["prediction"],
                confidence=result["confidence"],
                landmarks_data=json.dumps(data.landmarks),
                created_at=datetime.utcnow(),
                processing_time=processing_time
            )
            
            db.add(prediction_record)
            
            results.append({
                "id": prediction_record.id,
                "prediction": result["prediction"],
                "confidence": result["confidence"],
                "timestamp": datetime.utcnow().isoformat()
            })
        
        db.commit()
        return {"results": results}
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Batch prediction error: {str(e)}"
        )