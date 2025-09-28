from sqlalchemy import Column, String, DateTime, Float, ForeignKey, Integer, Text
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
from app.database.database import Base

class TrainingSession(Base):
    __tablename__ = "training_sessions"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    model_id = Column(String, ForeignKey("models.id"), nullable=False)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    session_number = Column(Integer, nullable=False)
    initial_accuracy = Column(Float)
    final_accuracy = Column(Float)
    training_samples = Column(Integer)
    training_time = Column(Float)
    created_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime)
    status = Column(String, default="completed")
    
    model = relationship("Model")
    user = relationship("User")
    
    def to_dict(self):
        return {
            "id": self.id,
            "model_id": self.model_id,
            "user_id": self.user_id,
            "session_number": self.session_number,
            "initial_accuracy": self.initial_accuracy,
            "final_accuracy": self.final_accuracy,
            "training_samples": self.training_samples,
            "training_time": self.training_time,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
            "status": self.status
        }