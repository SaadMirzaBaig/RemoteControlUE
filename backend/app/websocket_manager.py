from __future__ import annotations

from fastapi import WebSocket
from starlette.websockets import WebSocketDisconnect


class WebSocketManager:
    def __init__(self) -> None:
        self._connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket) -> None:
        await websocket.accept()
        self._connections.append(websocket)

    def disconnect(self, websocket: WebSocket) -> None:
        if websocket in self._connections:
            self._connections.remove(websocket)

    async def broadcast(self, message: dict) -> None:
        disconnected_clients: list[WebSocket] = []

        for connection in self._connections:
            try:
                await connection.send_json(message)
            except (WebSocketDisconnect, RuntimeError):
                disconnected_clients.append(connection)

        for client in disconnected_clients:
            self.disconnect(client)

    @property
    def active_connections(self) -> int:
        return len(self._connections)


ws_manager = WebSocketManager()
