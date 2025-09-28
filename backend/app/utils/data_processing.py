import numpy as np
import cv2
import base64
from PIL import Image
from io import BytesIO
from typing import List, Dict, Any, Tuple, Optional
import json
import os
from pathlib import Path

class DataProcessor:
    
    @staticmethod
    def decode_base64_image(image_data: str) -> np.ndarray:
        try:
            if ',' in image_data:
                image_data = image_data.split(',')[1]
            
            image_bytes = base64.b64decode(image_data)
            image = Image.open(BytesIO(image_bytes))
            
            return np.array(image.convert('RGB'))
            
        except Exception as e:
            raise ValueError(f"Error decoding image: {str(e)}")
    
    @staticmethod
    def encode_image_to_base64(image_array: np.ndarray, format: str = 'JPEG') -> str:
        try:
            pil_image = Image.fromarray(image_array.astype('uint8'))
            buffered = BytesIO()
            pil_image.save(buffered, format=format)
            
            img_str = base64.b64encode(buffered.getvalue()).decode()
            return f"data:image/{format.lower()};base64,{img_str}"
            
        except Exception as e:
            raise ValueError(f"Error encoding image: {str(e)}")
    
    @staticmethod
    def resize_image(image: np.ndarray, size: Tuple[int, int]) -> np.ndarray:
        return cv2.resize(image, size, interpolation=cv2.INTER_AREA)
    
    @staticmethod
    def normalize_landmarks(landmarks: List[Dict[str, float]]) -> List[Dict[str, float]]:
        if len(landmarks) != 21:
            raise ValueError("Expected 21 landmarks")
        
        wrist = landmarks[0]
        normalized = []
        
        for landmark in landmarks:
            normalized.append({
                'x': landmark['x'] - wrist['x'],
                'y': landmark['y'] - wrist['y'],
                'z': landmark['z'] - wrist['z']
            })
        
        return normalized
    
    @staticmethod
    def augment_landmarks(landmarks: List[Dict[str, float]], 
                         rotation_range: float = 0.1, 
                         translation_range: float = 0.05) -> List[Dict[str, float]]:
        augmented = []
        
        angle = np.random.uniform(-rotation_range, rotation_range)
        translation_x = np.random.uniform(-translation_range, translation_range)
        translation_y = np.random.uniform(-translation_range, translation_range)
        
        cos_angle = np.cos(angle)
        sin_angle = np.sin(angle)
        
        for landmark in landmarks:
            x, y = landmark['x'], landmark['y']
            
            # Apply rotation
            rotated_x = x * cos_angle - y * sin_angle
            rotated_y = x * sin_angle + y * cos_angle
            
            # Apply translation
            final_x = rotated_x + translation_x
            final_y = rotated_y + translation_y
            
            augmented.append({
                'x': final_x,
                'y': final_y,
                'z': landmark['z']
            })
        
        return augmented
    
    @staticmethod
    def validate_image_format(image_data: str) -> bool:
        try:
            DataProcessor.decode_base64_image(image_data)
            return True
        except:
            return False
    
    @staticmethod
    def calculate_hand_bbox(landmarks: List[Dict[str, float]]) -> Dict[str, float]:
        if not landmarks:
            return {'x': 0, 'y': 0, 'width': 0, 'height': 0}
        
        x_coords = [lm['x'] for lm in landmarks]
        y_coords = [lm['y'] for lm in landmarks]
        
        min_x, max_x = min(x_coords), max(x_coords)
        min_y, max_y = min(y_coords), max(y_coords)
        
        return {
            'x': min_x,
            'y': min_y,
            'width': max_x - min_x,
            'height': max_y - min_y
        }
    
    @staticmethod
    def filter_outlier_landmarks(landmarks_list: List[List[Dict[str, float]]], 
                                threshold: float = 2.0) -> List[List[Dict[str, float]]]:
        if len(landmarks_list) < 3:
            return landmarks_list
        
        # Calculate mean positions for each landmark
        mean_landmarks = []
        for i in range(21):
            x_values = [lm_list[i]['x'] for lm_list in landmarks_list]
            y_values = [lm_list[i]['y'] for lm_list in landmarks_list]
            z_values = [lm_list[i]['z'] for lm_list in landmarks_list]
            
            mean_landmarks.append({
                'x': np.mean(x_values),
                'y': np.mean(y_values),
                'z': np.mean(z_values)
            })
        
        # Calculate standard deviations
        std_landmarks = []
        for i in range(21):
            x_values = [lm_list[i]['x'] for lm_list in landmarks_list]
            y_values = [lm_list[i]['y'] for lm_list in landmarks_list]
            z_values = [lm_list[i]['z'] for lm_list in landmarks_list]
            
            std_landmarks.append({
                'x': np.std(x_values),
                'y': np.std(y_values),
                'z': np.std(z_values)
            })
        
        # Filter outliers
        filtered = []
        for landmarks in landmarks_list:
            is_outlier = False
            
            for i in range(21):
                for coord in ['x', 'y', 'z']:
                    if abs(landmarks[i][coord] - mean_landmarks[i][coord]) > threshold * std_landmarks[i][coord]:
                        is_outlier = True
                        break
                if is_outlier:
                    break
            
            if not is_outlier:
                filtered.append(landmarks)
        
        return filtered if filtered else landmarks_list
    
    @staticmethod
    def save_training_data(data: List[Dict[str, Any]], filepath: str) -> bool:
        try:
            Path(filepath).parent.mkdir(parents=True, exist_ok=True)
            with open(filepath, 'w') as f:
                json.dump(data, f, indent=2)
            return True
        except Exception as e:
            print(f"Error saving training data: {str(e)}")
            return False
    
    @staticmethod
    def load_training_data(filepath: str) -> Optional[List[Dict[str, Any]]]:
        try:
            with open(filepath, 'r') as f:
                return json.load(f)
        except Exception as e:
            print(f"Error loading training data: {str(e)}")
            return None