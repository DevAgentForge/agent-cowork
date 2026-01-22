"""Tests for session storage."""

import pytest

from cody.sessions.models import SessionStatus


@pytest.mark.asyncio
async def test_create_session(session_store):
    """Test creating a new session."""
    session = await session_store.create_session(
        title="Test Session",
        cwd="/tmp/test",
        prompt="Hello, world!",
    )

    assert session.id is not None
    assert session.title == "Test Session"
    assert session.cwd == "/tmp/test"
    assert session.last_prompt == "Hello, world!"
    assert session.status == SessionStatus.IDLE


@pytest.mark.asyncio
async def test_get_session(session_store):
    """Test retrieving a session by ID."""
    session = await session_store.create_session(
        title="Test Session",
        cwd="/tmp/test",
    )

    retrieved = session_store.get_session(session.id)
    assert retrieved is not None
    assert retrieved.id == session.id
    assert retrieved.title == session.title


@pytest.mark.asyncio
async def test_get_nonexistent_session(session_store):
    """Test retrieving a non-existent session."""
    retrieved = session_store.get_session("nonexistent-id")
    assert retrieved is None


@pytest.mark.asyncio
async def test_list_sessions(session_store):
    """Test listing all sessions."""
    await session_store.create_session(title="Session 1")
    await session_store.create_session(title="Session 2")
    await session_store.create_session(title="Session 3")

    sessions = await session_store.list_sessions()
    assert len(sessions) >= 3
    # Verify all sessions are present
    titles = {s.title for s in sessions}
    assert "Session 1" in titles
    assert "Session 2" in titles
    assert "Session 3" in titles


@pytest.mark.asyncio
async def test_update_session(session_store):
    """Test updating a session."""
    session = await session_store.create_session(title="Original Title")

    updated = await session_store.update_session(
        session.id,
        {"status": SessionStatus.RUNNING, "title": "Updated Title"}
    )

    assert updated is not None
    assert updated.status == SessionStatus.RUNNING
    assert updated.title == "Updated Title"


@pytest.mark.asyncio
async def test_delete_session(session_store):
    """Test deleting a session."""
    session = await session_store.create_session(title="To Delete")

    result = await session_store.delete_session(session.id)
    assert result is True

    retrieved = session_store.get_session(session.id)
    assert retrieved is None


@pytest.mark.asyncio
async def test_delete_nonexistent_session(session_store):
    """Test deleting a non-existent session."""
    result = await session_store.delete_session("nonexistent-id")
    assert result is False


@pytest.mark.asyncio
async def test_record_and_get_messages(session_store):
    """Test recording and retrieving messages."""
    session = await session_store.create_session(title="Message Test")

    # Record some messages
    await session_store.record_message(session.id, {
        "type": "user_prompt",
        "prompt": "Hello"
    })
    await session_store.record_message(session.id, {
        "type": "assistant",
        "content": "Hi there!"
    })

    # Get session history
    result = await session_store.get_session_history(session.id)
    assert result is not None

    stored_session, messages = result
    assert stored_session.id == session.id
    assert len(messages) == 2
    assert messages[0]["type"] == "user_prompt"
    assert messages[1]["type"] == "assistant"


@pytest.mark.asyncio
async def test_list_recent_cwds(session_store):
    """Test listing recent working directories."""
    await session_store.create_session(title="Session 1", cwd="/home/user/project1")
    await session_store.create_session(title="Session 2", cwd="/home/user/project2")
    await session_store.create_session(title="Session 3", cwd="/home/user/project1")

    cwds = await session_store.list_recent_cwds(limit=5)
    assert len(cwds) >= 2
    # Verify all cwds are present
    assert "/home/user/project1" in cwds
    assert "/home/user/project2" in cwds
