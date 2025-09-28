from fastapi import APIRouter, HTTPException, Depends, status
from sqlalchemy.orm import Session
from app.database.database import get_db
from app.core.security import get_current_active_user
from app.models.user import User
from app.models.model import Model
from app.schemas.statistics import ModelStatisticsResponse
from app.services.statistics_service import StatisticsService

router = APIRouter()

@router.get("/{model_id}", response_model=ModelStatisticsResponse)
async def get_model_statistics(
    model_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    model = db.query(Model).filter(
        Model.id == model_id,
        Model.user_id == current_user.id
    ).first()
    
    if not model:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Model not found"
        )
    
    try:
        statistics_service = StatisticsService()
        statistics = statistics_service.get_model_statistics(model_id, db)
        return statistics
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error generating statistics: {str(e)}"
        )