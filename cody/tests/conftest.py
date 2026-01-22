"""Pytest configuration and fixtures."""

import asyncio
import tempfile
from pathlib import Path

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient

from cody.main import app, store, manager, handler
from cody.sessions.store import SessionStore
from cody.websocket.manager import ConnectionManager
from cody.websocket.handler import WebSocketHandler


@pytest.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for each test case."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest_asyncio.fixture
async def temp_db():
    """Create a temporary database for testing."""
    with tempfile.TemporaryDirectory() as tmpdir:
        db_path = Path(tmpdir) / "test_sessions.db"
        store = SessionStore(db_path)
        await store.initialize()
        yield store
        await store.close()


@pytest_asyncio.fixture
async def session_store(temp_db):
    """Provide a session store for testing."""
    return temp_db


@pytest.fixture
def connection_manager():
    """Provide a connection manager for testing."""
    return ConnectionManager()


@pytest_asyncio.fixture
async def websocket_handler(session_store, connection_manager):
    """Provide a WebSocket handler for testing."""
    handler = WebSocketHandler(session_store, connection_manager)
    yield handler
    await handler.cleanup()


@pytest_asyncio.fixture
async def test_client():
    """Provide an async test client for the FastAPI app."""
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test"
    ) as client:
        yield client
