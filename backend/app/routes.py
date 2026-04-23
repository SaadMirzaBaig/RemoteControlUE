from __future__ import annotations

import logging

from fastapi import APIRouter, HTTPException, WebSocket
from starlette.websockets import WebSocketDisconnect

from .models import ObjectCreate, ObjectUpdate
from .state import store
from .websocket_manager import ws_manager

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("/health")
async def health() -> dict:
    logger.info("Server health check requested")
    return {"status": "ok"}


@router.get("/objects")
async def list_objects() -> list[dict]:
    logger.info("Listing all the objects")
    return [obj.model_dump() for obj in store.list_objects()]


@router.post("/objects", status_code=201)
async def create_object(payload: ObjectCreate) -> dict:
    obj = store.create_object(payload)
    logger.info("Object created id=%s", obj.id)
    await ws_manager.broadcast(
        {"event": "object_created", "payload": obj.model_dump()}
    )
    return obj.model_dump()


@router.put("/objects/{object_id}")
async def update_object(object_id: str, payload: ObjectUpdate) -> dict:
    updated = store.update_object(object_id, payload)
    if updated is None:
        logger.warning("Object not found on update: id=%s", object_id)
        raise HTTPException(status_code=404, detail="Object not found")
    logger.info("Object updated id=%s", object_id)

    await ws_manager.broadcast(
        {"event": "object_updated", "payload": updated.model_dump()}
    )
    return updated.model_dump()


@router.delete("/objects/{object_id}", status_code=204)
async def delete_object(object_id: str) -> None:
    deleted = store.delete_object(object_id)
    if not deleted:
        logger.warning("Object not found on delete: id=%s", object_id)
        raise HTTPException(status_code=404, detail="Object not found")
    logger.info("Object deleted id=%s", object_id)

    await ws_manager.broadcast(
        {"event": "object_deleted", "payload": {"id": object_id}}
    )


@router.websocket("/ws/unreal")
async def unreal_socket(websocket: WebSocket) -> None:
    await ws_manager.connect(websocket)
    try:
        while True:
            # Keep the socket open; ignore messages from Unreal for this phase.
            await websocket.receive_text()
    except WebSocketDisconnect:
        logger.info("Unreal websocket disconnected from route handler")
        ws_manager.disconnect(websocket)
