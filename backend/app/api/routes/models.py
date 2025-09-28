from fastapi import APIRouter, HTTPException, Depends, status, BackgroundTasks, UploadFile, File, Form
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List
import uuid
import time
import json
from datetime import datetime
import traceback
import os
import tempfile
import zipfile
import shutil
from app.database.database import get_db
from app.models.model import Model
from app.models.prediction_history import PredictionHistory
from app.schemas.model import ModelCreate, ModelResponse, ModelUpdate
from app.services.ml_service import MLService
from app.services.model_manager import ModelManager
from app.core.security import get_current_active_user
from app.models.user import User
from app.models.dataset import Dataset

router = APIRouter()
ml_service = MLService()

@router.get("/", response_model=List[ModelResponse])
async def get_user_models(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    models = db.query(Model).filter(Model.user_id == current_user.id).all()
    return [ModelResponse(
        id=model.id,
        name=model.name,
        description=model.description or "",
        categories=model.categories or [],
        labels=model.labels or [],
        accuracy=model.accuracy * 100 if model.accuracy <= 1 else model.accuracy,
        lastTrained=model.last_trained.isoformat() if model.last_trained else None,
        createdAt=model.created_at.isoformat(),
        updatedAt=model.updated_at.isoformat(),
        status=model.status,
        version=model.version,
        type=model.type or "standard"
    ) for model in models]

@router.get("/{model_id}", response_model=ModelResponse)
async def get_model(
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

    return ModelResponse(
        id=model.id,
        name=model.name,
        description=model.description or "",
        categories=model.categories or [],
        labels=model.labels or [],
        accuracy=model.accuracy * 100 if model.accuracy <= 1 else model.accuracy,
        lastTrained=model.last_trained.isoformat() if model.last_trained else None,
        createdAt=model.created_at.isoformat(),
        updatedAt=model.updated_at.isoformat(),
        status=model.status,
        version=model.version,
        type=model.type or "standard"
    )

@router.post("/create", response_model=dict)
async def create_model(
    model_data: ModelCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    try:
        model_id = str(uuid.uuid4())
        db_model = Model(
            id=model_id,
            name=model_data.name,
            description=model_data.description,
            categories=model_data.categories,
            labels=model_data.labels,
            status="training",
            user_id=current_user.id,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
            type=model_data.type or "standard"
        )

        db.add(db_model)
        for item in model_data.trainingData:
            db_dataset = Dataset(
                id=str(uuid.uuid4()),
                model_id=model_id,
                label=item.label,
                image_data=item.imageData,
                landmarks=item.landmarks,
                file_path=None,
                created_at=datetime.utcnow()
            )
            db.add(db_dataset)

        db.commit()
        db.refresh(db_model)

        background_tasks.add_task(
            train_model_background,
            model_id,
            current_user.id,
            [item.dict() for item in model_data.trainingData]
        )

        return {"success": True, "model_id": model_id, "message": "Model training started"}

    except Exception as e:
        print(f"Error creating model: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating model: {str(e)}"
        )

@router.post("/import")
async def import_model(
    file: UploadFile = File(...),
    model_name: str = Form(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    if not file.filename.endswith('.zip'):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only ZIP files are allowed"
        )

    if not model_name.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Model name is required"
        )

    if len(model_name.strip()) < 3:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Model name must be at least 3 characters long"
        )

    try:
        temp_dir = tempfile.mkdtemp()
        zip_path = os.path.join(temp_dir, file.filename)
       
        with open(zip_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)

        model_manager = ModelManager()
        result = await model_manager.import_model(zip_path, current_user.id, db, model_name.strip())
       
        shutil.rmtree(temp_dir)
       
        if result["success"]:
            return {"success": True, "message": result["message"], "model_id": result["model_id"]}
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=result["error"]
            )

    except Exception as e:
        if 'temp_dir' in locals():
            shutil.rmtree(temp_dir, ignore_errors=True)
       
        print(f"Import error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error importing model: {str(e)}"
        )

@router.post("/{model_id}/predict")
async def predict(
    model_id: str,
    prediction_data: dict,
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
            detail=f"Model is not ready for predictions. Current status: {model.status}"
        )

    if not prediction_data.get("landmarks"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No landmarks provided"
        )

    try:
        start_time = time.time()
        result = await ml_service.predict(model_id, prediction_data)
        processing_time = time.time() - start_time
        
        prediction_record = PredictionHistory(
            id=str(uuid.uuid4()),
            model_id=model_id,
            user_id=current_user.id,
            prediction=result["prediction"],
            confidence=result["confidence"],
            landmarks_data=json.dumps(prediction_data["landmarks"]),
            created_at=datetime.utcnow(),
            processing_time=processing_time
        )
        
        db.add(prediction_record)
        db.commit()
        
        return result
    except Exception as e:
        db.rollback()
        print(f"Prediction error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Prediction error: {str(e)}"
        )

@router.post("/{model_id}/export")
async def export_model(
    model_id: str,
    export_data: dict,
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
            detail="Model is not ready for export"
        )

    format_type = export_data.get("format", "tfjs")
   
    try:
        model_manager = ModelManager()
        zip_path = await model_manager.export_model(model_id, format_type)
       
        if not zip_path or not os.path.exists(zip_path):
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Export file not generated"
            )

        filename = f"{model.name}_{format_type}.zip"
       
        return FileResponse(
            path=zip_path,
            filename=filename,
            media_type="application/zip",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )

    except Exception as e:
        print(f"Export error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error exporting model: {str(e)}"
        )

@router.delete("/{model_id}")
async def delete_model(
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

    try:
        model_manager = ModelManager()
        await model_manager.delete_model_files(model_id)
        db.delete(model)
        db.commit()
        return {"message": "Model deleted successfully"}
    except Exception as e:
        print(f"Error deleting model: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error deleting model: {str(e)}"
        )

@router.get("/{model_id}/metrics")
async def get_model_metrics(
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

    model_manager = ModelManager()
    metrics = await model_manager.get_model_metrics(model_id)
    return metrics

async def train_model_background(model_id: str, user_id: str, training_data: list):
    from app.database.database import SessionLocal
    from app.models.training_session import TrainingSession
    
    local_db = SessionLocal()
    try:
        print(f"Background training started for model {model_id}")
        
        session_id = str(uuid.uuid4())
        training_session = TrainingSession(
            id=session_id,
            model_id=model_id,
            user_id=user_id,
            session_number=1,
            training_samples=len(training_data),
            created_at=datetime.utcnow(),
            status="training"
        )
        local_db.add(training_session)
        local_db.commit()
        
        start_time = time.time()
        metrics = await ml_service.train_model(model_id, training_data)
        training_time = time.time() - start_time
        
        model = local_db.query(Model).filter(Model.id == model_id).first()
        if model:
            model.status = "ready"
            model.last_trained = datetime.utcnow()
            if metrics and 'accuracy' in metrics:
                accuracy_value = metrics['accuracy']
                if accuracy_value > 1:
                    model.accuracy = accuracy_value / 100
                else:
                    model.accuracy = accuracy_value
            
            training_session.final_accuracy = model.accuracy
            training_session.training_time = training_time
            training_session.completed_at = datetime.utcnow()
            training_session.status = "completed"
            
            local_db.commit()

    except Exception as e:
        print(f"Training error for model {model_id}: {str(e)}")
        model = local_db.query(Model).filter(Model.id == model_id).first()
        if model:
            model.status = "error"
            
        training_session = local_db.query(TrainingSession).filter(TrainingSession.id == session_id).first()
        if training_session:
            training_session.status = "error"
            
        local_db.commit()
    finally:
        local_db.close()