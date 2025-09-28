from fastapi import APIRouter, HTTPException, Depends, status
from sqlalchemy.orm import Session
from app.database.database import get_db
from app.models.user import User
from app.models.system_config import SystemConfig
from app.core.security import get_password_hash
from app.schemas.setup import SetupRequest, SetupResponse
import uuid
from datetime import datetime

setup_router = APIRouter()

@setup_router.get("/status")
async def check_setup_status(db: Session = Depends(get_db)):
    config = db.query(SystemConfig).filter(SystemConfig.key == "system_initialized").first()
    admin_exists = db.query(User).filter(User.role == "admin").first()
    
    is_initialized = (config and config.value == "true") or admin_exists is not None
    
    return {
        "initialized": is_initialized,
        "requiresSetup": not is_initialized
    }

@setup_router.post("/", response_model=SetupResponse)
async def setup_admin(
    setup_data: SetupRequest,
    db: Session = Depends(get_db)
):
    config = db.query(SystemConfig).filter(SystemConfig.key == "system_initialized").first()
    admin_exists = db.query(User).filter(User.role == "admin").first()
    
    if (config and config.value == "true") or admin_exists:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="System already initialized"
        )
    
    username_exists = db.query(User).filter(User.username == setup_data.username).first()
    if username_exists:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already taken"
        )
    
    email_exists = db.query(User).filter(User.email == setup_data.email).first()
    if email_exists:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    try:
        admin_user = User(
            id=str(uuid.uuid4()),
            username=setup_data.username,
            email=setup_data.email,
            hashed_password=get_password_hash(setup_data.password),
            is_active=True,
            role="admin",
            created_at=datetime.utcnow()
        )
        
        config_entry = SystemConfig(
            key="system_initialized",
            value="true",
            description="System initialization completed",
            created_at=datetime.utcnow()
        )
        
        db.add(admin_user)
        db.add(config_entry)
        db.commit()
        db.refresh(admin_user)
        
        return SetupResponse(
            success=True,
            message="Administrator created successfully",
            userId=admin_user.id
        )
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating administrator: {str(e)}"
        )