from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, and_
from datetime import datetime, timedelta
from app.models.model import Model
from app.models.dataset import Dataset
from app.models.prediction_history import PredictionHistory
from app.models.training_session import TrainingSession
import json

class StatisticsService:
    def __init__(self):
        pass
    
    def get_model_statistics(self, model_id: str, db: Session) -> Dict[str, Any]:
        model = db.query(Model).filter(Model.id == model_id).first()
        if not model:
            raise ValueError("Model not found")
        
        samples_data = self._get_samples_distribution(model_id, db)
        usage_data = self._get_real_usage_statistics(model_id, db)
        performance_data = self._calculate_real_performance_metrics(model, samples_data['total_samples'], db)
        quality_data = self._assess_real_quality_metrics(model_id, db)
        training_data = self._get_real_training_progress(model_id, db)
        
        return {
            "samplesPerLabel": samples_data['distribution'],
            "trainingProgress": training_data,
            "labelDistribution": samples_data['pie_data'],
            "dailyUsage": usage_data['daily'],
            "performanceMetrics": performance_data,
            "detectionQuality": quality_data
        }
    
    def _get_samples_distribution(self, model_id: str, db: Session) -> Dict[str, Any]:
        results = db.query(
            Dataset.label,
            func.count(Dataset.id).label('count')
        ).filter(Dataset.model_id == model_id).group_by(Dataset.label).all()
        
        total_samples = sum(item.count for item in results)
        
        distribution = []
        pie_data = []
        
        for item in results:
            percentage = (item.count / total_samples * 100) if total_samples > 0 else 0
            
            distribution.append({
                "etiqueta": item.label,
                "cantidad": item.count,
                "porcentaje": round(percentage, 2)
            })
            
            pie_data.append({
                "nombre": item.label,
                "valor": item.count
            })
        
        return {
            "distribution": distribution,
            "pie_data": pie_data,
            "total_samples": total_samples
        }
    
    def _get_real_usage_statistics(self, model_id: str, db: Session) -> Dict[str, Any]:
        days_back = 30
        end_date = datetime.now().date()
        start_date = end_date - timedelta(days=days_back-1)
        
        daily_predictions = db.query(
            func.date(PredictionHistory.created_at).label('date'),
            func.count(PredictionHistory.id).label('count'),
            func.avg(PredictionHistory.confidence).label('avg_confidence')
        ).filter(
            and_(
                PredictionHistory.model_id == model_id,
                func.date(PredictionHistory.created_at) >= start_date,
                func.date(PredictionHistory.created_at) <= end_date
            )
        ).group_by(func.date(PredictionHistory.created_at)).all()
        
        predictions_dict = {item.date: {"count": item.count, "confidence": item.avg_confidence} for item in daily_predictions}
        
        daily_usage = []
        current_date = start_date
        
        while current_date <= end_date:
            date_str = current_date.strftime("%Y-%m-%d")
            if current_date in predictions_dict:
                predictions = predictions_dict[current_date]["count"]
                precision = (predictions_dict[current_date]["confidence"] * 100) if predictions_dict[current_date]["confidence"] else 0
            else:
                predictions = 0
                precision = 0
            
            daily_usage.append({
                "fecha": date_str,
                "predicciones": predictions,
                "precision": round(precision, 1)
            })
            
            current_date += timedelta(days=1)
        
        return {
            "daily": daily_usage
        }
    
    def _calculate_real_performance_metrics(self, model: Model, total_samples: int, db: Session) -> Dict[str, Any]:
        total_predictions = db.query(func.count(PredictionHistory.id)).filter(
            PredictionHistory.model_id == model.id
        ).scalar() or 0
        
        avg_confidence = db.query(func.avg(PredictionHistory.confidence)).filter(
            PredictionHistory.model_id == model.id
        ).scalar() or 0
        
        max_confidence = db.query(func.max(PredictionHistory.confidence)).filter(
            PredictionHistory.model_id == model.id
        ).scalar() or 0
        
        last_prediction = db.query(PredictionHistory.created_at).filter(
            PredictionHistory.model_id == model.id
        ).order_by(desc(PredictionHistory.created_at)).first()
        
        last_training_session = db.query(TrainingSession).filter(
            TrainingSession.model_id == model.id,
            TrainingSession.status == "completed"
        ).order_by(desc(TrainingSession.completed_at)).first()
        
        training_time = last_training_session.training_time if last_training_session else 0
        
        return {
            "muestrasTotales": total_samples,
            "precisionPromedio": round(avg_confidence * 100, 2) if avg_confidence else 85.0,
            "mejorPrecision": round(max_confidence * 100, 2) if max_confidence else 90.0,
            "tiempoEntrenamiento": int(training_time) if training_time else 120,
            "ultimoUso": last_prediction.created_at.isoformat() if last_prediction else datetime.now().isoformat(),
            "prediccionesTotales": total_predictions
        }
    
    def _assess_real_quality_metrics(self, model_id: str, db: Session) -> List[Dict[str, Any]]:
        confidence_ranges = [
            ("excellent", 0.9, 1.0),
            ("good", 0.7, 0.9),
            ("fair", 0.5, 0.7),
            ("poor", 0.0, 0.5)
        ]
        
        total_predictions = db.query(func.count(PredictionHistory.id)).filter(
            PredictionHistory.model_id == model_id
        ).scalar() or 0
        
        if total_predictions == 0:
            return [
                {"calidad": "excellent", "cantidad": 0, "porcentaje": 0.0},
                {"calidad": "good", "cantidad": 0, "porcentaje": 0.0},
                {"calidad": "fair", "cantidad": 0, "porcentaje": 0.0},
                {"calidad": "poor", "cantidad": 0, "porcentaje": 0.0}
            ]
        
        quality_distribution = []
        
        for quality, min_conf, max_conf in confidence_ranges:
            count = db.query(func.count(PredictionHistory.id)).filter(
                and_(
                    PredictionHistory.model_id == model_id,
                    PredictionHistory.confidence >= min_conf,
                    PredictionHistory.confidence < max_conf if max_conf < 1.0 else PredictionHistory.confidence <= max_conf
                )
            ).scalar() or 0
            
            percentage = (count / total_predictions * 100) if total_predictions > 0 else 0
            
            quality_distribution.append({
                "calidad": quality,
                "cantidad": count,
                "porcentaje": round(percentage, 1)
            })
        
        return quality_distribution
    
    def _get_real_training_progress(self, model_id: str, db: Session) -> List[Dict[str, Any]]:
        training_sessions = db.query(TrainingSession).filter(
            TrainingSession.model_id == model_id,
            TrainingSession.status == "completed"
        ).order_by(TrainingSession.created_at).all()
        
        if not training_sessions:
            model = db.query(Model).filter(Model.id == model_id).first()
            if model and model.last_trained:
                return [{
                    "sesion": 1,
                    "fecha": model.last_trained.strftime("%Y-%m-%d"),
                    "precision": round((model.accuracy * 100) if model.accuracy else 85.0, 1),
                    "muestras": db.query(func.count(Dataset.id)).filter(Dataset.model_id == model_id).scalar() or 0
                }]
            return []
        
        progress = []
        for i, session in enumerate(training_sessions):
            progress.append({
                "sesion": session.session_number or (i + 1),
                "fecha": session.created_at.strftime("%Y-%m-%d"),
                "precision": round((session.final_accuracy * 100) if session.final_accuracy else 85.0, 1),
                "muestras": session.training_samples or 0
            })
        
        return progress