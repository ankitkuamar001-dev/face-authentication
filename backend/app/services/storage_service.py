"""MinIO / S3 storage service for optional face thumbnail storage."""
from __future__ import annotations

import io
import logging
import uuid

from minio import Minio
from minio.error import S3Error

from app.core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


class StorageService:
    """Handles face thumbnail uploads/downloads via MinIO."""

    _client: Minio | None = None

    @classmethod
    def _get_client(cls) -> Minio:
        if cls._client is None:
            cls._client = Minio(
                endpoint=settings.MINIO_ENDPOINT,
                access_key=settings.MINIO_ACCESS_KEY,
                secret_key=settings.MINIO_SECRET_KEY,
                secure=settings.MINIO_SECURE,
            )
        return cls._client

    @classmethod
    def ensure_bucket(cls) -> None:
        """Create the bucket if it doesn't exist (called at startup)."""
        try:
            client = cls._get_client()
            if not client.bucket_exists(settings.MINIO_BUCKET):
                client.make_bucket(settings.MINIO_BUCKET)
                logger.info("Created MinIO bucket: %s", settings.MINIO_BUCKET)
        except S3Error as exc:
            logger.error("Could not ensure MinIO bucket: %s", exc)

    @classmethod
    def upload_thumbnail(cls, user_id: uuid.UUID, image_bytes: bytes) -> str | None:
        """Upload a JPEG thumbnail and return its object name.  Returns None on failure."""
        try:
            client = cls._get_client()
            object_name = f"thumbnails/{user_id}.jpg"
            client.put_object(
                bucket_name=settings.MINIO_BUCKET,
                object_name=object_name,
                data=io.BytesIO(image_bytes),
                length=len(image_bytes),
                content_type="image/jpeg",
            )
            logger.info("Uploaded thumbnail for user %s", user_id)
            return object_name
        except S3Error as exc:
            logger.warning("MinIO upload failed for user %s: %s", user_id, exc)
            return None

    @classmethod
    def delete_thumbnail(cls, user_id: uuid.UUID) -> None:
        """Delete a user's thumbnail (GDPR deletion)."""
        try:
            client = cls._get_client()
            client.remove_object(settings.MINIO_BUCKET, f"thumbnails/{user_id}.jpg")
        except S3Error as exc:
            logger.warning("MinIO delete failed for user %s: %s", user_id, exc)
