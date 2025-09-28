from sqlalchemy import Column, String, Text, DateTime, JSON, ForeignKey, Integer
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
from app.database.database import Base

class Dataset(Base):
    __tablename__ = "datasets"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    model_id = Column(String, ForeignKey("models.id"), nullable=False)
    label = Column(String, nullable=False)
    image_data = Column(Text)
    landmarks = Column(JSON)
    file_path = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)
    image_width = Column(Integer)
    image_height = Column(Integer)
    confidence = Column(String)
    model = relationship("Model", back_populates="datasets")

    def to_dict(self):
        return {
            "id": self.id,
            "modelId": self.model_id,
            "label": self.label,
            "landmarks": self.landmarks,
            "createdAt": self.created_at.isoformat() if self.created_at else None,
            "filePath": self.file_path,
            "imageWidth": self.image_width,
            "imageHeight": self.image_height,
            "confidence": self.confidence
        }