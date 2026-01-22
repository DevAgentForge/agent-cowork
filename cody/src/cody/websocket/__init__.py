"""WebSocket module for real-time communication."""

from .events import ClientEvent, ServerEvent
from .handler import WebSocketHandler
from .manager import ConnectionManager

__all__ = ["ClientEvent", "ConnectionManager", "ServerEvent", "WebSocketHandler"]
