"""Authentication endpoints: register, login, refresh, logout, OTP fallback."""
from __future__ import annotations

import logging
import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Body, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.security import create_access_token, create_refresh_token, decode_refresh_token
from app.db.session import get_db
from app.models.auth_log import AuthLog
from app.models.face_embedding import FaceEmbedding
from app.models.refresh_token import RefreshToken
from app.models.user import User
from app.schemas.auth import (
    LoginRequest,
    LogoutRequest,
    OTPRequestSchema,
    OTPVerifySchema,
    RefreshRequest,
    RegisterRequest,
    TokenResponse,
)
from app.schemas.common import APIResponse
from app.services.face_service import FaceService, FaceServiceError

logger = logging.getLogger(__name__)
router = APIRouter()
settings = get_settings()


def _get_ip(request: Request) -> str:
    forwarded_for = request.headers.get("X-Forwarded-For")
    if forwarded_for:
        return forwarded_for.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


# ── Register ────────────────────────────────────────────────────────────────

@router.post("/register", response_model=APIResponse, status_code=status.HTTP_201_CREATED)
async def register(
    body: RegisterRequest,
    db: AsyncSession = Depends(get_db),
) -> APIResponse:
    """Register a new user with facial biometrics.

    Accepts 3–10 base64-encoded JPEG frames. Generates a stable 512-d ArcFace
    embedding, stores it in pgvector, and creates the user account.
    """
    # 1. Email uniqueness check
    existing = await db.execute(select(User).where(User.email == body.email))
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email address is already registered",
        )

    # 2. Generate stable face embedding (multi-frame average + normalize)
    try:
        face_svc = FaceService()
        embedding = await face_svc.generate_stable_embedding(body.frames)
    except FaceServiceError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc))

    # 3. Persist user + embedding in a single transaction
    user = User(name=body.name.strip(), email=body.email.lower())
    db.add(user)
    await db.flush()  # populate user.id

    face_emb = FaceEmbedding(
        user_id=user.id,
        embedding=embedding,
        model_used=settings.FACE_MODEL,
    )
    db.add(face_emb)
    await db.commit()

    logger.info("Registered new user: %s (%s)", user.name, user.email)
    return APIResponse(message="Registration successful", status_code=201)


# ── Login ────────────────────────────────────────────────────────────────────

@router.post("/login", response_model=APIResponse[TokenResponse])
async def login(
    request: Request,
    body: LoginRequest,
    db: AsyncSession = Depends(get_db),
) -> APIResponse[TokenResponse]:
    """Authenticate via facial recognition.

    Returns JWT access + refresh tokens on success. Increments failed_attempts
    and locks account after MAX_FAILED_ATTEMPTS consecutive failures.
    """
    ip = _get_ip(request)

    # 1. Generate query embedding from submitted frames
    try:
        face_svc = FaceService()
        query_embedding = await face_svc.generate_stable_embedding(body.frames)
    except FaceServiceError as exc:
        log = AuthLog(ip_address=ip, is_success=False, failure_reason=str(exc))
        db.add(log)
        await db.commit()
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc))

    # 2. Find closest match in pgvector
    user, similarity = await face_svc.find_best_match(query_embedding, db)

    if user is None:
        log = AuthLog(ip_address=ip, is_success=False, failure_reason="No registered faces")
        db.add(log)
        await db.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication failed: no matching face found",
        )

    # 3. Check account lockout FIRST (before incrementing counters)
    now = datetime.now(timezone.utc)
    if user.locked_until and user.locked_until > now:
        remaining = int((user.locked_until - now).total_seconds() / 60)
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Account locked. Try again in {remaining} minutes.",
        )

    # 4. Check similarity threshold
    # SIMILARITY_THRESHOLD is a cosine DISTANCE threshold; similarity = 1 - distance
    # We compare 1-similarity (distance) against the configured threshold
    distance = 1.0 - similarity
    if distance > settings.SIMILARITY_THRESHOLD:
        user.failed_attempts += 1
        attempts_left = settings.MAX_FAILED_ATTEMPTS - user.failed_attempts

        if user.failed_attempts >= settings.MAX_FAILED_ATTEMPTS:
            user.locked_until = now + timedelta(seconds=settings.LOCKOUT_DURATION_SECONDS)
            failure_reason = "Account locked after too many failed attempts"
        else:
            failure_reason = f"Face not matched (distance={distance:.3f})"

        log = AuthLog(
            user_id=user.id,
            ip_address=ip,
            is_success=False,
            confidence_score=similarity,
            failure_reason=failure_reason,
        )
        db.add(log)
        await db.commit()

        if user.failed_attempts >= settings.MAX_FAILED_ATTEMPTS:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Account locked due to multiple failed attempts. Use OTP fallback.",
            )

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Authentication failed: face not matched. {attempts_left} attempt(s) remaining.",
        )

    # 5. Success — reset counters, issue tokens
    user.failed_attempts = 0
    user.locked_until = None

    access_token = create_access_token(user.id)
    refresh_token_str, jti = create_refresh_token(user.id)

    db_token = RefreshToken(
        user_id=user.id,
        jti=jti,
        expires_at=now + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
    )
    db.add(db_token)

    log = AuthLog(
        user_id=user.id,
        ip_address=ip,
        is_success=True,
        confidence_score=similarity,
    )
    db.add(log)
    await db.commit()

    logger.info("Successful login for user %s (similarity=%.3f)", user.email, similarity)
    return APIResponse(
        data=TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token_str,
            expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        ),
        message="Authentication successful",
    )


# ── Token Refresh ─────────────────────────────────────────────────────────────

@router.post("/refresh", response_model=APIResponse[TokenResponse])
async def refresh_tokens(
    body: RefreshRequest,
    db: AsyncSession = Depends(get_db),
) -> APIResponse[TokenResponse]:
    """Issue new access + refresh tokens (token rotation).

    If the refresh token has already been used (revoked), all sessions for that
    user are invalidated (refresh token reuse detection).
    """
    payload = decode_refresh_token(body.refresh_token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token",
        )

    jti: str = payload["jti"]
    user_id_str: str = payload["sub"]

    # Lookup existing token
    result = await db.execute(
        select(RefreshToken).where(
            RefreshToken.jti == jti,
            RefreshToken.revoked == False,  # noqa: E712
        )
    )
    db_token = result.scalar_one_or_none()

    if not db_token:
        # Token already used — REUSE DETECTED → revoke all sessions
        from sqlalchemy import delete as sa_delete

        try:
            user_uuid = uuid.UUID(user_id_str)
        except ValueError:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

        await db.execute(
            sa_delete(RefreshToken).where(RefreshToken.user_id == user_uuid)
        )
        await db.commit()
        logger.warning("Refresh token reuse detected for user %s — all sessions revoked", user_id_str)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token reuse detected — all sessions have been revoked",
        )

    # Rotate: revoke old, issue new
    db_token.revoked = True

    new_access = create_access_token(user_id_str)
    new_refresh_str, new_jti = create_refresh_token(user_id_str)

    now = datetime.now(timezone.utc)
    new_db_token = RefreshToken(
        user_id=db_token.user_id,
        jti=new_jti,
        expires_at=now + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
    )
    db.add(new_db_token)
    await db.commit()

    return APIResponse(
        data=TokenResponse(
            access_token=new_access,
            refresh_token=new_refresh_str,
            expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        ),
        message="Tokens refreshed",
    )


# ── Logout ───────────────────────────────────────────────────────────────────

@router.post("/logout", response_model=APIResponse)
async def logout(
    body: LogoutRequest,
    db: AsyncSession = Depends(get_db),
) -> APIResponse:
    """Revoke the provided refresh token (logout current session)."""
    payload = decode_refresh_token(body.refresh_token)
    if payload:
        result = await db.execute(
            select(RefreshToken).where(RefreshToken.jti == payload["jti"])
        )
        db_token = result.scalar_one_or_none()
        if db_token and not db_token.revoked:
            db_token.revoked = True
            await db.commit()
    return APIResponse(message="Logged out successfully")


# ── OTP Fallback ──────────────────────────────────────────────────────────────

@router.post("/otp/request", response_model=APIResponse)
async def request_otp(
    body: OTPRequestSchema,
    db: AsyncSession = Depends(get_db),
) -> APIResponse:
    """Send a 6-digit OTP to the registered email (fallback when face auth fails)."""
    # Verify email is registered (don't reveal which emails exist to attackers)
    result = await db.execute(select(User).where(User.email == body.email.lower()))
    user = result.scalar_one_or_none()
    if user is None:
        # Return success anyway to prevent email enumeration
        return APIResponse(message="If this email is registered, an OTP has been sent")

    from app.services.email_service import send_otp
    try:
        await send_otp(body.email.lower())
    except Exception as exc:
        logger.error("Failed to send OTP: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Could not send OTP email. Please try again later.",
        )

    return APIResponse(message="OTP sent to your email address")


@router.post("/otp/verify", response_model=APIResponse[TokenResponse])
async def verify_otp(
    body: OTPVerifySchema,
    db: AsyncSession = Depends(get_db),
) -> APIResponse[TokenResponse]:
    """Verify the OTP and issue JWT tokens."""
    from app.services.email_service import verify_otp as email_verify_otp

    is_valid = await email_verify_otp(body.email.lower(), body.otp)
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired OTP",
        )

    result = await db.execute(select(User).where(User.email == body.email.lower()))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is disabled")

    # Reset failed attempts on successful OTP login
    user.failed_attempts = 0
    user.locked_until = None

    now = datetime.now(timezone.utc)
    access_token = create_access_token(user.id)
    refresh_token_str, jti = create_refresh_token(user.id)

    db_token = RefreshToken(
        user_id=user.id,
        jti=jti,
        expires_at=now + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
    )
    db.add(db_token)
    await db.commit()

    logger.info("OTP login successful for %s", user.email)
    return APIResponse(
        data=TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token_str,
            expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        ),
        message="OTP verification successful",
    )
