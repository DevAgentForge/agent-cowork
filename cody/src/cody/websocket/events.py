"""Event type definitions matching TypeScript types.ts."""

from typing import Any, Literal

from pydantic import BaseModel, Field

from ..sessions.models import SessionInfo, SessionStatus

# ============================================================================
# Client -> Server Events
# ============================================================================


class SessionStartPayload(BaseModel):
    """Payload for session.start event."""

    title: str
    prompt: str
    cwd: str | None = None
    allowed_tools: str | None = None


class SessionContinuePayload(BaseModel):
    """Payload for session.continue event."""

    session_id: str = Field(alias="sessionId")
    prompt: str

    model_config = {"populate_by_name": True}


class SessionStopPayload(BaseModel):
    """Payload for session.stop event."""

    session_id: str = Field(alias="sessionId")

    model_config = {"populate_by_name": True}


class SessionDeletePayload(BaseModel):
    """Payload for session.delete event."""

    session_id: str = Field(alias="sessionId")

    model_config = {"populate_by_name": True}


class SessionHistoryPayload(BaseModel):
    """Payload for session.history event."""

    session_id: str = Field(alias="sessionId")

    model_config = {"populate_by_name": True}


class PermissionResponsePayload(BaseModel):
    """Payload for permission.response event."""

    session_id: str = Field(alias="sessionId")
    tool_use_id: str = Field(alias="toolUseId")
    result: dict[str, Any]

    model_config = {"populate_by_name": True}


class ClientEvent(BaseModel):
    """Client to server event."""

    type: Literal[
        "session.start",
        "session.continue",
        "session.stop",
        "session.delete",
        "session.list",
        "session.history",
        "permission.response",
    ]
    payload: (
        SessionStartPayload
        | SessionContinuePayload
        | SessionStopPayload
        | SessionDeletePayload
        | SessionHistoryPayload
        | PermissionResponsePayload
        | None
    ) = None


# ============================================================================
# Server -> Client Events
# ============================================================================


class StreamMessagePayload(BaseModel):
    """Payload for stream.message event."""

    session_id: str = Field(serialization_alias="sessionId")
    message: dict[str, Any]

    model_config = {"populate_by_name": True}


class StreamUserPromptPayload(BaseModel):
    """Payload for stream.user_prompt event."""

    session_id: str = Field(serialization_alias="sessionId")
    prompt: str

    model_config = {"populate_by_name": True}


class SessionStatusPayload(BaseModel):
    """Payload for session.status event."""

    session_id: str = Field(serialization_alias="sessionId")
    status: SessionStatus
    title: str | None = None
    cwd: str | None = None
    error: str | None = None

    model_config = {"populate_by_name": True}


class SessionListPayload(BaseModel):
    """Payload for session.list event."""

    sessions: list[SessionInfo]


class SessionHistoryResponsePayload(BaseModel):
    """Payload for session.history response event."""

    session_id: str = Field(serialization_alias="sessionId")
    status: SessionStatus
    messages: list[dict[str, Any]]

    model_config = {"populate_by_name": True}


class SessionDeletedPayload(BaseModel):
    """Payload for session.deleted event."""

    session_id: str = Field(serialization_alias="sessionId")

    model_config = {"populate_by_name": True}


class PermissionRequestPayload(BaseModel):
    """Payload for permission.request event."""

    session_id: str = Field(serialization_alias="sessionId")
    tool_use_id: str = Field(serialization_alias="toolUseId")
    tool_name: str = Field(serialization_alias="toolName")
    input: Any

    model_config = {"populate_by_name": True}


class RunnerErrorPayload(BaseModel):
    """Payload for runner.error event."""

    session_id: str | None = Field(serialization_alias="sessionId", default=None)
    message: str

    model_config = {"populate_by_name": True}


class ServerEvent(BaseModel):
    """Server to client event."""

    type: Literal[
        "stream.message",
        "stream.user_prompt",
        "session.status",
        "session.list",
        "session.history",
        "session.deleted",
        "permission.request",
        "runner.error",
    ]
    payload: (
        StreamMessagePayload
        | StreamUserPromptPayload
        | SessionStatusPayload
        | SessionListPayload
        | SessionHistoryResponsePayload
        | SessionDeletedPayload
        | PermissionRequestPayload
        | RunnerErrorPayload
    )

    def model_dump_json(self, **kwargs) -> str:
        """Serialize with camelCase aliases."""
        kwargs.setdefault("by_alias", True)
        return super().model_dump_json(**kwargs)
