"""FastAPI application entry point for Cody backend."""

import logging
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, Query, WebSocket
from fastapi.middleware.cors import CORSMiddleware

from .auth import rest_auth, websocket_auth
from .config import settings
from .sessions.store import SessionStore
from .websocket.handler import WebSocketHandler
from .websocket.manager import ConnectionManager

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

# Global instances
store: SessionStore | None = None
manager: ConnectionManager | None = None
handler: WebSocketHandler | None = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler."""
    global store, manager, handler

    # Initialize on startup
    logger.info(f"Starting Cody backend on {settings.host}:{settings.port}")
    logger.info(f"Database path: {settings.database_path}")

    store = SessionStore(settings.database_path)
    await store.initialize()

    manager = ConnectionManager()
    handler = WebSocketHandler(store, manager)

    logger.info("Cody backend initialized successfully")

    yield

    # Cleanup on shutdown
    logger.info("Shutting down Cody backend")
    if handler:
        await handler.cleanup()
    if store:
        await store.close()


app = FastAPI(
    title="Cody",
    description="Python backend for Agent Cowork using Claude Agent SDK",
    version="0.1.0",
    lifespan=lifespan,
)

# Add CORS middleware for development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "connections": manager.connection_count if manager else 0,
    }


@app.get("/api/recent-cwds", dependencies=[Depends(rest_auth)])
async def get_recent_cwds(limit: int = Query(default=8, ge=1, le=20)):
    """Get recent working directories."""
    if not store:
        return {"cwds": []}
    cwds = await store.list_recent_cwds(limit)
    return {"cwds": cwds}


@app.websocket("/ws")
async def websocket_endpoint(
    websocket: WebSocket,
    token: str | None = Query(None),
):
    """WebSocket endpoint for real-time communication."""
    # Authenticate
    if not await websocket_auth(websocket, token):
        return

    if not handler:
        await websocket.accept()
        await websocket.close(code=1011)
        return

    await handler.handle_connection(websocket)


def run():
    """Run the application using uvicorn."""
    import uvicorn

    uvicorn.run(
        "cody.main:app",
        host=settings.host,
        port=settings.port,
        reload=True,
    )


if __name__ == "__main__":
    run()
