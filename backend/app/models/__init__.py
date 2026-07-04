# Import all models so Alembic can discover them
from app.db.base import Base  # noqa: F401
from app.models.user import User  # noqa: F401
from app.models.face_embedding import FaceEmbedding  # noqa: F401
from app.models.auth_log import AuthLog  # noqa: F401
from app.models.admin_action import AdminAction  # noqa: F401
from app.models.refresh_token import RefreshToken  # noqa: F401

__all__ = ["Base", "User", "FaceEmbedding", "AuthLog", "AdminAction", "RefreshToken"]
