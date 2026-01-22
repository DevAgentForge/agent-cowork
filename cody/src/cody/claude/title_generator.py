"""Session title generation using Claude SDK."""

import logging
import os

from claude_agent_sdk import ClaudeAgentOptions, query

logger = logging.getLogger(__name__)


async def generate_session_title(user_input: str | None) -> str:
    """Generate a session title from user input using Claude.

    Port of generateSessionTitle from util.ts.
    """
    if not user_input:
        return "New Session"

    try:
        prompt = (
            "Please analyze the following user input to generate a short but "
            "clearly title to identify this conversation theme:\n"
            f"{user_input}\n"
            "Directly output the title, do not include any other content"
        )

        options = ClaudeAgentOptions(
            model=os.getenv("ANTHROPIC_MODEL", "claude-sonnet-4-20250514"),
        )

        result_text = ""
        async for message in query(prompt=prompt, options=options):
            if (
                hasattr(message, "type")
                and message.type == "result"
                and hasattr(message, "result")
            ):
                result_text = message.result
                break

        if result_text:
            return result_text

        return "New Session"

    except Exception as e:
        logger.warning(f"Failed to generate session title: {e}")

        # Fallback: create title from first few words
        if user_input:
            words = user_input.strip().split()[:5]
            title = " ".join(words).upper()
            if len(user_input.strip().split()) > 5:
                title += "..."
            return title

        return "New Session"
