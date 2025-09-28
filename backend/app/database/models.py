from sqlalchemy import Column, String, Text, DateTime, Integer, Float, JSON, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid

from app.database.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    role = Column(String, default="user")
    created_at = Column(DateTime, default=datetime.utcnow)
    last_login = Column(DateTime)
    
    models = relationship("Model", back_populates="user", cascade="all, delete-orphan")

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
    model_path = Column(String)
    config_path = Column(String)
    training_epochs = Column(Integer, default=50)
    batch_size = Column(Integer, default=32)
    learning_rate = Column(Float, default=0.001)
    
    user = relationship("User", back_populates="models")
    datasets = relationship("Dataset", back_populates="model", cascade="all, delete-orphan")

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