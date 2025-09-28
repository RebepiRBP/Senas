from sqlalchemy import Column, String, Text, DateTime, Integer, Float, JSON, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
from app.database.database import Base

class Model(Base):
    __tablename__ = "models"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    name = Column(String, nullable=False)
    description = Column(Text)
    categories = Column(JSON, default=list)
    labels = Column(JSON, default=list)
    accuracy = Column(Float, default=0.0)
    last_trained = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    status = Column(String, default="created")
    version = Column(Integer, default=1)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    type = Column(String, default="standard")

    model_path = Column(String)
    config_path = Column(String)

    training_epochs = Column(Integer, default=50)
    batch_size = Column(Integer, default=32)
    learning_rate = Column(Float, default=0.001)

    user = relationship("User", back_populates="models")
    datasets = relationship("Dataset", back_populates="model", cascade="all, delete-orphan")

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "categories": self.categories,
            "labels": self.labels,
            "accuracy": self.accuracy,
            "lastTrained": self.last_trained.isoformat() if self.last_trained else None,
            "createdAt": self.created_at.isoformat() if self.created_at else None,
            "updatedAt": self.updated_at.isoformat() if self.updated_at else None,
            "status": self.status,
            "version": self.version,
            "type": self.type
        }