from __future__ import annotations

from typing import Dict, List

from .models import Object3D, ObjectCreate, ObjectUpdate, generate_object_id


class ObjectStore:
    def __init__(self) -> None:
        self._objects: Dict[str, Object3D] = {}

    def list_objects(self) -> List[Object3D]:
        return list(self._objects.values())

    def get_object(self, object_id: str) -> Object3D | None:
        return self._objects.get(object_id)

    def create_object(self, data: ObjectCreate) -> Object3D:
        object_id = generate_object_id()
        obj = Object3D(id=object_id, **data.model_dump())
        self._objects[object_id] = obj
        return obj

    def update_object(self, object_id: str, data: ObjectUpdate) -> Object3D | None:
        existing = self._objects.get(object_id)
        if existing is None:
            return None

        # Only overwrite fields that were explicitly provided in the request.
        patch = data.model_dump(exclude_none=True)
        merged = existing.model_dump()
        merged.update(patch)

        updated = Object3D(**merged)
        self._objects[object_id] = updated
        return updated

    def delete_object(self, object_id: str) -> bool:
        if object_id not in self._objects:
            return False
        del self._objects[object_id]
        return True


store = ObjectStore()
