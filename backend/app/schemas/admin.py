import uuid
from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel

from app.schemas.user import UserResponse


class AdminUserResponse(UserResponse):
    """Extended user response with admin-only fields."""
    has_embedding: bool = False


class AdminUserListResponse(BaseModel):
    total: int
    users: List[AdminUserResponse]


class AuthLogResponse(BaseModel):
    id: uuid.UUID
    user_id: Optional[uuid.UUID] = None
    ip_address: str
    is_success: bool
    confidence_score: Optional[float] = None
    failure_reason: Optional[str] = None
    timestamp: datetime

    model_config = {"from_attributes": True}


class AuthLogListResponse(BaseModel):
    total: int
    logs: List[AuthLogResponse]


class AuditLogResponse(BaseModel):
    id: uuid.UUID
    admin_id: uuid.UUID
    action: str
    target_user_id: Optional[uuid.UUID] = None
    details: Optional[str] = None
    timestamp: datetime

    model_config = {"from_attributes": True}


class AuditLogListResponse(BaseModel):
    total: int
    logs: List[AuditLogResponse]


class DashboardStatsResponse(BaseModel):
    total_users: int
    active_users: int
    admin_users: int
    total_embeddings: int
    recent_auth_failures: int
    recent_auth_successes: int


class SettingsResponse(BaseModel):
    similarity_threshold: float
    max_failed_attempts: int
    lockout_duration_seconds: int
    face_model: str
    face_detector_backend: str


class UpdateSettingsRequest(BaseModel):
    similarity_threshold: Optional[float] = None
    max_failed_attempts: Optional[int] = None
    lockout_duration_seconds: Optional[int] = None
