from __future__ import annotations

import logging

from fastapi import WebSocket
from starlette.websockets import WebSocketDisconnect

logger = logging.getLogger(__name__)


class WebSocketManager:
    def __init__(self) -> None:
        self._connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket) -> None:
        await websocket.accept()
        self._connections.append(websocket)
        logger.info("Unreal websocket connected. active_connections=%s", len(self._connections))

    def disconnect(self, websocket: WebSocket) -> None:
        if websocket in self._connections:
            self._connections.remove(websocket)
            logger.info(
                "Unreal websocket disconnected. active_connections=%s",
                len(self._connections),
            )

    async def broadcast(self, message: dict) -> None:
        disconnected_clients: list[WebSocket] = []
        logger.info(
            "Broadcasting event=%s to %s connection(s)",
            message.get("event"),
            len(self._connections),
        )

        for connection in self._connections:
            try:
                await connection.send_json(message)
            except (WebSocketDisconnect, RuntimeError):
                disconnected_clients.append(connection)
                logger.warning("Failed to send websocket message")

        for client in disconnected_clients:
            self.disconnect(client)

    @property
    def active_connections(self) -> int:
        return len(self._connections)


ws_manager = WebSocketManager()
