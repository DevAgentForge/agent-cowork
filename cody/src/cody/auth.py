"""Token-based authentication for WebSocket and REST endpoints."""

import logging
import os
from typing import Annotated

from fastapi import Header, HTTPException, Query, WebSocket, status

logger = logging.getLogger(__name__)

# Get auth token from environment (set by Electron main process)
AUTH_TOKEN = os.getenv("AUTH_TOKEN")


async def verify_token(token: str | None) -> bool:
    """Verify the authentication token."""
    if not AUTH_TOKEN:
        # No auth if token not configured
        return True
    is_valid = token == AUTH_TOKEN
    if not is_valid:
        logger.warning("WebSocket auth failed: invalid token")
    return is_valid


async def websocket_auth(
    websocket: WebSocket,
    token: str | None = Query(None),
) -> bool:
    """Authenticate WebSocket connection.

    Returns True if authenticated, False otherwise.
    Note: WebSocket must be accepted before it can be closed.
    """
    if not await verify_token(token):
        # Must accept before closing
        await websocket.accept()
        await websocket.close(code=4001, reason="Invalid authentication token")
        return False
    return True


async def rest_auth(
    authorization: Annotated[str | None, Header()] = None,
) -> None:
    """Authenticate REST API requests."""
    token = None
    if authorization:
        # Support "Bearer <token>" format
        parts = authorization.split()
        if len(parts) == 2 and parts[0].lower() == "bearer":
            token = parts[1]
        else:
            token = authorization

    if not await verify_token(token):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token",
        )
