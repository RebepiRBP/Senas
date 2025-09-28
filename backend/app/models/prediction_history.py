from sqlalchemy import Column, String, DateTime, Float, ForeignKey, Integer, Text
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
from app.database.database import Base

class PredictionHistory(Base):
    __tablename__ = "prediction_history"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    model_id = Column(String, ForeignKey("models.id"), nullable=False)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    prediction = Column(String, nullable=False)
    confidence = Column(Float, nullable=False)
    landmarks_data = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    processing_time = Column(Float)
    
    model = relationship("Model")
    user = relationship("User")
    
    def to_dict(self):
        return {
            "id": self.id,
            "model_id": self.model_id,
            "user_id": self.user_id,
            "prediction": self.prediction,
            "confidence": self.confidence,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "processing_time": self.processing_time
        }