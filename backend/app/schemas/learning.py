from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from datetime import datetime

class LearningCompareRequest(BaseModel):
    landmarks: List[Dict[str, float]] = Field(..., min_items=21, max_items=21)
    targetLabel: str = Field(..., min_length=1, max_length=100)

class LearningCompareResponse(BaseModel):
    prediction: str
    confidence: float = Field(..., ge=0.0, le=1.0)
    isMatch: bool
    feedback: str
    similarity: float = Field(..., ge=0.0, le=1.0)
    timestamp: str
    detectionQuality: str = Field(..., pattern="^(excellent|good|fair|poor|error)$")

class LearningReferenceResponse(BaseModel):
    label: str
    referenceImage: str
    totalSamples: int = Field(..., ge=0)
    landmarks: Optional[List[Dict[str, float]]] = None
    created: Optional[str] = None

class LearningSessionStats(BaseModel):
    totalAttempts: int = Field(..., ge=0)
    correctAttempts: int = Field(..., ge=0)
    averageConfidence: float = Field(..., ge=0.0, le=1.0)
    averageSimilarity: float = Field(..., ge=0.0, le=1.0)
    successRate: float = Field(..., ge=0.0, le=100.0)
    currentStreak: int = Field(..., ge=0)
    bestStreak: int = Field(..., ge=0)
    timeSpent: int = Field(..., ge=0)
    lastActivity: Optional[str] = None

class LearningProgressUpdate(BaseModel):
    targetLabel: str = Field(..., min_length=1, max_length=100)
    isCorrect: bool
    confidence: float = Field(..., ge=0.0, le=1.0)
    similarity: float = Field(..., ge=0.0, le=1.0)
    sessionTime: int = Field(default=0, ge=0)
    detectionQuality: str = Field(default="fair", pattern="^(excellent|good|fair|poor|error)$")

class LearningLabelPerformance(BaseModel):
    label: str
    attempts: int = Field(..., ge=0)
    successes: int = Field(..., ge=0)
    successRate: float = Field(..., ge=0.0, le=100.0)
    averageConfidence: float = Field(..., ge=0.0, le=1.0)
    difficulty: str = Field(..., pattern="^(easy|medium|hard|very_hard|unknown)$")
    recommendations: List[str] = Field(default_factory=list)

class LearningSessionCreate(BaseModel):
    modelId: str = Field(..., min_length=1)
    userId: str = Field(..., min_length=1)
    sessionType: str = Field(default="practice", pattern="^(practice|assessment|guided)$")

class LearningSessionResponse(BaseModel):
    sessionId: str
    modelId: str
    userId: str
    sessionType: str
    startedAt: str
    lastActivity: Optional[str] = None
    isActive: bool = True

class LearningRecommendation(BaseModel):
    type: str = Field(..., pattern="^(technique|practice|environment|motivation)$")
    message: str = Field(..., min_length=1)
    priority: str = Field(..., pattern="^(high|medium|low)$")
    actionable: bool = True

class LearningAnalytics(BaseModel):
    modelId: str
    userId: str
    totalSessionTime: int = Field(..., ge=0)
    averageSessionLength: float = Field(..., ge=0.0)
    totalPracticeSessions: int = Field(..., ge=0)
    overallSuccessRate: float = Field(..., ge=0.0, le=100.0)
    mostDifficultLabels: List[str] = Field(default_factory=list, max_items=5)
    easiestLabels: List[str] = Field(default_factory=list, max_items=5)
    learningTrend: str = Field(..., pattern="^(improving|stable|declining|insufficient_data)$")
    lastPracticeDate: Optional[str] = None
    recommendations: List[LearningRecommendation] = Field(default_factory=list)

class LearningComparisonHistory(BaseModel):
    modelId: str
    targetLabel: str
    attempts: List[Dict[str, Any]] = Field(default_factory=list, max_items=100)
    createdAt: str
    updatedAt: str

class LearningBatchCompareRequest(BaseModel):
    comparisons: List[LearningCompareRequest] = Field(..., min_items=1, max_items=10)
    sessionId: Optional[str] = None

class LearningBatchCompareResponse(BaseModel):
    results: List[LearningCompareResponse]
    sessionStats: Optional[LearningSessionStats] = None
    batchSummary: Dict[str, Any] = Field(default_factory=dict)

class LearningProgressSummary(BaseModel):
    modelId: str
    userId: str
    labels: List[str]
    labelProgress: Dict[str, LearningLabelPerformance] = Field(default_factory=dict)
    overallProgress: float = Field(..., ge=0.0, le=100.0)
    completedLabels: List[str] = Field(default_factory=list)
    strugglingLabels: List[str] = Field(default_factory=list)
    nextRecommendedLabel: Optional[str] = None
    estimatedCompletionTime: Optional[int] = None

class LearningGoal(BaseModel):
    goalId: str
    userId: str
    modelId: str
    targetLabels: List[str] = Field(..., min_items=1)
    targetAccuracy: float = Field(..., ge=0.5, le=1.0)
    deadline: Optional[str] = None
    isCompleted: bool = False
    progress: float = Field(..., ge=0.0, le=1.0)
    createdAt: str
    completedAt: Optional[str] = None

class LearningAchievement(BaseModel):
    achievementId: str
    userId: str
    title: str
    description: str
    type: str = Field(..., pattern="^(accuracy|speed|consistency|completion|streak)$")
    unlockedAt: str
    modelId: Optional[str] = None
    value: Optional[float] = None