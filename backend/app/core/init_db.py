from sqlalchemy.orm import Session
from app.database.database import SessionLocal
from app.models.user import User
from app.models.system_config import SystemConfig
from app.core.security import get_password_hash
import uuid
from datetime import datetime

def init_database():
    db = SessionLocal()
    try:
        existing_config = db.query(SystemConfig).filter(SystemConfig.key == "system_initialized").first()
        if existing_config and existing_config.value == "true":
            return
        
        admin_exists = db.query(User).filter(User.role == "admin").first()
        if admin_exists:
            mark_system_as_initialized(db)
            return
        
        default_admin = User(
            id=str(uuid.uuid4()),
            username="Rebepi",
            email="Rebepi@gmail.com",
            hashed_password=get_password_hash("Rebepi8989"),
            is_active=True,
            role="admin",
            created_at=datetime.utcnow()
        )
        
        db.add(default_admin)
        mark_system_as_initialized(db)
        db.commit()
        
    except Exception as e:
        db.rollback()
        print(f"Error inicializando base de datos: {str(e)}")
    finally:
        db.close()

def mark_system_as_initialized(db: Session):
    config = SystemConfig(
        key="system_initialized",
        value="true",
        description="Indica si el sistema ha sido inicializado",
        created_at=datetime.utcnow()
    )
    db.add(config)