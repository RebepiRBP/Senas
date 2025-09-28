import asyncio
from typing import List, Dict, Any, Optional
import uuid
from datetime import datetime
import numpy as np
from fastapi import UploadFile
from app.services.ml_service import MLService
from app.services.hand_detection import HandDetectionService
from app.core.config import settings
from app.database.database import SessionLocal
from app.models.dataset import Dataset

class TrainingService:
    def __init__(self):
        self.ml_service = MLService()
        self.hand_detector = HandDetectionService()
        self.training_jobs = {}
    
    async def process_uploaded_samples(
        self, 
        model_id: str, 
        files: List[UploadFile], 
        labels: List[str],
        user_id: str
    ) -> Dict[str, Any]:
        try:
            processed_samples = []
            db = SessionLocal()
            for i, file in enumerate(files):
                if i >= len(labels):
                    break
                import base64
                content = await file.read()
                image_data = base64.b64encode(content).decode('utf-8')
                landmarks = self.hand_detector.detect_landmarks(f"data:image/jpeg;base64,{image_data}")
                if landmarks and len(landmarks) > 0:
                    sample_id = str(uuid.uuid4())
                    processed_samples.append({
                        "id": sample_id,
                        "label": labels[i],
                        "imageData": f"data:image/jpeg;base64,{image_data}",
                        "landmarks": landmarks[0],
                        "timestamp": datetime.utcnow().isoformat()
                    })
                    db_dataset = Dataset(
                        id=sample_id,
                        model_id=model_id,
                        label=labels[i],
                        image_data=f"data:image/jpeg;base64,{image_data}",
                        landmarks=landmarks[0],
                        created_at=datetime.utcnow()
                    )
                    db.add(db_dataset)
            db.commit()
            db.close()
            return {
                "success": True,
                "processed_samples": len(processed_samples),
                "total_files": len(files),
                "samples": processed_samples
            }
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }
    
    async def validate_samples(self, training_data: Dict[str, Any]) -> Dict[str, Any]:
        try:
            samples = training_data.get("samples", [])
            validation_results = {
                "valid_samples": 0,
                "invalid_samples": 0,
                "errors": [],
                "label_distribution": {}
            }
            for sample in samples:
                landmarks = sample.get("landmarks", [])
                if not landmarks:
                    validation_results["invalid_samples"] += 1
                    validation_results["errors"].append({
                        "sample_id": sample.get("id"),
                        "error": "No landmarks detected"
                    })
                    continue
                if not self.hand_detector.validate_landmarks(landmarks):
                    validation_results["invalid_samples"] += 1
                    validation_results["errors"].append({
                        "sample_id": sample.get("id"),
                        "error": "Invalid landmarks format"
                    })
                    continue
                validation_results["valid_samples"] += 1
                label = sample.get("label", "unknown")
                validation_results["label_distribution"][label] = \
                    validation_results["label_distribution"].get(label, 0) + 1
            for label, count in validation_results["label_distribution"].items():
                if count < settings.MIN_TRAINING_SAMPLES:
                    validation_results["errors"].append({
                        "label": label,
                        "error": f"Insufficient samples: {count} (minimum: {settings.MIN_TRAINING_SAMPLES})"
                    })
            return validation_results
        except Exception as e:
            return {
                "valid_samples": 0,
                "invalid_samples": 0,
                "errors": [{"error": str(e)}],
                "label_distribution": {}
            }
    
    async def start_training(self, model_id: str, training_data: List[Dict[str, Any]]) -> str:
        job_id = str(uuid.uuid4())
        self.training_jobs[job_id] = {
            "model_id": model_id,
            "status": "preparing",
            "progress": 0,
            "current_epoch": 0,
            "total_epochs": settings.DEFAULT_TRAINING_EPOCHS,
            "started_at": datetime.utcnow(),
            "message": "Preparing training data..."
        }
        asyncio.create_task(self._train_model_async(job_id, model_id, training_data))
        return job_id
    
    async def _train_model_async(self, job_id: str, model_id: str, training_data: List[Dict[str, Any]]):
        try:
            self.training_jobs[job_id]["status"] = "training"
            self.training_jobs[job_id]["message"] = "Training model..."
            metrics = await self.ml_service.train_model(model_id, training_data)
            self.training_jobs[job_id].update({
                "status": "completed",
                "progress": 100,
                "completed_at": datetime.utcnow(),
                "message": "Training completed successfully",
                "metrics": metrics
            })
        except Exception as e:
            self.training_jobs[job_id].update({
                "status": "error",
                "error": str(e),
                "completed_at": datetime.utcnow(),
                "message": f"Training failed: {str(e)}"
            })
    
    async def get_training_progress(self, model_id: str) -> Optional[Dict[str, Any]]:
        for job_id, job in self.training_jobs.items():
            if job["model_id"] == model_id:
                return {
                    "job_id": job_id,
                    **job
                }
        return None
    
    async def cancel_training(self, model_id: str) -> Dict[str, Any]:
        for job_id, job in self.training_jobs.items():
            if job["model_id"] == model_id and job["status"] in ["preparing", "training"]:
                self.training_jobs[job_id]["status"] = "cancelled"
                self.training_jobs[job_id]["message"] = "Training cancelled by user"
                return {"success": True, "message": "Training cancelled"}
        return {"success": False, "message": "No active training found for this model"}