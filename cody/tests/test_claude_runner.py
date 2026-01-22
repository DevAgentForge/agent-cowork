"""Tests for Claude runner."""

import pytest
from unittest.mock import AsyncMock, patch

from cody.claude.runner import ClaudeRunner
from cody.sessions.models import Session, SessionStatus


@pytest.fixture
def mock_session():
    """Create a mock session for testing."""
    return Session(
        id="test-session-id",
        title="Test Session",
        status=SessionStatus.RUNNING,
        cwd="/tmp/test",
    )


@pytest.fixture
def mock_callbacks():
    """Create mock callback functions."""
    return {
        "on_message": AsyncMock(),
        "on_status": AsyncMock(),
        "on_session_update": AsyncMock(),
        "on_permission_request": AsyncMock(return_value={"behavior": "allow"}),
    }


def test_runner_creation(mock_session, mock_callbacks):
    """Test creating a ClaudeRunner instance."""
    runner = ClaudeRunner(
        session=mock_session,
        prompt="Test prompt",
        resume_session_id=None,
        **mock_callbacks,
    )

    assert runner.session == mock_session
    assert runner.prompt == "Test prompt"
    assert runner.resume_session_id is None


def test_runner_abort(mock_session, mock_callbacks):
    """Test aborting a runner."""
    runner = ClaudeRunner(
        session=mock_session,
        prompt="Test prompt",
        resume_session_id=None,
        **mock_callbacks,
    )

    # Abort should not raise
    runner.abort()
    assert runner._abort_event.is_set()


@pytest.mark.asyncio
async def test_can_use_tool_auto_approve(mock_session, mock_callbacks):
    """Test that non-AskUserQuestion tools are auto-approved."""
    runner = ClaudeRunner(
        session=mock_session,
        prompt="Test prompt",
        resume_session_id=None,
        **mock_callbacks,
    )

    result = await runner.can_use_tool("Bash", {"command": "ls"})

    assert result["behavior"] == "allow"
    assert result["updatedInput"] == {"command": "ls"}


@pytest.mark.asyncio
async def test_can_use_tool_ask_user_question(mock_session, mock_callbacks):
    """Test that AskUserQuestion triggers permission request."""
    runner = ClaudeRunner(
        session=mock_session,
        prompt="Test prompt",
        resume_session_id=None,
        **mock_callbacks,
    )

    result = await runner.can_use_tool("AskUserQuestion", {"question": "Yes or no?"})

    # Should have called the permission request callback
    mock_callbacks["on_permission_request"].assert_called_once()
    assert result["behavior"] == "allow"


def test_resolve_permission(mock_session, mock_callbacks):
    """Test resolving a pending permission."""
    runner = ClaudeRunner(
        session=mock_session,
        prompt="Test prompt",
        resume_session_id=None,
        **mock_callbacks,
    )

    # Add a pending permission
    import asyncio
    future = asyncio.Future()
    runner._pending_permissions["test-tool-id"] = future

    # Resolve it
    runner.resolve_permission("test-tool-id", {"behavior": "allow"})

    assert future.done()
    assert future.result() == {"behavior": "allow"}


def test_abort_clears_pending_permissions(mock_session, mock_callbacks):
    """Test that abort clears all pending permissions."""
    runner = ClaudeRunner(
        session=mock_session,
        prompt="Test prompt",
        resume_session_id=None,
        **mock_callbacks,
    )

    # Add pending permissions
    import asyncio
    future1 = asyncio.Future()
    future2 = asyncio.Future()
    runner._pending_permissions["tool-1"] = future1
    runner._pending_permissions["tool-2"] = future2

    # Abort
    runner.abort()

    # All futures should be resolved with deny
    assert future1.done()
    assert future2.done()
    assert future1.result()["behavior"] == "deny"
    assert future2.result()["behavior"] == "deny"
    assert len(runner._pending_permissions) == 0
