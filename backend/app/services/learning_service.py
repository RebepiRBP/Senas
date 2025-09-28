import random
import json
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from app.database.database import SessionLocal
from app.models.dataset import Dataset
from app.services.ml_service import MLService
from datetime import datetime
import numpy as np

class LearningService:
    def __init__(self):
        self.ml_service = MLService()
        self.comparison_cache = {}
        self.session_stats = {}
    
    async def get_reference_images(self, model_id: str) -> List[Dict[str, Any]]:
        db = SessionLocal()
        try:
            datasets = db.query(Dataset).filter(Dataset.model_id == model_id).all()
            references = {}
            
            for dataset in datasets:
                if dataset.label not in references:
                    references[dataset.label] = []
                references[dataset.label].append(dataset)
            
            result = []
            for label, samples in references.items():
                best_sample = self._select_best_reference_sample(samples)
                result.append({
                    "label": label,
                    "referenceImage": best_sample.image_data,
                    "totalSamples": len(samples),
                    "landmarks": best_sample.landmarks,
                    "created": best_sample.created_at.isoformat() if best_sample.created_at else None
                })
            
            return sorted(result, key=lambda x: x['label'])
        
        finally:
            db.close()
    
    async def compare_with_target(self, model_id: str, landmarks: List[Dict], target_label: str) -> Dict[str, Any]:
        try:
            prediction_result = await self.ml_service.predict(model_id, {"landmarks": landmarks})
            prediction = prediction_result["prediction"]
            confidence = prediction_result["confidence"]
            
            is_match = self._evaluate_match(prediction, target_label, confidence)
            feedback = self._generate_advanced_feedback(prediction, target_label, confidence, is_match)
            similarity_score = self._calculate_similarity_score(landmarks, target_label, model_id)
            
            comparison_result = {
                "prediction": prediction,
                "confidence": confidence,
                "isMatch": is_match,
                "feedback": feedback,
                "similarity": similarity_score,
                "timestamp": datetime.utcnow().isoformat(),
                "detectionQuality": self._assess_detection_quality(landmarks, confidence)
            }
            
            self._update_session_cache(model_id, target_label, comparison_result)
            
            return comparison_result
            
        except Exception as e:
            return {
                "prediction": "Error",
                "confidence": 0.0,
                "isMatch": False,
                "feedback": f"Error en la comparación: {str(e)}",
                "similarity": 0.0,
                "timestamp": datetime.utcnow().isoformat(),
                "detectionQuality": "error"
            }
    
    async def get_session_stats(self, model_id: str, session_id: str = None) -> Dict[str, Any]:
        cache_key = f"{model_id}_{session_id}" if session_id else model_id
        
        if cache_key not in self.session_stats:
            return {
                "totalAttempts": 0,
                "correctAttempts": 0,
                "averageConfidence": 0.0,
                "averageSimilarity": 0.0,
                "successRate": 0.0,
                "currentStreak": 0,
                "bestStreak": 0,
                "timeSpent": 0,
                "lastActivity": None
            }
        
        stats = self.session_stats[cache_key]
        success_rate = (stats["correctAttempts"] / max(stats["totalAttempts"], 1)) * 100
        
        return {
            "totalAttempts": stats["totalAttempts"],
            "correctAttempts": stats["correctAttempts"],
            "averageConfidence": stats["totalConfidence"] / max(stats["totalAttempts"], 1),
            "averageSimilarity": stats["totalSimilarity"] / max(stats["totalAttempts"], 1),
            "successRate": success_rate,
            "currentStreak": stats["currentStreak"],
            "bestStreak": stats["bestStreak"],
            "timeSpent": stats["timeSpent"],
            "lastActivity": stats["lastActivity"]
        }
    
    async def update_progress(self, model_id: str, user_id: str, progress_data: Dict) -> Dict[str, Any]:
        session_key = f"{model_id}_{user_id}"
        
        if session_key not in self.session_stats:
            self.session_stats[session_key] = {
                "totalAttempts": 0,
                "correctAttempts": 0,
                "totalConfidence": 0.0,
                "totalSimilarity": 0.0,
                "currentStreak": 0,
                "bestStreak": 0,
                "timeSpent": 0,
                "lastActivity": datetime.utcnow().isoformat(),
                "labelProgress": {}
            }
        
        stats = self.session_stats[session_key]
        
        if progress_data.get("isCorrect"):
            stats["correctAttempts"] += 1
            stats["currentStreak"] += 1
            stats["bestStreak"] = max(stats["bestStreak"], stats["currentStreak"])
        else:
            stats["currentStreak"] = 0
        
        stats["totalAttempts"] += 1
        stats["totalConfidence"] += progress_data.get("confidence", 0.0)
        stats["totalSimilarity"] += progress_data.get("similarity", 0.0)
        stats["timeSpent"] += progress_data.get("sessionTime", 0)
        stats["lastActivity"] = datetime.utcnow().isoformat()
        
        target_label = progress_data.get("targetLabel")
        if target_label:
            if target_label not in stats["labelProgress"]:
                stats["labelProgress"][target_label] = {
                    "attempts": 0,
                    "successes": 0,
                    "averageConfidence": 0.0
                }
            
            label_stats = stats["labelProgress"][target_label]
            label_stats["attempts"] += 1
            if progress_data.get("isCorrect"):
                label_stats["successes"] += 1
            label_stats["averageConfidence"] = (
                (label_stats["averageConfidence"] * (label_stats["attempts"] - 1) + 
                 progress_data.get("confidence", 0.0)) / label_stats["attempts"]
            )
        
        return await self.get_session_stats(model_id, user_id)
    
    async def get_label_performance(self, model_id: str, label: str, user_id: str) -> Dict[str, Any]:
        session_key = f"{model_id}_{user_id}"
        
        if session_key not in self.session_stats or label not in self.session_stats[session_key]["labelProgress"]:
            return {
                "label": label,
                "attempts": 0,
                "successes": 0,
                "successRate": 0.0,
                "averageConfidence": 0.0,
                "difficulty": "unknown",
                "recommendations": []
            }
        
        label_stats = self.session_stats[session_key]["labelProgress"][label]
        success_rate = (label_stats["successes"] / max(label_stats["attempts"], 1)) * 100
        difficulty = self._assess_difficulty(success_rate, label_stats["averageConfidence"])
        recommendations = self._generate_recommendations(success_rate, label_stats["averageConfidence"], label)
        
        return {
            "label": label,
            "attempts": label_stats["attempts"],
            "successes": label_stats["successes"],
            "successRate": success_rate,
            "averageConfidence": label_stats["averageConfidence"],
            "difficulty": difficulty,
            "recommendations": recommendations
        }
    
    async def reset_user_progress(self, model_id: str, user_id: str) -> bool:
        session_key = f"{model_id}_{user_id}"
        
        if session_key in self.session_stats:
            del self.session_stats[session_key]
        
        if session_key in self.comparison_cache:
            del self.comparison_cache[session_key]
        
        return True
    
    def _select_best_reference_sample(self, samples: List) -> Any:
        if len(samples) == 1:
            return samples[0]
        
        scored_samples = []
        for sample in samples:
            score = self._calculate_reference_quality_score(sample)
            scored_samples.append((sample, score))
        
        scored_samples.sort(key=lambda x: x[1], reverse=True)
        return scored_samples[0][0]
    
    def _calculate_reference_quality_score(self, sample: Any) -> float:
        score = 0.0
        
        if hasattr(sample, 'landmarks') and sample.landmarks:
            try:
                landmarks = sample.landmarks if isinstance(sample.landmarks, list) else json.loads(sample.landmarks)
                if len(landmarks) == 21:
                    score += 50
                    
                    wrist = landmarks[0]
                    fingertips = [landmarks[i] for i in [4, 8, 12, 16, 20]]
                    
                    for tip in fingertips:
                        distance = ((tip['x'] - wrist['x'])**2 + (tip['y'] - wrist['y'])**2)**0.5
                        if 0.1 < distance < 0.4:
                            score += 10
                
            except:
                score -= 20
        
        if hasattr(sample, 'created_at') and sample.created_at:
            score += 5
        
        return score
    
    def _evaluate_match(self, prediction: str, target_label: str, confidence: float) -> bool:
        if prediction != target_label:
            return False
        
        confidence_threshold = 0.75
        return confidence >= confidence_threshold
    
    def _generate_advanced_feedback(self, prediction: str, target: str, confidence: float, is_match: bool) -> str:
        if is_match:
            if confidence >= 0.95:
                return "¡Perfecto! Seña ejecutada a la perfección"
            elif confidence >= 0.85:
                return "¡Excelente! Muy buena ejecución de la seña"
            elif confidence >= 0.75:
                return "¡Muy bien! Seña correcta, sigue practicando"
            else:
                return "¡Correcto! Puedes mejorar la precisión"
        else:
            if confidence < 0.3:
                return "Seña no detectada claramente. Verifica que tu mano esté bien visible"
            elif prediction in ["No se detecta seña clara", "Mano no detectada correctamente"]:
                return "Asegúrate de mantener la mano estable dentro del marco de la cámara"
            elif prediction == "Gesto no válido":
                return "Intenta hacer un gesto más claro y definido"
            else:
                return f"Detecté '{prediction}'. Intenta realizar la seña '{target}' más claramente"
    
    def _calculate_similarity_score(self, user_landmarks: List[Dict], target_label: str, model_id: str) -> float:
        try:
            db = SessionLocal()
            reference_samples = db.query(Dataset).filter(
                Dataset.model_id == model_id,
                Dataset.label == target_label
            ).limit(5).all()
            
            if not reference_samples:
                return 0.0
            
            max_similarity = 0.0
            
            for sample in reference_samples:
                try:
                    ref_landmarks = sample.landmarks if isinstance(sample.landmarks, list) else json.loads(sample.landmarks)
                    similarity = self._compute_landmark_similarity(user_landmarks, ref_landmarks)
                    max_similarity = max(max_similarity, similarity)
                except:
                    continue
            
            return max_similarity
            
        except:
            return 0.0
        finally:
            if 'db' in locals():
                db.close()
    
    def _compute_landmark_similarity(self, landmarks1: List[Dict], landmarks2: List[Dict]) -> float:
        if len(landmarks1) != 21 or len(landmarks2) != 21:
            return 0.0
        
        try:
            distances = []
            for i in range(21):
                lm1, lm2 = landmarks1[i], landmarks2[i]
                dist = ((lm1['x'] - lm2['x'])**2 + 
                       (lm1['y'] - lm2['y'])**2 + 
                       (lm1['z'] - lm2['z'])**2)**0.5
                distances.append(dist)
            
            avg_distance = sum(distances) / len(distances)
            similarity = max(0.0, 1.0 - avg_distance * 10)
            
            return min(1.0, similarity)
            
        except:
            return 0.0
    
    def _assess_detection_quality(self, landmarks: List[Dict], confidence: float) -> str:
        try:
            if len(landmarks) != 21:
                return "poor"
            
            wrist = landmarks[0]
            fingertips = [landmarks[i] for i in [4, 8, 12, 16, 20]]
            
            hand_span = 0
            for tip in fingertips:
                distance = ((tip['x'] - wrist['x'])**2 + (tip['y'] - wrist['y'])**2)**0.5
                hand_span = max(hand_span, distance)
            
            if hand_span < 0.05:
                return "poor"
            elif hand_span > 0.4:
                return "poor"
            elif confidence >= 0.8:
                return "excellent"
            elif confidence >= 0.6:
                return "good"
            else:
                return "fair"
                
        except:
            return "poor"
    
    def _update_session_cache(self, model_id: str, target_label: str, result: Dict):
        cache_key = f"{model_id}_{target_label}"
        
        if cache_key not in self.comparison_cache:
            self.comparison_cache[cache_key] = []
        
        self.comparison_cache[cache_key].append(result)
        
        if len(self.comparison_cache[cache_key]) > 50:
            self.comparison_cache[cache_key] = self.comparison_cache[cache_key][-50:]
    
    def _assess_difficulty(self, success_rate: float, avg_confidence: float) -> str:
        if success_rate >= 80 and avg_confidence >= 0.8:
            return "easy"
        elif success_rate >= 60 and avg_confidence >= 0.6:
            return "medium"
        elif success_rate >= 40:
            return "hard"
        else:
            return "very_hard"
    
    def _generate_recommendations(self, success_rate: float, avg_confidence: float, label: str) -> List[str]:
        recommendations = []
        
        if success_rate < 50:
            recommendations.append(f"Practica más la seña '{label}' observando cuidadosamente la imagen de referencia")
            recommendations.append("Intenta realizar movimientos más lentos y deliberados")
        
        if avg_confidence < 0.6:
            recommendations.append("Mejora la iluminación y asegúrate de que tu mano esté completamente visible")
            recommendations.append("Mantén la mano estable por unos segundos al realizar la seña")
        
        if success_rate < 70 and avg_confidence >= 0.7:
            recommendations.append("Tu detección es buena, pero necesitas ser más preciso con la forma de la seña")
        
        if not recommendations:
            recommendations.append("¡Excelente progreso! Continúa practicando para mantener tu nivel")
        
        return recommendations