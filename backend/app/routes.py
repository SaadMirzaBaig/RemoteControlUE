from __future__ import annotations

from fastapi import APIRouter, HTTPException, WebSocket
from starlette.websockets import WebSocketDisconnect

from .models import ObjectCreate, ObjectUpdate
from .state import store
from .websocket_manager import ws_manager

router = APIRouter()


@router.get("/health")
async def health() -> dict:
    return {"status": "ok"}


@router.get("/objects")
async def list_objects() -> list[dict]:
    return [obj.model_dump() for obj in store.list_objects()]


@router.get("/objects/{object_id}")
async def get_object(object_id: str) -> dict:
    obj = store.get_object(object_id)
    if obj is None:
        raise HTTPException(status_code=404, detail="Object not found")
    return obj.model_dump()


@router.post("/objects", status_code=201)
async def create_object(payload: ObjectCreate) -> dict:
    obj = store.create_object(payload)
    await ws_manager.broadcast(
        {"event": "object_created", "payload": obj.model_dump()}
    )
    return obj.model_dump()


@router.put("/objects/{object_id}")
async def update_object(object_id: str, payload: ObjectUpdate) -> dict:
    updated = store.update_object(object_id, payload)
    if updated is None:
        raise HTTPException(status_code=404, detail="Object not found")

    await ws_manager.broadcast(
        {"event": "object_updated", "payload": updated.model_dump()}
    )
    return updated.model_dump()


@router.delete("/objects/{object_id}", status_code=204)
async def delete_object(object_id: str) -> None:
    deleted = store.delete_object(object_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Object not found")

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
        ws_manager.disconnect(websocket)
