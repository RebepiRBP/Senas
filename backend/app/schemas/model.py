from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime

class TrainingDataItem(BaseModel):
    id: str
    label: str
    imageData: str
    landmarks: List[Dict[str, float]]
    timestamp: str

class ModelCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    categories: List[str] = Field(default_factory=list)
    labels: List[str] = Field(..., min_items=1)
    trainingData: List[TrainingDataItem]
    type: Optional[str] = Field(default="standard")
   
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }

class ModelUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    categories: Optional[List[str]] = None
    type: Optional[str] = None
   
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }

class ModelResponse(BaseModel):
    id: str
    name: str
    description: Optional[str]
    categories: List[str]
    labels: List[str]
    accuracy: float
    lastTrained: Optional[str]
    createdAt: str
    updatedAt: str
    status: str
    version: int
    type: Optional[str]
   
    class Config:
        from_attributes = True
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }

class ModelMetrics(BaseModel):
    accuracy: float
    totalSamples: int
    trainingTime: float
    trainingHistory: List[Dict[str, Any]]
    confusionMatrix: Dict[str, Dict[str, float]]
    classDistribution: Dict[str, int]

class PredictionRequest(BaseModel):
    imageData: str
    landmarks: List[Dict[str, float]]

class PredictionResponse(BaseModel):
    prediction: str
    confidence: float
    probabilities: Dict[str, float]
    timestamp: str

class ExportRequest(BaseModel):
    format: str = Field(..., pattern="^(tfjs|onnx)$")
   
class ModelListResponse(BaseModel):
    models: List[ModelResponse]
    total: int
    page: int
    size: int