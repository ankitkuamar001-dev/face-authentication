"""Face detection, embedding generation, and matching service.

Uses DeepFace (ArcFace model + RetinaFace detector) running in a thread pool
to avoid blocking the asyncio event loop.
"""
from __future__ import annotations

import asyncio
import base64
import logging
from typing import TYPE_CHECKING

import cv2
import numpy as np
from deepface import DeepFace

from app.core.config import get_settings

if TYPE_CHECKING:
    from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)
settings = get_settings()

EMBEDDING_DIM = 512
MIN_FACE_CONFIDENCE = 0.9  # Minimum confidence from RetinaFace to accept a detection


class FaceServiceError(Exception):
    """Raised when a face processing step fails."""
    pass


class FaceService:
    """Singleton-style face processing service.

    Instantiate once at startup so DeepFace can cache the loaded model weights.
    """

    _instance: FaceService | None = None

    def __new__(cls) -> FaceService:
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self) -> None:
        if self._initialized:  # type: ignore[has-type]
            return
        self.model_name = settings.FACE_MODEL
        self.detector_backend = settings.FACE_DETECTOR_BACKEND
        self._initialized = True
        logger.info(
            "FaceService initialized — model=%s detector=%s",
            self.model_name,
            self.detector_backend,
        )

    # ── Private helpers ──────────────────────────────────────────

    def _decode_b64(self, b64_str: str) -> np.ndarray:
        """Decode a base64-encoded JPEG/PNG string to an OpenCV BGR image."""
        try:
            if "," in b64_str:
                b64_str = b64_str.split(",", 1)[1]
            raw = base64.b64decode(b64_str)
            arr = np.frombuffer(raw, np.uint8)
            img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
            if img is None:
                raise FaceServiceError("Could not decode image data")
            return img
        except FaceServiceError:
            raise
        except Exception as exc:
            raise FaceServiceError(f"Invalid base64 image: {exc}") from exc

    def _extract_embedding_sync(self, img: np.ndarray) -> list[float]:
        """Generate a 512-d ArcFace embedding.  Runs synchronously — call via asyncio.to_thread."""
        try:
            results = DeepFace.represent(
                img_path=img,
                model_name=self.model_name,
                detector_backend=self.detector_backend,
                enforce_detection=True,
                align=True,
                normalization="ArcFace",
            )
        except ValueError as exc:
            # DeepFace raises ValueError("Face could not be detected") when no face found
            raise FaceServiceError(f"Face detection failed: {exc}") from exc
        except Exception as exc:
            raise FaceServiceError(f"Embedding generation error: {exc}") from exc

        if not results:
            raise FaceServiceError("No face detected in frame")
        if len(results) > 1:
            raise FaceServiceError("Multiple faces detected — please ensure only one face is visible")

        return results[0]["embedding"]

    @staticmethod
    def _validate_frame_variance(images: list[np.ndarray]) -> None:
        """Reject replay attacks by checking that frames are not identical static images."""
        if len(images) < 2:
            return  # Cannot compare single frame

        # Compare consecutive frames using structural similarity (simple MSE check)
        for i in range(1, len(images)):
            diff = cv2.absdiff(
                cv2.cvtColor(images[i - 1], cv2.COLOR_BGR2GRAY),
                cv2.cvtColor(images[i], cv2.COLOR_BGR2GRAY),
            )
            mean_diff = float(np.mean(diff))
            if mean_diff < 0.5:
                raise FaceServiceError(
                    "Frames appear identical — possible replay attack detected"
                )

    # ── Public async API ─────────────────────────────────────────

    async def generate_stable_embedding(self, base64_frames: list[str]) -> list[float]:
        """Process 3-5 frames → per-frame embeddings → average → L2 normalize.

        Args:
            base64_frames: List of base64-encoded JPEG frame strings.

        Returns:
            Normalized 512-d embedding vector.

        Raises:
            FaceServiceError: If any validation or ML step fails.
        """
        if not base64_frames:
            raise FaceServiceError("No frames provided")

        # 1. Decode all frames
        images: list[np.ndarray] = []
        for b64 in base64_frames:
            images.append(self._decode_b64(b64))

        # 2. Validate frame temporal variance (anti-replay)
        self._validate_frame_variance(images)

        # 3. Generate embedding per frame (in thread pool to avoid blocking)
        embeddings: list[list[float]] = []
        errors: list[str] = []

        for img in images:
            try:
                emb = await asyncio.to_thread(self._extract_embedding_sync, img)
                embeddings.append(emb)
            except FaceServiceError as exc:
                errors.append(str(exc))
                logger.warning("Frame embedding failed: %s", exc)

        # Need at least half the frames to succeed
        if len(embeddings) < max(1, len(images) // 2):
            raise FaceServiceError(
                f"Face detection failed on too many frames. "
                f"Errors: {'; '.join(errors[:3])}"
            )

        # 4. Average embeddings
        avg = np.mean(np.array(embeddings), axis=0)

        # 5. L2 normalize → unit vector for cosine similarity
        norm = np.linalg.norm(avg)
        if norm == 0.0:
            raise FaceServiceError("Degenerate embedding vector — please try again")

        return (avg / norm).tolist()

    async def find_best_match(
        self,
        query_embedding: list[float],
        db: AsyncSession,
    ) -> tuple[object | None, float]:
        """Query pgvector for the closest matching face embedding.

        Returns (User | None, similarity_score) where similarity_score ∈ [0, 1].
        """
        from sqlalchemy import select, text

        from app.models.face_embedding import FaceEmbedding
        from app.models.user import User

        # pgvector <=> operator = cosine distance (lower = more similar)
        stmt = (
            select(
                User,
                FaceEmbedding,
                FaceEmbedding.embedding.cosine_distance(query_embedding).label("distance"),
            )
            .join(FaceEmbedding, User.id == FaceEmbedding.user_id)
            .where(User.is_active == True)  # noqa: E712
            .order_by("distance")
            .limit(1)
        )

        result = await db.execute(stmt)
        row = result.first()
        if row is None:
            return None, 0.0

        user, _face_obj, distance = row
        similarity = 1.0 - float(distance)
        return user, similarity
