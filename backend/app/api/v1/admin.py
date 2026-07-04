"""Admin endpoints: user management, logs, and settings."""
from __future__ import annotations

import logging
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_admin
from app.db.session import get_db
from app.models.admin_action import AdminAction
from app.models.auth_log import AuthLog
from app.models.face_embedding import FaceEmbedding
from app.models.user import User
from app.schemas.admin import AdminUserResponse, AuthLogListResponse, AuthLogResponse
from app.schemas.common import APIResponse

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/users", response_model=APIResponse[List[AdminUserResponse]])
async def get_all_users(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin),
) -> APIResponse[List[AdminUserResponse]]:
    """List all registered users."""
    result = await db.execute(
        select(User, FaceEmbedding.id.is_not(None).label("has_embedding"))
        .outerjoin(FaceEmbedding, User.id == FaceEmbedding.user_id)
        .order_by(User.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    
    users = []
    for user_obj, has_embedding in result.all():
        resp = AdminUserResponse.model_validate(user_obj)
        resp.has_embedding = bool(has_embedding)
        users.append(resp)
        
    return APIResponse(data=users)


@router.delete("/users/{user_id}", response_model=APIResponse)
async def delete_user(
    user_id: str,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin),
) -> APIResponse:
    """Delete a user and all associated biometric/auth data (GDPR right to be forgotten)."""
    import uuid
    try:
        user_uuid = uuid.UUID(user_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid user ID format")

    if user_uuid == admin.id:
        raise HTTPException(status_code=400, detail="Cannot delete your own admin account")

    # Verify user exists
    user = await db.scalar(select(User).where(User.id == user_uuid))
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Due to CASCADE constraints, deleting the User deletes their FaceEmbedding
    # and RefreshTokens. AuthLogs and AdminActions set user_id to NULL.
    await db.execute(delete(User).where(User.id == user_uuid))
    
    # Log the admin action
    action = AdminAction(
        admin_id=admin.id,
        action="DELETE_USER",
        target_user_id=None,  # User is now deleted, can't reference FK
        details=f"Deleted user {user.email}",
    )
    db.add(action)
    await db.commit()

    logger.info("Admin %s deleted user %s", admin.email, user.email)
    return APIResponse(message=f"User {user.email} and all biometrics permanently deleted")


@router.get("/logs", response_model=APIResponse[AuthLogListResponse])
async def get_auth_logs(
    skip: int = 0,
    limit: int = 100,
    user_id: str | None = None,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin),
) -> APIResponse[AuthLogListResponse]:
    """View authentication audit logs."""
    query = select(AuthLog).order_by(AuthLog.timestamp.desc())
    count_query = select(func.count(AuthLog.id))
    
    if user_id:
        import uuid
        try:
            uid = uuid.UUID(user_id)
            query = query.where(AuthLog.user_id == uid)
            count_query = count_query.where(AuthLog.user_id == uid)
        except ValueError:
            pass

    total = await db.scalar(count_query)
    
    result = await db.execute(query.offset(skip).limit(limit))
    logs = result.scalars().all()
    
    return APIResponse(
        data=AuthLogListResponse(
            total=total or 0,
            logs=[AuthLogResponse.model_validate(log) for log in logs]
        )
    )
