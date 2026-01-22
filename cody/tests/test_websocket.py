"""Tests for WebSocket functionality."""

import json
import pytest
from unittest.mock import AsyncMock, MagicMock

from fastapi import WebSocket

from cody.websocket.events import (
    ServerEvent,
    SessionStatusPayload,
    SessionListPayload,
)
from cody.sessions.models import SessionStatus


@pytest.mark.asyncio
async def test_connection_manager_connect(connection_manager):
    """Test connecting a WebSocket."""
    mock_ws = AsyncMock(spec=WebSocket)

    await connection_manager.connect(mock_ws)

    mock_ws.accept.assert_called_once()
    assert connection_manager.connection_count == 1


@pytest.mark.asyncio
async def test_connection_manager_disconnect(connection_manager):
    """Test disconnecting a WebSocket."""
    mock_ws = AsyncMock(spec=WebSocket)

    await connection_manager.connect(mock_ws)
    assert connection_manager.connection_count == 1

    await connection_manager.disconnect(mock_ws)
    assert connection_manager.connection_count == 0


@pytest.mark.asyncio
async def test_connection_manager_broadcast(connection_manager):
    """Test broadcasting to all connections."""
    mock_ws1 = AsyncMock(spec=WebSocket)
    mock_ws2 = AsyncMock(spec=WebSocket)

    await connection_manager.connect(mock_ws1)
    await connection_manager.connect(mock_ws2)

    event = ServerEvent(
        type="session.status",
        payload=SessionStatusPayload(
            session_id="test-id",
            status=SessionStatus.RUNNING,
        )
    )

    await connection_manager.broadcast(event)

    assert mock_ws1.send_text.called
    assert mock_ws2.send_text.called


@pytest.mark.asyncio
async def test_websocket_handler_session_list(websocket_handler, session_store):
    """Test handling session.list event."""
    # Create some sessions
    await session_store.create_session(title="Session 1")
    await session_store.create_session(title="Session 2")

    # Mock WebSocket
    mock_ws = AsyncMock(spec=WebSocket)
    await websocket_handler.manager.connect(mock_ws)

    # Handle session.list message
    await websocket_handler._handle_message(
        mock_ws,
        json.dumps({"type": "session.list"})
    )

    # Verify response was sent
    assert mock_ws.send_text.called
    sent_data = json.loads(mock_ws.send_text.call_args[0][0])
    assert sent_data["type"] == "session.list"
    assert len(sent_data["payload"]["sessions"]) >= 2


@pytest.mark.asyncio
async def test_websocket_handler_session_start(websocket_handler, session_store):
    """Test handling session.start event."""
    # Mock WebSocket
    mock_ws = AsyncMock(spec=WebSocket)
    await websocket_handler.manager.connect(mock_ws)

    # Handle session.start message
    await websocket_handler._handle_message(
        mock_ws,
        json.dumps({
            "type": "session.start",
            "payload": {
                "title": "New Session",
                "prompt": "Hello, Claude!",
                "cwd": "/tmp/test"
            }
        })
    )

    # Verify status event was sent
    assert mock_ws.send_text.called


@pytest.mark.asyncio
async def test_websocket_handler_session_delete(websocket_handler, session_store):
    """Test handling session.delete event."""
    # Create a session first
    session = await session_store.create_session(title="To Delete")

    # Mock WebSocket
    mock_ws = AsyncMock(spec=WebSocket)
    await websocket_handler.manager.connect(mock_ws)

    # Handle session.delete message
    await websocket_handler._handle_message(
        mock_ws,
        json.dumps({
            "type": "session.delete",
            "payload": {
                "sessionId": session.id
            }
        })
    )

    # Verify session was deleted
    assert session_store.get_session(session.id) is None

    # Verify deleted event was sent
    assert mock_ws.send_text.called
    sent_data = json.loads(mock_ws.send_text.call_args[0][0])
    assert sent_data["type"] == "session.deleted"
    assert sent_data["payload"]["sessionId"] == session.id


@pytest.mark.asyncio
async def test_websocket_handler_session_history(websocket_handler, session_store):
    """Test handling session.history event."""
    # Create a session with messages
    session = await session_store.create_session(title="History Test")
    await session_store.record_message(session.id, {
        "type": "user_prompt",
        "prompt": "Hello"
    })

    # Mock WebSocket
    mock_ws = AsyncMock(spec=WebSocket)
    await websocket_handler.manager.connect(mock_ws)

    # Handle session.history message
    await websocket_handler._handle_message(
        mock_ws,
        json.dumps({
            "type": "session.history",
            "payload": {
                "sessionId": session.id
            }
        })
    )

    # Verify history was sent
    assert mock_ws.send_text.called
    sent_data = json.loads(mock_ws.send_text.call_args[0][0])
    assert sent_data["type"] == "session.history"
    assert sent_data["payload"]["sessionId"] == session.id
    assert len(sent_data["payload"]["messages"]) == 1
