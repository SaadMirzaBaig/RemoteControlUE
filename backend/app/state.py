from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Dict, List

from .models import Object3D, ObjectCreate, ObjectUpdate, generate_object_id

logger = logging.getLogger(__name__)


class ObjectStore:
    def __init__(self) -> None:
        self._objects: Dict[str, Object3D] = {}
        self._storage_path = Path(__file__).resolve().parents[1] / "data" / "objects.json"
        self._load_from_disk()

    def list_objects(self) -> List[Object3D]:
        return list(self._objects.values())

    def get_object(self, object_id: str) -> Object3D | None:
        return self._objects.get(object_id)

    def create_object(self, data: ObjectCreate) -> Object3D:
        object_id = generate_object_id()
        obj = Object3D(id=object_id, **data.model_dump())
        self._objects[object_id] = obj
        self._save_to_disk()
        logger.info("Object created and saved to disk: id=%s", object_id)
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
        self._save_to_disk()
        logger.info("Object updated and saved to disk: id=%s", object_id)
        return updated

    def delete_object(self, object_id: str) -> bool:
        if object_id not in self._objects:
            return False
        del self._objects[object_id]
        self._save_to_disk()
        logger.info("Object deleted and saved to disk: id=%s", object_id)
        return True

    def _load_from_disk(self) -> None:
        if not self._storage_path.exists():
            logger.info("saved objects file not found")
            return

        try:
            content = json.loads(self._storage_path.read_text(encoding="utf-8"))
            if not isinstance(content, list):
                logger.warning("Invalid format in saved objects file")
                return

            for raw_object in content:
                obj = Object3D(**raw_object)
                self._objects[obj.id] = obj
            logger.info(
                "Loaded %s objects from saved objects file",
                len(self._objects),
            )
        except (json.JSONDecodeError, OSError, TypeError, ValueError):
            # Keep backend available even if persistence file is corrupted.
            self._objects = {}
            logger.exception("Failed to load saved objects file")

    def _save_to_disk(self) -> None:
        self._storage_path.parent.mkdir(parents=True, exist_ok=True)
        serialized = [obj.model_dump() for obj in self._objects.values()]
        self._storage_path.write_text(
            json.dumps(serialized, indent=2),
            encoding="utf-8",
        )
        logger.info("Saved %s objects to saved objects file", len(serialized))


store = ObjectStore()
