"""Session storage using aiosqlite - port of session-store.ts."""

import json
import uuid
from pathlib import Path
from typing import Any

import aiosqlite

from .models import Session, SessionStatus, StoredSession


class SessionStore:
    """Async session storage using SQLite."""

    def __init__(self, db_path: str | Path):
        self.db_path = Path(db_path)
        self._db: aiosqlite.Connection | None = None
        self._sessions: dict[str, Session] = {}

    async def initialize(self) -> None:
        """Initialize the database connection and schema."""
        # Ensure parent directory exists
        self.db_path.parent.mkdir(parents=True, exist_ok=True)

        self._db = await aiosqlite.connect(self.db_path)
        await self._db.execute("PRAGMA journal_mode = WAL;")

        # Create sessions table
        await self._db.execute("""
            CREATE TABLE IF NOT EXISTS sessions (
                id TEXT PRIMARY KEY,
                title TEXT,
                claude_session_id TEXT,
                status TEXT NOT NULL,
                cwd TEXT,
                allowed_tools TEXT,
                last_prompt TEXT,
                created_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL
            )
        """)

        # Create messages table
        await self._db.execute("""
            CREATE TABLE IF NOT EXISTS messages (
                id TEXT PRIMARY KEY,
                session_id TEXT NOT NULL,
                data TEXT NOT NULL,
                created_at INTEGER NOT NULL,
                FOREIGN KEY (session_id) REFERENCES sessions(id)
            )
        """)

        # Create index
        await self._db.execute(
            "CREATE INDEX IF NOT EXISTS messages_session_id ON messages(session_id)"
        )

        await self._db.commit()

        # Load existing sessions into memory
        await self._load_sessions()

    async def _load_sessions(self) -> None:
        """Load all sessions from database into memory."""
        if not self._db:
            return

        cursor = await self._db.execute("""
            SELECT id, title, claude_session_id, status, cwd, allowed_tools, last_prompt
            FROM sessions
        """)
        rows = await cursor.fetchall()

        for row in rows:
            session = Session(
                id=row[0],
                title=row[1] or "",
                claude_session_id=row[2],
                status=SessionStatus(row[3]),
                cwd=row[4],
                allowed_tools=row[5],
                last_prompt=row[6],
            )
            self._sessions[session.id] = session

    async def create_session(
        self,
        title: str,
        cwd: str | None = None,
        allowed_tools: str | None = None,
        prompt: str | None = None,
    ) -> Session:
        """Create a new session."""
        if not self._db:
            raise RuntimeError("SessionStore not initialized")

        session_id = str(uuid.uuid4())
        now = int(__import__("time").time() * 1000)

        session = Session(
            id=session_id,
            title=title,
            status=SessionStatus.IDLE,
            cwd=cwd,
            allowed_tools=allowed_tools,
            last_prompt=prompt,
        )

        self._sessions[session_id] = session

        await self._db.execute(
            """
            INSERT INTO sessions
                (id, title, claude_session_id, status, cwd, allowed_tools, last_prompt, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                session_id,
                title,
                None,
                session.status.value,
                cwd,
                allowed_tools,
                prompt,
                now,
                now,
            ),
        )
        await self._db.commit()

        return session

    def get_session(self, session_id: str) -> Session | None:
        """Get a session by ID from memory."""
        return self._sessions.get(session_id)

    async def list_sessions(self) -> list[StoredSession]:
        """List all sessions ordered by updated_at desc."""
        if not self._db:
            raise RuntimeError("SessionStore not initialized")

        cursor = await self._db.execute("""
            SELECT id, title, claude_session_id, status, cwd, allowed_tools, last_prompt, created_at, updated_at
            FROM sessions
            ORDER BY updated_at DESC
        """)
        rows = await cursor.fetchall()

        return [
            StoredSession(
                id=row[0],
                title=row[1] or "",
                claude_session_id=row[2],
                status=SessionStatus(row[3]),
                cwd=row[4],
                allowed_tools=row[5],
                last_prompt=row[6],
                created_at=row[7],
                updated_at=row[8],
            )
            for row in rows
        ]

    async def list_recent_cwds(self, limit: int = 8) -> list[str]:
        """List recent working directories."""
        if not self._db:
            raise RuntimeError("SessionStore not initialized")

        cursor = await self._db.execute(
            """
            SELECT cwd, MAX(updated_at) as latest
            FROM sessions
            WHERE cwd IS NOT NULL AND TRIM(cwd) != ''
            GROUP BY cwd
            ORDER BY latest DESC
            LIMIT ?
            """,
            (limit,),
        )
        rows = await cursor.fetchall()
        return [row[0] for row in rows]

    async def get_session_history(
        self, session_id: str
    ) -> tuple[StoredSession, list[dict[str, Any]]] | None:
        """Get session with its message history."""
        if not self._db:
            raise RuntimeError("SessionStore not initialized")

        # Get session
        cursor = await self._db.execute(
            """
            SELECT id, title, claude_session_id, status, cwd, allowed_tools, last_prompt, created_at, updated_at
            FROM sessions
            WHERE id = ?
            """,
            (session_id,),
        )
        row = await cursor.fetchone()

        if not row:
            return None

        session = StoredSession(
            id=row[0],
            title=row[1] or "",
            claude_session_id=row[2],
            status=SessionStatus(row[3]),
            cwd=row[4],
            allowed_tools=row[5],
            last_prompt=row[6],
            created_at=row[7],
            updated_at=row[8],
        )

        # Get messages
        cursor = await self._db.execute(
            """
            SELECT data FROM messages
            WHERE session_id = ?
            ORDER BY created_at ASC
            """,
            (session_id,),
        )
        message_rows = await cursor.fetchall()
        messages = [json.loads(row[0]) for row in message_rows]

        return session, messages

    async def update_session(
        self, session_id: str, updates: dict[str, Any]
    ) -> Session | None:
        """Update a session."""
        session = self._sessions.get(session_id)
        if not session:
            return None

        # Update in-memory session
        for key, value in updates.items():
            if hasattr(session, key):
                setattr(session, key, value)

        # Persist to database
        await self._persist_session(session_id, updates)

        return session

    async def _persist_session(self, session_id: str, updates: dict[str, Any]) -> None:
        """Persist session updates to database."""
        if not self._db:
            return

        # Map Python field names to database column names
        column_map = {
            "claude_session_id": "claude_session_id",
            "status": "status",
            "cwd": "cwd",
            "allowed_tools": "allowed_tools",
            "last_prompt": "last_prompt",
            "title": "title",
        }

        fields = []
        values = []

        for key, value in updates.items():
            column = column_map.get(key)
            if column:
                fields.append(f"{column} = ?")
                if key == "status" and isinstance(value, SessionStatus):
                    values.append(value.value)
                else:
                    values.append(value)

        if not fields:
            return

        fields.append("updated_at = ?")
        values.append(int(__import__("time").time() * 1000))
        values.append(session_id)

        await self._db.execute(
            f"UPDATE sessions SET {', '.join(fields)} WHERE id = ?",
            values,
        )
        await self._db.commit()

    async def record_message(self, session_id: str, message: dict[str, Any]) -> None:
        """Record a message for a session."""
        if not self._db:
            return

        message_id = message.get("uuid") or str(uuid.uuid4())
        now = int(__import__("time").time() * 1000)

        await self._db.execute(
            """
            INSERT OR IGNORE INTO messages (id, session_id, data, created_at)
            VALUES (?, ?, ?, ?)
            """,
            (message_id, session_id, json.dumps(message), now),
        )
        await self._db.commit()

    async def delete_session(self, session_id: str) -> bool:
        """Delete a session and its messages."""
        if not self._db:
            return False

        existing = self._sessions.pop(session_id, None)

        await self._db.execute(
            "DELETE FROM messages WHERE session_id = ?", (session_id,)
        )
        cursor = await self._db.execute(
            "DELETE FROM sessions WHERE id = ?", (session_id,)
        )
        await self._db.commit()

        return cursor.rowcount > 0 or existing is not None

    async def close(self) -> None:
        """Close the database connection."""
        if self._db:
            await self._db.close()
            self._db = None
