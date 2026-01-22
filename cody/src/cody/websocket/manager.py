"""WebSocket connection manager."""

import asyncio
import logging
from typing import TYPE_CHECKING

from fastapi import WebSocket

if TYPE_CHECKING:
    from .events import ServerEvent

logger = logging.getLogger(__name__)


class ConnectionManager:
    """Manages WebSocket connections."""

    def __init__(self):
        self._connections: set[WebSocket] = set()
        self._lock = asyncio.Lock()

    async def connect(self, websocket: WebSocket) -> None:
        """Accept and register a new WebSocket connection."""
        await websocket.accept()
        async with self._lock:
            self._connections.add(websocket)
        logger.info(f"WebSocket connected. Total connections: {len(self._connections)}")

    async def disconnect(self, websocket: WebSocket) -> None:
        """Remove a WebSocket connection."""
        async with self._lock:
            self._connections.discard(websocket)
        logger.info(
            f"WebSocket disconnected. Total connections: {len(self._connections)}"
        )

    async def broadcast(self, event: "ServerEvent") -> None:
        """Send an event to all connected clients."""
        if not self._connections:
            logger.warning("No connections to broadcast to")
            return

        message = event.model_dump_json()
        # Log sample of message content for debugging
        if event.type == "stream.message" and len(message) < 500:
            logger.debug(f"Message content: {message[:200]}...")
        logger.info(f"Broadcasting message ({len(message)} bytes) to {len(self._connections)} clients")
        disconnected: list[WebSocket] = []

        async with self._lock:
            connections = list(self._connections)

        for websocket in connections:
            try:
                await websocket.send_text(message)
            except Exception as e:
                logger.warning(f"Failed to send to WebSocket: {e}")
                disconnected.append(websocket)

        # Clean up disconnected sockets
        if disconnected:
            async with self._lock:
                for ws in disconnected:
                    self._connections.discard(ws)

    async def send_to(self, websocket: WebSocket, event: "ServerEvent") -> None:
        """Send an event to a specific client."""
        try:
            await websocket.send_text(event.model_dump_json())
        except Exception as e:
            logger.warning(f"Failed to send to WebSocket: {e}")

    @property
    def connection_count(self) -> int:
        """Get the number of active connections."""
        return len(self._connections)
