from typing import List, Optional

from pydantic import BaseModel, EmailStr, field_validator


class RegisterRequest(BaseModel):
    name: str
    email: EmailStr
    frames: List[str]  # Base64-encoded JPEG frames

    @field_validator("frames")
    @classmethod
    def validate_frames(cls, v: List[str]) -> List[str]:
        if len(v) < 3:
            raise ValueError("At least 3 frames are required for reliable embedding")
        if len(v) > 10:
            raise ValueError("Maximum 10 frames allowed")
        return v

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 2:
            raise ValueError("Name must be at least 2 characters")
        return v


class LoginRequest(BaseModel):
    frames: List[str]  # Base64-encoded JPEG frames
    liveness_passed: bool = False  # Client attests liveness check passed

    @field_validator("frames")
    @classmethod
    def validate_frames(cls, v: List[str]) -> List[str]:
        if len(v) < 1:
            raise ValueError("At least 1 frame is required")
        if len(v) > 10:
            raise ValueError("Maximum 10 frames allowed")
        return v


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int = 1800  # seconds


class RefreshRequest(BaseModel):
    refresh_token: str


class LogoutRequest(BaseModel):
    refresh_token: str


class OTPRequestSchema(BaseModel):
    email: EmailStr


class OTPVerifySchema(BaseModel):
    email: EmailStr
    otp: str

    @field_validator("otp")
    @classmethod
    def validate_otp(cls, v: str) -> str:
        v = v.strip()
        if len(v) != 6 or not v.isdigit():
            raise ValueError("OTP must be exactly 6 digits")
        return v
