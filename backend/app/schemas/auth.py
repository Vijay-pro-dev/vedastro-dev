from typing import Optional

from pydantic import BaseModel, Field


class Signup(BaseModel):
    email: str
    password: str = Field(..., min_length=6)
    name: Optional[str] = None
    phone: Optional[str] = None
    nationality: Optional[str] = "global"


class Login(BaseModel):
    email: str
    password: str


class UserSummary(BaseModel):
    user_id: int
    email: str
    name: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    nationality: str = "global"
    language: str = "english"
    role: str = "user"
    email_verified: bool = False
    profile_pic: Optional[str] = None
    profile_completed: bool = False


class AuthResponse(BaseModel):
    access_token: str
    refresh_token: Optional[str] = None
    token_type: str = "bearer"
    user: UserSummary
    verification_required: bool = False
    verification_token: Optional[str] = None


class TokenRefreshRequest(BaseModel):
    refresh_token: str


class PasswordResetRequest(BaseModel):
    email: str


class PasswordResetConfirm(BaseModel):
    token: str
    new_password: str = Field(..., min_length=8)


class EmailVerificationRequest(BaseModel):
    email: str


class EmailVerificationConfirm(BaseModel):
    token: str
