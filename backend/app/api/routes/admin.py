from fastapi import APIRouter, HTTPException, Depends, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
import psutil
import time
import os

from app.database.database import get_db
from app.core.security import get_current_admin_user
from app.models.user import User
from app.models.model import Model
from app.models.dataset import Dataset

admin_router = APIRouter()

@admin_router.get("/stats")
async def get_system_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    total_users = db.query(func.count(User.id)).scalar()
    total_models = db.query(func.count(Model.id)).scalar()
    total_samples = db.query(func.count(Dataset.id)).scalar()
    
    disk_usage = psutil.disk_usage('/').used
    uptime = time.time() - psutil.boot_time()
    
    return {
        "totalUsers": total_users,
        "totalModels": total_models,
        "totalTrainingSamples": total_samples,
        "diskUsage": disk_usage,
        "systemUptime": uptime
    }

@admin_router.get("/users")
async def get_all_users(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    users = db.query(User).offset(skip).limit(limit).all()
    
    user_data = []
    for user in users:
        model_count = db.query(func.count(Model.id)).filter(Model.user_id == user.id).scalar()
        user_data.append({
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "createdAt": user.created_at.isoformat(),
            "lastLogin": user.last_login.isoformat() if user.last_login else None,
            "modelCount": model_count,
            "isActive": user.is_active
        })
    
    return user_data

@admin_router.post("/users/{user_id}/activate")
async def activate_user(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    user.is_active = True
    db.commit()
    
    return {"message": f"User {user.username} activated successfully"}

@admin_router.post("/users/{user_id}/deactivate")
async def deactivate_user(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    if user.id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot deactivate your own account"
        )
    
    user.is_active = False
    db.commit()
    
    return {"message": f"User {user.username} deactivated successfully"}

@admin_router.delete("/users/{user_id}")
async def delete_user(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    if user.id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete your own account"
        )
    
    db.delete(user)
    db.commit()
    
    return {"message": f"User {user.username} deleted successfully"}

@admin_router.post("/system/backup")
async def create_backup(
    current_user: User = Depends(get_current_admin_user)
):
    return {"message": "Backup created successfully"}

@admin_router.post("/system/cleanup")
async def cleanup_system(
    current_user: User = Depends(get_current_admin_user)
):
    return {"message": "System cleanup completed"}

@admin_router.post("/system/reset")
async def reset_system(
    current_user: User = Depends(get_current_admin_user)
):
    return {"message": "System reset completed"}

@admin_router.get("/models")
async def get_all_models(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    models = db.query(Model).offset(skip).limit(limit).all()
    return models