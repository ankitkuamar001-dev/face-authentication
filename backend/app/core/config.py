from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import field_validator
from functools import lru_cache
from typing import List


class Settings(BaseSettings):
    # ── App ────────────────────────────────────────────────────────
    APP_NAME: str = "Face Authentication API"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    # Comma-separated or JSON list: "http://localhost:3000,http://localhost:5173"
    ALLOWED_ORIGINS: str = "http://localhost:3000,http://localhost:5173"

    @property
    def allowed_origins_list(self) -> List[str]:
        v = self.ALLOWED_ORIGINS.strip()
        if v.startswith("["):
            import json
            return json.loads(v)
        return [o.strip() for o in v.split(",") if o.strip()]

    # ── JWT ────────────────────────────────────────────────────────
    JWT_SECRET_KEY: str = "CHANGE_ME_IN_PRODUCTION_USE_LONG_RANDOM_SECRET"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # ── Database ───────────────────────────────────────────────────
    POSTGRES_USER: str = "faceauth"
    POSTGRES_PASSWORD: str = "faceauth_dev_password"
    POSTGRES_DB: str = "faceauth_db"
    DATABASE_URL: str = "postgresql+asyncpg://faceauth:faceauth_dev_password@localhost:5432/faceauth_db"

    # ── Redis ──────────────────────────────────────────────────────
    REDIS_URL: str = "redis://localhost:6379/0"

    # ── MinIO / S3 ─────────────────────────────────────────────────
    MINIO_ENDPOINT: str = "localhost:9000"
    MINIO_ROOT_USER: str = "minioadmin"
    MINIO_ROOT_PASSWORD: str = "minioadmin123"
    MINIO_ACCESS_KEY: str = "minioadmin"
    MINIO_SECRET_KEY: str = "minioadmin123"
    MINIO_BUCKET: str = "face-thumbnails"
    MINIO_SECURE: bool = False

    # ── ML Pipeline ────────────────────────────────────────────────
    FACE_MODEL: str = "ArcFace"
    FACE_DETECTOR_BACKEND: str = "retinaface"
    # Cosine distance threshold (ArcFace). distance = 1 - similarity.
    # Default 0.68 means ~32% similarity required. Lower = stricter.
    SIMILARITY_THRESHOLD: float = 0.68

    # ── Security ───────────────────────────────────────────────────
    MAX_FAILED_ATTEMPTS: int = 5
    LOCKOUT_DURATION_SECONDS: int = 1800  # 30 minutes
    RATE_LIMIT_PER_MINUTE: int = 30

    # ── OTP Email ──────────────────────────────────────────────────
    SMTP_CONSOLE_OUTPUT: bool = True  # Print OTP to console in dev
    SMTP_SERVER: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USERNAME: str = "user@example.com"
    SMTP_PASSWORD: str = "app_password"
    SMTP_FROM_EMAIL: str = "noreply@faceauth.app"
    OTP_EXPIRE_MINUTES: int = 5

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()
