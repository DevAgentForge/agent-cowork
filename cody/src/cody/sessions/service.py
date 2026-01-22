"""Session business logic service - Single Responsibility for session operations."""

from typing import Any

from .models import Session, SessionStatus
from .store import SessionStore


class SessionService:
    """Service layer for session business logic.

    Follows Single Responsibility Principle by handling only session
    lifecycle operations, separating concerns from WebSocket handling.
    """

    def __init__(self, store: SessionStore):
        self.store = store

    async def create_and_start_session(
        self,
        title: str,
        prompt: str,
        cwd: str | None = None,
        allowed_tools: str | None = None,
    ) -> Session:
        """Create a new session and mark it as running.

        Returns the session ready to be executed.
        """
        session = await self.store.create_session(
            title=title,
            cwd=cwd,
            allowed_tools=allowed_tools,
            prompt=prompt,
        )

        await self.store.update_session(
            session.id,
            {"status": SessionStatus.RUNNING, "last_prompt": prompt},
        )

        return session

    async def continue_session(
        self, session_id: str, prompt: str
    ) -> tuple[Session | None, str | None]:
        """Continue an existing session.

        Returns (session, error_message). If session is None, error_message
        explains why.
        """
        session = self.store.get_session(session_id)

        if not session:
            return None, "Session no longer exists."

        if not session.claude_session_id:
            return None, "Session has no resume id yet."

        await self.store.update_session(
            session.id,
            {"status": SessionStatus.RUNNING, "last_prompt": prompt},
        )

        return session, None

    async def stop_session(self, session_id: str) -> Session | None:
        """Stop a running session and mark it as idle."""
        session = self.store.get_session(session_id)
        if not session:
            return None

        await self.store.update_session(session.id, {"status": SessionStatus.IDLE})
        return session

    async def delete_session(self, session_id: str) -> bool:
        """Delete a session and all its data."""
        return await self.store.delete_session(session_id)

    async def mark_session_completed(
        self, session_id: str, error: str | None = None
    ) -> None:
        """Mark a session as completed or errored."""
        status = SessionStatus.ERROR if error else SessionStatus.COMPLETED
        await self.store.update_session(session_id, {"status": status})

    async def mark_session_error(self, session_id: str, error: str) -> None:
        """Mark a session as errored."""
        await self.store.update_session(session_id, {"status": SessionStatus.ERROR})

    async def update_claude_session_id(
        self, session_id: str, claude_session_id: str
    ) -> None:
        """Update the Claude SDK session ID for resume capability."""
        await self.store.update_session(
            session_id, {"claude_session_id": claude_session_id}
        )

    async def get_session_history(
        self, session_id: str
    ) -> tuple[Any, list[dict[str, Any]]] | None:
        """Get session with its message history."""
        return await self.store.get_session_history(session_id)

    async def list_sessions(self) -> list[Any]:
        """List all sessions."""
        return await self.store.list_sessions()

    def get_session(self, session_id: str) -> Session | None:
        """Get a session by ID from memory."""
        return self.store.get_session(session_id)

    async def record_message(self, session_id: str, message: dict[str, Any]) -> None:
        """Record a message for a session."""
        await self.store.record_message(session_id, message)
