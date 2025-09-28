from pydantic import BaseModel, EmailStr, Field

class SetupRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=50, pattern="^[a-zA-Z0-9_]+$")
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=100)

class SetupResponse(BaseModel):
    success: bool
    message: str
    userId: str

class SetupStatusResponse(BaseModel):
    initialized: bool
    requiresSetup: bool