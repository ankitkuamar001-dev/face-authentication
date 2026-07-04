"""User endpoints: profile, face re-enrollment."""
from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_active_user
from app.core.config import get_settings
from app.db.session import get_db
from app.models.face_embedding import FaceEmbedding
from app.models.user import User
from app.schemas.common import APIResponse
from app.schemas.face import ReEnrollRequest
from app.schemas.user import UserResponse
from app.services.face_service import FaceService, FaceServiceError

logger = logging.getLogger(__name__)
router = APIRouter()
settings = get_settings()


@router.get("/me", response_model=APIResponse[UserResponse])
async def get_me(
    current_user: User = Depends(get_current_active_user),
) -> APIResponse[UserResponse]:
    """Return the currently authenticated user's profile."""
    return APIResponse(
        data=UserResponse.model_validate(current_user),
        message="Profile retrieved",
    )


@router.post("/face/re-enroll", response_model=APIResponse)
async def re_enroll_face(
    body: ReEnrollRequest,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
) -> APIResponse:
    """Re-enroll the current user's face embedding (replaces existing embedding)."""
    try:
        face_svc = FaceService()
        new_embedding = await face_svc.generate_stable_embedding(body.frames)
    except FaceServiceError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
        )

    # Upsert: update existing embedding if present, else create
    result = await db.execute(
        select(FaceEmbedding).where(FaceEmbedding.user_id == current_user.id)
    )
    existing = result.scalar_one_or_none()

    if existing:
        existing.embedding = new_embedding
        existing.model_used = settings.FACE_MODEL
    else:
        face_emb = FaceEmbedding(
            user_id=current_user.id,
            embedding=new_embedding,
            model_used=settings.FACE_MODEL,
        )
        db.add(face_emb)

    await db.commit()
    logger.info("Re-enrolled face for user %s", current_user.email)
    return APIResponse(message="Face biometrics updated successfully")
