# Backend (FastAPI)

Minimal backend for the technical test:
- REST API for CRUD on 3D objects
- In-memory state
- WebSocket broadcast to Unreal clients

## Requirements

- Python 3.10+

## Run

```bash
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

## REST API

- `GET /health`
- `GET /objects/{id}`
- `POST /objects`
- `PUT /objects/{id}`
- `DELETE /objects/{id}`

### Object payload (POST/PUT)

```json
{
  "shape": "cube",
  "color": "red",
  "size": 100
}
```

## WebSocket

- Endpoint: `ws://localhost:8000/ws/unreal`
- Outbound events:
  - `object_created`
  - `object_updated`
  - `object_deleted`

### Event format

```json
{
  "event": "object_created",
  "payload": {
    "id": "uuid",
    "shape": "cube",
    "color": "red",
    "size": 100
  }
}
```
