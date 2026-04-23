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
    "size": 100
  }
}
```

### ObjectData fields (inside JSON `"payload"`)

- `id` (string): unique logical id, used for actor mapping
- `shape` (string): `cube` | `sphere` | `cylinder`
- `color`:
  - string preset (`red`, `green`, `blue`, `yellow`, `black`, `white`, `orange`, `purple`)
  - or RGB array (example: `[255, 0, 0]`)
- `size` (number): converted to uniform scale (`size / 100`)

Code naming note:
- In Unreal code, parsed payload data is referenced as `ObjectData` / `ObjectDataPtr`.

## Behavior

- On `object_created`:
  - Spawns a new `AStaticMeshActor` at origin.
  - If the id already exists, previous actor is destroyed and replaced.
- On `object_updated`:
  - Updates mesh/material/scale for the existing actor with matching id.
- On `object_deleted`:
  - Destroys actor and removes mapping entry.

## Notes and Current Limitations

- WebSocket URL is currently hardcoded in `ObjectManager.cpp`.
- Spawn location and rotation are currently fixed to world origin and zero rotation.
- Unknown shapes fallback to `cube`.
- `object_updated` for unknown id is ignored with a warning log.

## Troubleshooting

- If objects do not appear:
  - Verify backend is running on port `8000`.
  - Check Unreal Output Log for connection errors from `ObjectManager`.
  - Ensure an `AObjectManager` instance exists in the active level.
