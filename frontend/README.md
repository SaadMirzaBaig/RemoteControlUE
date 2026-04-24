# 3D Object Remote Control — Frontend

An Angular 19 web app for managing 3D objects via a REST API. You can create, list, edit, and delete objects with properties like shape, color, size, position, and rotation.

---

## Prerequisites

- **Node.js** v18.19.1, v20.11.1, or v22+
- **npm** v6.11+
- The backend API running at `http://localhost:8000`

---

## Getting Started

```bash
# 1. Navigate into the frontend folder
cd frontend

# 2. Install dependencies
npm install

# 3. Start the development server
npm start
```

Then open your browser at **http://localhost:4200**.

The app will hot-reload whenever you save a file.

---

## Available Scripts

| Command | What it does |
|---|---|
| `npm start` | Starts the dev server at `http://localhost:4200` |
| `npm run build` | Builds for production into `dist/frontend/` |
| `npm run watch` | Builds in development mode and watches for changes |

---

## Project Structure

```
src/
├── app/
│   ├── components/
│   │   ├── object-list/     # Shows all objects fetched from the API
│   │   ├── object-item/     # A single row: shows object info + Edit/Delete buttons
│   │   └── object-form/     # Form to create a new object or edit an existing one
│   ├── models/
│   │   └── object.model.ts  # TypeScript types for Object3D, Position, Rotation, etc.
│   ├── services/
│   │   └── objects/
│   │       └── objects.service.ts  # All HTTP calls to the API (list, create, update, delete)
│   ├── app.component.*      # Root shell: wires the list and form together
│   └── app.module.ts        # Declares all components and imports Angular modules
├── index.html
├── main.ts
└── styles.css
```

---

## How It Works

Two panels: a **list** on top and a **form** below.

### Data Flow (the big picture)

```
API (localhost:8000)
       ↕  HTTP (ObjectsService)
  AppComponent  ←── coordinates list + form
    ├── ObjectListComponent   (reads)
    │     └── ObjectItemComponent  (per row: edit / delete)
    └── ObjectFormComponent   (writes: create / update)
```

### Components

**`ObjectListComponent`**
Fetches all objects from `GET /objects` on load, displays them as a list, and display a `refresh()` method. When the user clicks Edit on an item, it shows the selected object up to `AppComponent`.

**`ObjectItemComponent`**
A single row showing an object's ID, shape, color, and size. The **Edit** button makes the object upward. The **Delete** button calls `DELETE /objects/:id` directly and then tells the list to refresh.

**`ObjectFormComponent`**
Handles both "create" and "edit" modes. When `AppComponent` passes an object into it via `@Input`, the form pre-fills with that object's data (edit mode). On submit it calls either `POST /objects` or `PUT /objects/:id`. After a successful save it emits a `saved` event so the list can refresh.

**`AppComponent`**
The coordinator. It listens for the `editObject` event from the list and passes the chosen object down into the form. When the form sends `saved` or `cleared`, it resets the selection and triggers a list refresh.

### Services

**`ObjectsService`**
The single point of contact with the API. All four CRUD operations live here:

| Method | HTTP call |
|---|---|
| `list()` | `GET /objects` |
| `create(body)` | `POST /objects` |
| `update(id, body)` | `PUT /objects/:id` |
| `delete(id)` | `DELETE /objects/:id` |

The service also normalises the `color` field — the API may return either a string (`"red"`) or an RGB array (`[255, 0, 0]`), and both are converted to a plain string for the UI.

### Models (`object.model.ts`)

Three core shapes describe the data:

- **`Object3D`** — a full object as returned by the API (includes `id`)
- **`Object3DCreate`** — what you send when creating (no `id` yet)
- **`Object3DUpdate`** — all fields optional, for partial edits

Supporting types `Position3D` (`x`, `y`, `z`) and `Rotation3D` (`pitch`, `yaw`, `roll`) are used inside both.

---

## API Contract

The frontend expects the backend at `http://localhost:8000` to implement:

```
GET    /objects          → Object3D[]
POST   /objects          → Object3D
PUT    /objects/:id      → Object3D
DELETE /objects/:id      → 204 No Content
```

Each `Object3D` looks like:

```json
{
  "id": "abc-123",
  "shape": "cube",
  "color": "#ff0000",
  "size": 1.5,
  "position": { "x": 0, "y": 0, "z": 0 },
  "rotation": { "pitch": 0, "yaw": 45, "roll": 0 }
}
```

Supported shapes: `cube`, `sphere`, `cylinder`.
