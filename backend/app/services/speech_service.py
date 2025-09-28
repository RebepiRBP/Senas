from typing import Dict, Any, List, Optional
import asyncio
import logging
from datetime import datetime

class SpeechService:
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        self.default_config = {
            "enabled": True,
            "language": "es-ES",
            "rate": 1.0,
            "pitch": 1.0,
            "volume": 0.8
        }

    async def generate_detection_speech(self, prediction: str, confidence: float, config: Optional[Dict] = None) -> Dict[str, Any]:
        final_config = {**self.default_config, **(config or {})}
        
        if not final_config.get("enabled", True):
            return {"text": "", "should_speak": False}

        if not prediction or confidence < 0.5:
            return {"text": "", "should_speak": False}
        
        skip_phrases = [
            "Error", "no detecta", "no válido", "Sin seña detectada",
            "Mano no detectada correctamente", "Gesto no válido"
        ]
        
        if any(phrase in prediction for phrase in skip_phrases):
            return {"text": "", "should_speak": False}

        text = prediction
        if confidence < 0.7:
            text = f"{prediction}, con baja confianza"

        return {
            "text": text,
            "should_speak": True,
            "confidence": confidence,
            "timestamp": datetime.utcnow().isoformat()
        }

    async def generate_arithmetic_speech(self, operation: Dict[str, Any], config: Optional[Dict] = None) -> Dict[str, Any]:
        final_config = {**self.default_config, **(config or {})}
        
        if not final_config.get("enabled", True):
            return {"text": "", "should_speak": False}

        numbers = operation.get("numbers", [])
        operators = operation.get("operators", [])
        result = operation.get("result")

        if not numbers:
            return {"text": "", "should_speak": False}

        operator_map = {
            "+": "más",
            "-": "menos", 
            "x": "por",
            "*": "por",
            "/": "entre",
            "÷": "entre",
            "=": "igual a"
        }

        text_parts = []
        for i, number in enumerate(numbers):
            if i == 0:
                text_parts.append(number)
            else:
                operator = operators[i - 1] if i - 1 < len(operators) else ""
                operator_text = operator_map.get(operator, operator)
                text_parts.append(f"{operator_text} {number}")

        text = " ".join(text_parts)
        
        if result is not None:
            text += f" es igual a {result}"

        return {
            "text": text,
            "should_speak": True,
            "operation": operation,
            "timestamp": datetime.utcnow().isoformat()
        }

    async def generate_learning_feedback(self, is_correct: bool, target_label: str, detected_label: Optional[str] = None, config: Optional[Dict] = None) -> Dict[str, Any]:
        final_config = {**self.default_config, **(config or {})}
        
        if not final_config.get("enabled", True):
            return {"text": "", "should_speak": False}

        if is_correct:
            correct_phrases = [
                f"Correcto, {target_label}",
                f"Muy bien, {target_label}",
                f"Perfecto, {target_label}",
                f"Excelente, detectaste {target_label}"
            ]
            import random
            text = random.choice(correct_phrases)
        else:
            if detected_label:
                text = f"Incorrecto. Detecté {detected_label}, pero debería ser {target_label}"
            else:
                text = f"Intenta hacer la seña {target_label} de nuevo"

        return {
            "text": text,
            "should_speak": True,
            "is_correct": is_correct,
            "target_label": target_label,
            "detected_label": detected_label,
            "timestamp": datetime.utcnow().isoformat()
        }

    async def validate_speech_config(self, config: Dict[str, Any]) -> Dict[str, Any]:
        validated = {}
        
        validated["enabled"] = bool(config.get("enabled", True))
        
        rate = config.get("rate", 1.0)
        validated["rate"] = max(0.1, min(3.0, float(rate)))
        
        pitch = config.get("pitch", 1.0)
        validated["pitch"] = max(0.1, min(2.0, float(pitch)))
        
        volume = config.get("volume", 0.8)
        validated["volume"] = max(0.0, min(1.0, float(volume)))
        
        language = config.get("language", "es-ES")
        supported_languages = ["es-ES", "es-MX", "es-AR", "en-US", "en-GB"]
        validated["language"] = language if language in supported_languages else "es-ES"
        
        return validated

    async def get_supported_languages(self) -> List[Dict[str, str]]:
        return [
            {"code": "es-ES", "name": "Español (España)"},
            {"code": "es-MX", "name": "Español (México)"},
            {"code": "es-AR", "name": "Español (Argentina)"},
            {"code": "en-US", "name": "English (US)"},
            {"code": "en-GB", "name": "English (UK)"}
        ]