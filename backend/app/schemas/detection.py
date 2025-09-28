from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from datetime import datetime

class DetectionRequest(BaseModel):
    imageData: str
    landmarks: List[Dict[str, float]]

class DetectionResponse(BaseModel):
    id: str
    model_id: str
    prediction: str
    confidence: float
    probabilities: Dict[str, float]
    timestamp: str

class DetectionHistory(BaseModel):
    id: str
    model_id: str
    prediction: str
    confidence: float
    timestamp: str
    user_id: str