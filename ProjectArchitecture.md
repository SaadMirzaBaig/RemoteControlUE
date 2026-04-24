# Architecture & Technical Notes

## Overview

The system is composed of three independent components that communicate in a unidirectional pipeline:

```
Angular Frontend  →  FastAPI Backend  →  Unreal Engine 5
   (REST API)          (WebSocket)          (C++ Client)
```

The frontend triggers actions via REST. The backend maintains state and forwards events to Unreal via WebSocket. Unreal reacts by spawning, updating, or destroying actors in the scene.

---

## Component Responsibilities

### Frontend — Angular
- Provides a single-page interface for managing 3D objects
- Communicates with the backend exclusively via HTTP REST calls
- An `ObjectsService` handles all HTTP logic, keeping components free of network concerns
- Object data is defined in a shared `Object3D` interface in `models/object.model.ts`
- No direct connection to Unreal Engine

### Backend — FastAPI (Python)
- Exposes a REST API for create, read, update, and delete operations
- Maintains object state in memory using a dictionary keyed by object ID
- Persists state to `data/objects.json` after every mutation so objects survive server restarts
- Manages active WebSocket connections from Unreal clients via a `WebSocketManager`
- On every state change, broadcasts a structured JSON event to all connected Unreal clients
- Input validation is handled by Pydantic models with strict type constraints

### Unreal Engine — C++ Client
- A dedicated `AObjectManager` actor connects to the backend WebSocket on `BeginPlay`
- Incoming JSON messages are parsed using Unreal's built-in `FJsonObject` API
- A `TMap<FString, AActor*>` maintains the mapping between logical object IDs and scene actors
- On `object_created`: spawns a `StaticMeshActor` with the correct shape, color, size, position and rotation
- On `object_updated`: finds the existing actor by ID and applies new visuals and transform
- On `object_deleted`: destroys the actor and removes it from the map
- On `EndPlay`: cleanly closes the WebSocket connection

---

## Data Flow — Example

```
1. User clicks Create (shape=cube, color=red, size=1.0, position (x=20,y=0,z=0), rotation (x=0,y=0,z=0))
2. Angular POST /objects → FastAPI
3. FastAPI generates UUID, saves to memory and disk, returns Object3D
4. FastAPI broadcasts object_created event via WebSocket to Unreal
5. Unreal receives message, parses JSON, spawns a red cube at x=200
6. Angular updates the object list from the API response
```

---

## WebSocket Message Format

All messages follow this structure:

```json
{
  "event": "<event_name>",
  "payload": { ... }
}
```

### Supported Events

#### `object_created`
Sent when a new object is created via the REST API.
```json
{
  "event": "object_created",
  "payload": {
    "id": "9f0b91bf-1dfc-4e0a-9f05-8a8909bef55d",
    "shape": "cube",
    "color": "red",
    "size": 1.0,
    "position": { "x": 200.0, "y": 0.0, "z": 0.0 },
    "rotation": { "pitch": 0.0, "yaw": 45.0, "roll": 0.0 }
  }
}
```

#### `object_updated`
Sent when an existing object is modified.
```json
{
  "event": "object_updated",
  "payload": {
    "id": "9f0b91bf-1dfc-4e0a-9f05-8a8909bef55d",
    "shape": "sphere",
    "color": "blue",
    "size": 2.0,
    "position": { "x": 0.0, "y": 0.0, "z": 0.0 },
    "rotation": { "pitch": 0.0, "yaw": 0.0, "roll": 0.0 }
  }
}
```

#### `object_deleted`
Sent when an object is deleted.
```json
{
  "event": "object_deleted",
  "payload": {
    "id": "9f0b91bf-1dfc-4e0a-9f05-8a8909bef55d"
  }
}
```

---

## Technology Choices

| Area | Choice | Reason |
|------|--------|--------|
| Backend | FastAPI | Native async support, built-in WebSocket, automatic Swagger docs, clean Pydantic integration |
| Frontend | Angular (NgModule) | Required by test, single page with no routing needed |
| Unreal | C++ only | Required by test, no Blueprint-only solutions |
| Persistence | JSON file | Simple and straighforward for the test, no external dependencies. |
| Logging | Python logging module | Writes to terminal |

---

## Assumptions

- A single Unreal client connects at a time. The WebSocket manager supports multiple connections but the test scenario assumes one.
- Object state is held in memory and backed by a JSON file. No database is used.
- Color can be sent as a named preset (red, blue, green, yellow, orange, purple, black, white) or as an RGB array `[R, G, B]` with values from 0 to 255.
- Size is a single uniform scale value applied equally on all three axes.
- Position and rotation default to zero if not provided.
- Unreal basic shapes (cube, sphere, cylinder) are used. No custom mesh import is supported.

---

## Known Limitations

- **Objects do not reappear in Unreal on replay** — when the Unreal editor stops and replays, spawned actors are destroyed. The backend retains state but Unreal does not request existing objects on reconnect. A `GET /objects` call on `BeginPlay` would resolve this.
- **No authentication** — the REST API and WebSocket endpoint are open with no auth layer. Acceptable for a local development test but not production ready.
- **Custom mesh upload not implemented** — Unreal Engine does not natively support runtime STL loading. The proposed approach would use a `RuntimeMeshComponent` plugin or `DataSmith` plugin on the Unreal side with the backend storing uploaded files in a local `/uploads` folder and forwarding the file path via WebSocket.  I've experience in using blueprints for this task.
- **Color picker in frontend** — color is entered as a text field (named preset or hex). A visual color picker was considered but kept simple intentionally.
- **Single page frontend** — no routing or multi-view architecture. Sufficient for the scope of this test.
