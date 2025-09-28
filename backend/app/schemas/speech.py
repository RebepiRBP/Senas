from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime

class SpeechConfig(BaseModel):
    enabled: bool = True
    rate: float = Field(default=1.0, ge=0.1, le=3.0)
    pitch: float = Field(default=1.0, ge=0.1, le=2.0)
    volume: float = Field(default=0.8, ge=0.0, le=1.0)
    language: str = Field(default="es-ES", pattern="^(es-ES|es-MX|es-AR|en-US|en-GB)$")

class ArithmeticSpeechConfig(SpeechConfig):
    announce_numbers: bool = True
    announce_operations: bool = True
    announce_results: bool = True
    result_delay: int = Field(default=1000, ge=0, le=5000)

class SpeechDetectionRequest(BaseModel):
    prediction: str = Field(..., min_length=1)
    confidence: float = Field(..., ge=0.0, le=1.0)
    config: Optional[SpeechConfig] = None

class SpeechArithmeticRequest(BaseModel):
    numbers: List[str] = Field(..., min_items=1)
    operators: List[str] = Field(default_factory=list)
    result: Optional[float] = None
    config: Optional[ArithmeticSpeechConfig] = None

class SpeechLearningRequest(BaseModel):
    is_correct: bool
    target_label: str = Field(..., min_length=1)
    detected_label: Optional[str] = None
    config: Optional[SpeechConfig] = None

class SpeechResponse(BaseModel):
    text: str
    should_speak: bool
    timestamp: str
    config_used: Optional[Dict[str, Any]] = None

class SpeechDetectionResponse(SpeechResponse):
    confidence: Optional[float] = None
    prediction: Optional[str] = None

class SpeechArithmeticResponse(SpeechResponse):
    operation: Optional[Dict[str, Any]] = None

class SpeechLearningResponse(SpeechResponse):
    is_correct: Optional[bool] = None
    target_label: Optional[str] = None
    detected_label: Optional[str] = None

class SpeechLanguage(BaseModel):
    code: str = Field(..., pattern="^[a-z]{2}-[A-Z]{2}$")
    name: str = Field(..., min_length=1)

class SpeechCapabilities(BaseModel):
    supported: bool
    languages: List[SpeechLanguage]
    features: Dict[str, bool] = Field(default_factory=lambda: {
        "detection": True,
        "arithmetic": True, 
        "learning": True,
        "custom_voice": False,
        "ssml": False
    })