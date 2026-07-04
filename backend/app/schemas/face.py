from typing import List

from pydantic import BaseModel, field_validator


class ReEnrollRequest(BaseModel):
    frames: List[str]
    liveness_passed: bool = False

    @field_validator("frames")
    @classmethod
    def validate_frames(cls, v: List[str]) -> List[str]:
        if len(v) < 3:
            raise ValueError("At least 3 frames required for re-enrollment")
        return v
