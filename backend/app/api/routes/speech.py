from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from typing import Dict, Any
from app.database.database import get_db
from app.core.security import get_current_active_user
from app.models.user import User
from app.schemas.speech import (
    SpeechDetectionRequest,
    SpeechArithmeticRequest,
    SpeechLearningRequest,
    SpeechDetectionResponse,
    SpeechArithmeticResponse,
    SpeechLearningResponse,
    SpeechConfig,
    SpeechCapabilities
)
from app.services.speech_service import SpeechService

router = APIRouter()

@router.post("/detection", response_model=SpeechDetectionResponse)
async def generate_detection_speech(
    request: SpeechDetectionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    speech_service = SpeechService()
    result = await speech_service.generate_detection_speech(
        request.prediction,
        request.confidence,
        request.config.dict() if request.config else None
    )
    
    return SpeechDetectionResponse(
        text=result["text"],
        should_speak=result["should_speak"],
        timestamp=result["timestamp"],
        confidence=result.get("confidence"),
        prediction=request.prediction,
        config_used=result.get("config_used")
    )

@router.post("/arithmetic", response_model=SpeechArithmeticResponse)
async def generate_arithmetic_speech(
    request: SpeechArithmeticRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    speech_service = SpeechService()
    operation = {
        "numbers": request.numbers,
        "operators": request.operators,
        "result": request.result
    }
    
    result = await speech_service.generate_arithmetic_speech(
        operation,
        request.config.dict() if request.config else None
    )
    
    return SpeechArithmeticResponse(
        text=result["text"],
        should_speak=result["should_speak"],
        timestamp=result["timestamp"],
        operation=result.get("operation"),
        config_used=result.get("config_used")
    )

@router.post("/learning", response_model=SpeechLearningResponse)
async def generate_learning_speech(
    request: SpeechLearningRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    speech_service = SpeechService()
    result = await speech_service.generate_learning_feedback(
        request.is_correct,
        request.target_label,
        request.detected_label,
        request.config.dict() if request.config else None
    )
    
    return SpeechLearningResponse(
        text=result["text"],
        should_speak=result["should_speak"],
        timestamp=result["timestamp"],
        is_correct=result.get("is_correct"),
        target_label=result.get("target_label"),
        detected_label=result.get("detected_label"),
        config_used=result.get("config_used")
    )

@router.get("/capabilities", response_model=SpeechCapabilities)
async def get_speech_capabilities():
    speech_service = SpeechService()
    languages = await speech_service.get_supported_languages()
    
    return SpeechCapabilities(
        supported=True,
        languages=languages,
        features={
            "detection": True,
            "arithmetic": True,
            "learning": True,
            "custom_voice": False,
            "ssml": False
        }
    )

@router.post("/config/validate")
async def validate_speech_config(
    config: SpeechConfig,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    speech_service = SpeechService()
    validated_config = await speech_service.validate_speech_config(config.dict())
    return {"valid": True, "config": validated_config}

@router.get("/languages")
async def get_supported_languages():
    speech_service = SpeechService()
    return await speech_service.get_supported_languages()