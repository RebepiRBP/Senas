from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from datetime import datetime

class TrainingDataCreate(BaseModel):
    model_id: str
    samples: List[Dict[str, Any]]
    
class TrainingResponse(BaseModel):
    success: bool
    processed_samples: int
    total_files: int
    message: Optional[str] = None
    samples: Optional[List[Dict[str, Any]]] = None

class TrainingProgress(BaseModel):
    job_id: str
    model_id: str
    status: str  # preparing, training, completed, error, cancelled
    progress: float
    current_epoch: int
    total_epochs: int
    started_at: datetime
    completed_at: Optional[datetime] = None
    message: str
    error: Optional[str] = None
    metrics: Optional[Dict[str, Any]] = None
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }

class ValidationResult(BaseModel):
    valid_samples: int
    invalid_samples: int
    errors: List[Dict[str, str]]
    label_distribution: Dict[str, int]