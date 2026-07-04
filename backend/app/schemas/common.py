from typing import Generic, Optional, TypeVar

from pydantic import BaseModel

T = TypeVar("T")


class APIResponse(BaseModel, Generic[T]):
    """Standard JSON envelope for all API responses."""

    success: bool = True
    data: Optional[T] = None
    message: str = "Operation successful"
    status_code: int = 200
