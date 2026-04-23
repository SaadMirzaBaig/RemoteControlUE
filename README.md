# VR Remote Control — Unreal Engine Technical Test

A real-time 3D object control system built with Angular, FastAPI, and Unreal Engine 5 (C++).
A web interface lets you create, edit, and delete 3D objects. Changes are forwarded to Unreal Engine in real time via WebSocket, where actors are spawned, updated, or destroyed accordingly.

---

## Project Structure

```
vr-remote-control/
├── backend/        # Python FastAPI REST API + WebSocket server
├── frontend/       # Angular web interface
└── unrealProject/  # Unreal Engine 5 C++ client
```

---

## Requirements

| Component | Requirement |
|-----------|-------------|
| Backend | Python 3.11+, pip |
| Frontend | Node.js v20.19+ or v22.12+, Angular CLI |
| Unreal | Unreal Engine 5.4, Visual Studio 2022 |

---

## Starting the Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # Mac/Linux
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Backend runs at: `http://localhost:8000`
Interactive API docs: `http://localhost:8000/docs`

---

## Starting the Frontend

```bash
cd frontend
npm install
ng serve
```

Frontend runs at: `http://localhost:4200`

---

## Starting Unreal Engine

1. Open `unrealProject/RemoteUE/RemoteUE.uproject` in Unreal Engine 5.4
2. Make sure the backend is running before pressing Play
3. Press **Play** in the Unreal Editor
4. The `ObjectManager` actor connects automatically to `ws://127.0.0.1:8000/ws/unreal`

> The `ObjectManager` actor must be placed in the level. It is already placed in `BasicMap`.

---

## Running Order

Always start in this order:

```
1. Backend   →   2. Frontend   →   3. Unreal Engine (Press Play)
```

---

## REST API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/objects` | List all objects |
| POST | `/objects` | Create a new object |
| PUT | `/objects/{id}` | Update an existing object |
| DELETE | `/objects/{id}` | Delete an object |

---

## Object Schema

```json
{
  "id": "uuid-string",
  "shape": "cube | sphere | cylinder",
  "color": "red | blue | green | ... or [R, G, B]",
  "size": 100.0,
  "position": { "x": 0.0, "y": 0.0, "z": 0.0 },
  "rotation": { "pitch": 0.0, "yaw": 0.0, "roll": 0.0 }
}
```

---

## State Persistence

Object state is saved automatically to `backend/data/objects.json` after every create, update, or delete operation. The backend reloads this file on startup so objects survive server restarts (Only Frontend for now)

---