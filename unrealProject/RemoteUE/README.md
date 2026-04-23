# Unreal Engine Client (`RemoteUE`)

Unreal Engine 5 C++ client for the technical test.  
This project connects to the backend WebSocket, listens for object events, and keeps scene actors synchronized with backend state.

## Requirements

- Unreal Engine 5.x (Windows)
- Running backend server (default: `ws://127.0.0.1:8000/ws/unreal`)

## Open and Run

1. Start the backend first:
   - `cd backend`
   - `venv\Scripts\activate`
   - `pip install -r requirements.txt`
   - `uvicorn main:app --reload --host 0.0.0.0 --port 8000`
2. Start the frontend (new terminal):
   - `cd frontend`
   - `npm install`
   - `ng serve`
   - Open `http://localhost:4200`
3. Open `unrealProject/RemoteUE/RemoteUE.uproject` in Unreal Editor.
4. Build C++ modules when prompted.
5. Open `BasicMap` (already set as default startup map).
6. Press Play.

## Architecture (Unreal side)

- `Source/RemoteUE/ObjectManager.h` + `ObjectManager.cpp`
  - Handles WebSocket connection lifecycle.
  - Parses incoming JSON messages.
  - Dispatches events to create/update/delete logic.
  - Maintains `id -> AActor*` mapping via `ObjectMap`.
- Uses built-in UE basic meshes:
  - `cube` -> `/Engine/BasicShapes/Cube.Cube`
  - `sphere` -> `/Engine/BasicShapes/Sphere.Sphere`
  - `cylinder` -> `/Engine/BasicShapes/Cylinder.Cylinder`

## Supported WebSocket Messages

Endpoint:
- `ws://127.0.0.1:8000/ws/unreal`

Events handled:
- `object_created`
- `object_updated`
- `object_deleted`

Expected message format:

```json
{
  "event": "object_created",
  "payload": {
    "id": "uuid-string",
    "shape": "cube",
    "color": "red",
    "size": 1,
    "position": {
      "x": 200.0,
      "y": 0.0,
      "z": 50.0
    },
    "rotation": {
      "pitch": 0.0,
      "yaw": 45.0,
      "roll": 0.0
    }
  }
}
```

The same `payload` object shape is used for `object_updated` (all supported fields that are present are applied). `object_deleted` only requires `id` in the payload.

### ObjectData fields (inside JSON `"payload"`)

- `id` (string): unique logical id, used for actor mapping
- `shape` (string): `cube` | `sphere` | `cylinder`
- `color`:
  - string preset (`red`, `green`, `blue`, `yellow`, `black`, `white`, `orange`, `purple`)
  - or RGB array (example: `[255, 0, 0]`)
- `size` (number): **uniform scale** applied to the mesh in Unreal: the value is used as-is (1:1 with the engine; no extra division or remapping), so e.g. `1` is baseline scale. Values below `0.01` are clamped to `0.01`.
- `position` (object, optional): world location. Fields `x`, `y`, `z` (numbers). Omitted or partial fields default to `0.0` for that component, so the default position is the world origin `(0, 0, 0)`.
- `rotation` (object, optional): world rotation in degrees, Unreal order: `pitch`, `yaw`, `roll`. Omitted or partial fields default to `0.0` for that component, so the default rotation is zero.

Position and rotation are intended to be driven from the web frontend; the backend forwards them in the same payload as `shape` / `color` / `size`.


## Behavior

- On `object_created`:
  - Spawns a new `AStaticMeshActor` at `position` and `rotation` from the payload (or origin / identity if those objects are missing).
  - If the id already exists, previous actor is destroyed and replaced.
- On `object_updated`:
  - Updates mesh, material, scale, transform, and any other provided fields for the existing actor with matching id.
- On `object_deleted`:
  - Destroys actor and removes mapping entry.

## Notes and Current Limitations

- WebSocket URL is currently hardcoded in `ObjectManager.cpp`.
- Unknown shapes fallback to `cube`.
- `object_updated` for unknown id is ignored with a warning log.

## Troubleshooting

- If objects do not appear:
  - Verify backend is running on port `8000`.
  - Check Unreal Output Log for connection errors from `ObjectManager`.
  - Ensure an `AObjectManager` instance exists in the active level.
