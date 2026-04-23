from __future__ import annotations

from typing import Literal, Optional, Union
from uuid import uuid4

from pydantic import BaseModel, Field


ShapeType = Literal["cube", "sphere", "cylinder"]
ColorType = Union[str, list[int]]


class ObjectCreate(BaseModel):
    shape: ShapeType
    color: ColorType
    size: float = Field(..., gt=0)
    position: Optional[Position] = None
    rotation: Optional[Rotation] = None

class ObjectUpdate(BaseModel):
    shape: Optional[ShapeType] = None
    color: Optional[ColorType] = None
    size: Optional[float] = Field(default=None, gt=0)
    position: Optional[Position] = None
    rotation: Optional[Rotation] = None


class Position(BaseModel):
    x: Optional[float] = 0.0
    y: Optional[float] = 0.0
    z: Optional[float] = 0.0


class Rotation(BaseModel):
    roll: Optional[float] = 0.0
    pitch: Optional[float] = 0.0
    yaw: Optional[float] = 0.0
   


class Object3D(BaseModel):
    id: str
    shape: ShapeType
    color: ColorType
    size: float = Field(..., gt=0)
    position: Optional[Position] = None
    rotation: Optional[Rotation] = None


class WebSocketEvent(BaseModel):
    event: Literal["object_created", "object_updated", "object_deleted"]
    payload: dict


def generate_object_id() -> str:
    return str(uuid4())
