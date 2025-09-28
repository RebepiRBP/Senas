import cv2
import numpy as np
from typing import List, Dict, Any, Optional
import base64
from PIL import Image
import io

class HandDetectionService:
    def __init__(self):
        pass

    def detect_landmarks(self, image_data: str) -> Optional[List[Dict[str, Any]]]:
        print("Warning: HandDetectionService.detect_landmarks called but not implemented for backend")
        return None

    def validate_landmarks(self, landmarks: List[Dict[str, float]]) -> bool:
        if len(landmarks) != 21:
            return False

        for landmark in landmarks:
            if not all(key in landmark for key in ['x', 'y', 'z']):
                return False
            if not isinstance(landmark['x'], (int, float)) or not isinstance(landmark['y'], (int, float)) or not isinstance(landmark['z'], (int, float)):
                return False

        return True

    def normalize_landmarks(self, landmarks: List[Dict[str, float]]) -> List[Dict[str, float]]:
        wrist_x = landmarks[0]['x']
        wrist_y = landmarks[0]['y']

        normalized = []
        for landmark in landmarks:
            normalized.append({
                'x': landmark['x'] - wrist_x,
                'y': landmark['y'] - wrist_y,
                'z': landmark['z']
            })

        return normalized

    def extract_features(self, landmarks: List[Dict[str, float]]) -> List[float]:
        if len(landmarks) != 21:
            raise ValueError("Expected 21 landmarks")

        features = []
        for landmark in landmarks:
            features.extend([landmark['x'], landmark['y'], landmark['z']])

        return features