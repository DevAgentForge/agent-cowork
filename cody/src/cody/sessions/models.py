"""Pydantic models for sessions matching TypeScript types."""

from enum import Enum
from typing import Any

from pydantic import BaseModel, Field


class SessionStatus(str, Enum):
    """Status of a session."""

    IDLE = "idle"
    RUNNING = "running"
    COMPLETED = "completed"
    ERROR = "error"


class UserPromptMessage(BaseModel):
    """User prompt message type."""

    type: str = "user_prompt"
    prompt: str


class StreamMessage(BaseModel):
    """Stream message - can be SDK message or user prompt."""

    type: str
    # Additional fields are dynamic based on message type
    data: dict[str, Any] = Field(default_factory=dict)

    model_config = {"extra": "allow"}


class SessionInfo(BaseModel):
    """Session info for list responses."""

    id: str
    title: str
    status: SessionStatus
    claude_session_id: str | None = Field(
        default=None, alias="claudeSessionId", serialization_alias="claudeSessionId"
    )
    cwd: str | None = None
    created_at: int = Field(alias="createdAt", serialization_alias="createdAt")
    updated_at: int = Field(alias="updatedAt", serialization_alias="updatedAt")

    model_config = {"populate_by_name": True}


class StoredSession(BaseModel):
    """Session as stored in database."""

    id: str
    title: str
    status: SessionStatus
    cwd: str | None = None
    allowed_tools: str | None = None
    last_prompt: str | None = None
    claude_session_id: str | None = None
    created_at: int
    updated_at: int


class PendingPermission(BaseModel):
    """Pending permission request."""

    tool_use_id: str
    tool_name: str
    input: Any


class Session(BaseModel):
    """In-memory session state."""

    id: str
    title: str
    claude_session_id: str | None = None
    status: SessionStatus = SessionStatus.IDLE
    cwd: str | None = None
    allowed_tools: str | None = None
    last_prompt: str | None = None

    model_config = {"arbitrary_types_allowed": True}
