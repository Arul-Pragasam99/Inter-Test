# Docker Learning Project — Node.js + MongoDB + Docker Compose

A complete beginner-friendly guide to Dockerizing a Node.js + Express app with MongoDB, from scratch to running with Docker Compose.

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Tech Stack](#tech-stack)
3. [Project Structure](#project-structure)
4. [Step 1 — Project Setup](#step-1--project-setup)
5. [Step 2 — App Code](#step-2--app-code)
6. [Step 3 — Dockerfile](#step-3--dockerfile)
7. [Step 4 — Build Docker Image](#step-4--build-docker-image)
8. [Step 5 — Run Single Container](#step-5--run-single-container)
9. [Step 6 — Docker Compose Setup](#step-6--docker-compose-setup)
10. [Step 7 — Run with Docker Compose](#step-7--run-with-docker-compose)
11. [Step 8 — Test the App](#step-8--test-the-app)
12. [Step 9 — View Data in MongoDB Compass](#step-9--view-data-in-mongodb-compass)
13. [How Data is Stored](#how-data-is-stored)
14. [Useful Docker Commands](#useful-docker-commands)
15. [Errors & Fixes](#errors--fixes)
16. [Data Flow Summary](#data-flow-summary)

---

## Project Overview

This project demonstrates how to:
- Build a simple Node.js + Express web app
- Dockerize it using a `Dockerfile`
- Connect it to a MongoDB database
- Run both services together using Docker Compose
- Persist data using Docker Volumes
- View stored data using MongoDB Compass

---

## Tech Stack

| Technology | Purpose |
|---|---|
| Node.js 18 (Alpine) | Backend runtime |
| Express.js | Web framework |
| Mongoose | MongoDB ODM |
| MongoDB 6 | Database |
| Docker | Containerization |
| Docker Compose | Multi-container orchestration |
| MongoDB Compass | GUI to view database |

---

## Project Structure

```
my-app/
├── public/
│   └── index.html        ← Frontend webpage
├── server.js             ← Express server + MongoDB logic
├── package.json          ← Dependencies
├── Dockerfile            ← Docker image instructions
├── docker-compose.yml    ← Multi-container config
└── .dockerignore         ← Files to exclude from image
```

---

## Step 1 — Project Setup

Create the project folder and initialize Node.js:

```bash
mkdir my-app
cd my-app
npm init -y
npm install express mongoose
```

Create `.dockerignore` to exclude unnecessary files from the Docker image:

```
node_modules
npm-debug.log
```

---

## Step 2 — App Code

### `server.js`

```js
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Connect to MongoDB — 'mongo' is the Docker Compose service name
mongoose.connect('mongodb://mongo:27017/myapp')
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB error:', err));

// Schema
const Message = mongoose.model('Message', { text: String });

// Save a message
app.post('/messages', async (req, res) => {
  const msg = await Message.create({ text: req.body.text });
  res.json(msg);
});

// Get all messages
app.get('/messages', async (req, res) => {
  const msgs = await Message.find();
  res.json(msgs);
});

app.listen(3000, () => console.log('Server running on http://localhost:3000'));
```

> **Note:** `mongodb://mongo:27017` — `mongo` is the service name defined in `docker-compose.yml`. Docker's internal network resolves it automatically. Do NOT use `localhost` here.

---

### `public/index.html`

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <title>Docker Compose App</title>
</head>
<body>
  <h1>Messages (stored in MongoDB)</h1>
  <input id="msg" type="text" placeholder="Type a message..." />
  <button onclick="send()">Save</button>
  <ul id="list"></ul>

  <script>
    async function load() {
      const res = await fetch('/messages');
      const data = await res.json();
      document.getElementById('list').innerHTML =
        data.map(m => `<li>${m.text}</li>`).join('');
    }
    async function send() {
      const text = document.getElementById('msg').value;
      await fetch('/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      });
      load();
    }
    load();
  </script>
</body>
</html>
```

---

## Step 3 — Dockerfile

Create a file named `Dockerfile` (no extension) at the project root:

```dockerfile
# Use official Node.js base image (Alpine = lightweight ~50MB)
FROM node:18-alpine

# Set working directory inside the container
WORKDIR /app

# Copy package files first (Docker layer caching trick)
COPY package*.json ./

# Install dependencies inside the image
RUN npm install

# Copy all remaining source files
COPY . .

# Document that the app listens on port 3000
EXPOSE 3000

# Command to run when container starts
CMD ["node", "server.js"]
```

### Dockerfile Explained Line by Line

| Instruction | What it does |
|---|---|
| `FROM node:18-alpine` | Pull lightweight Node.js 18 base image |
| `WORKDIR /app` | Set `/app` as working directory inside container |
| `COPY package*.json ./` | Copy only package files first (enables layer caching) |
| `RUN npm install` | Install all dependencies inside the image |
| `COPY . .` | Copy all source code into the container |
| `EXPOSE 3000` | Document port 3000 (informational only) |
| `CMD ["node", "server.js"]` | Default command when container starts |

> **Why copy `package.json` first?** Docker caches each layer. If source code changes but `package.json` doesn't, Docker reuses the cached `npm install` layer — making rebuilds much faster.

---

## Step 4 — Build Docker Image

```bash
docker build -t my-app .
```

- `-t my-app` — give the image a name
- `.` — use current folder as build context

---

## Step 5 — Run Single Container

```bash
docker run -p 3000:3000 my-app
```

- `-p 3000:3000` — map port 3000 on your machine to port 3000 inside container

Open browser: `http://localhost:3000` ✅

---

## Step 6 — Docker Compose Setup

Create `docker-compose.yml` at the project root:

```yaml
services:

  app:
    build: .
    ports:
      - "3000:3000"
    depends_on:
      - mongo
    environment:
      - NODE_ENV=development

  mongo:
    image: mongo:6
    ports:
      - "27018:27017"     # Using 27018 to avoid conflict with local MongoDB
    volumes:
      - mongo-data:/data/db

volumes:
  mongo-data:
```

### Key Concepts

| Config | What it does |
|---|---|
| `build: .` | Build app image from Dockerfile |
| `depends_on: mongo` | Start mongo before app |
| `ports: 27018:27017` | Map local port 27018 → container port 27017 |
| `volumes: mongo-data:/data/db` | Persist MongoDB data on your machine |

> **Why port 27018?** If MongoDB is installed locally, it already uses port 27017. Using 27018 avoids port conflict and lets both run simultaneously.

---

## Step 7 — Run with Docker Compose

```bash
docker compose up --build
```

- `--build` — force rebuild the app image
- Both `app` and `mongo` containers start together

To run in background:

```bash
docker compose up --build -d
```

To stop:

```bash
docker compose down
```

---

## Step 8 — Test the App

**1. Open the app:**
```
http://localhost:3000
```

**2. Type a message and click Save.**

**3. Verify data saved via API:**
```
http://localhost:3000/messages
```
You should see JSON like:
```json
[{"_id":"...","text":"hello docker","__v":0}]
```

**4. Restart containers and check data persists:**
```bash
docker compose down
docker compose up -d
```
Open `http://localhost:3000/messages` — your messages are still there! ✅

> **Warning:** Running `docker compose down -v` deletes volumes too — all data will be gone permanently!

---

## Step 9 — View Data in MongoDB Compass

1. Open **MongoDB Compass** (desktop app — not browser)
2. Click **New Connection**
3. Enter connection string:
```
mongodb://localhost:27018
```
4. Click **Connect**
5. Navigate to: `myapp` → `messages` → see your data ✅

> **Note:** Data only appears in Compass **after** you save at least one message. MongoDB creates the database automatically on first insert.

---

## How Data is Stored

```
Browser (localhost:3000)
        ↓  HTTP POST /messages
   app container
   (Node.js + Express)
        ↓  mongoose.save()
  mongo container
   (MongoDB process)
        ↓  writes to /data/db
  mongo-data volume
  (your machine's disk)
        ↓  mapped to
MongoDB Compass (localhost:27018) ✅
```

### Where is the volume physically stored?

```bash
# View all volumes
docker volume ls

# See exact location on your machine
docker volume inspect my-app_mongo-data
```

| OS | Location |
|---|---|
| Linux / Mac | `/var/lib/docker/volumes/my-app_mongo-data/_data` |
| Windows | `\\wsl$\docker-desktop-data\data\docker\volumes\my-app_mongo-data\_data` |

---

## Useful Docker Commands

| Command | What it does |
|---|---|
| `docker compose up --build` | Build and start all services |
| `docker compose up -d` | Start in background (detached) |
| `docker compose down` | Stop and remove containers |
| `docker compose down -v` | Stop + delete volumes (data lost!) |
| `docker compose ps` | Show running services and status |
| `docker compose logs app` | View app container logs |
| `docker compose logs mongo` | View mongo container logs |
| `docker compose logs -f` | Stream live logs from all services |
| `docker compose restart app` | Restart just one service |
| `docker build -t my-app .` | Build a Docker image |
| `docker run -p 3000:3000 my-app` | Run a single container |
| `docker ps` | List all running containers |
| `docker images` | List all images |
| `docker volume ls` | List all volumes |
| `docker volume inspect <name>` | Inspect a volume |

---

## Errors & Fixes

### Error 1 — `version` attribute warning
```
the attribute `version` is obsolete
```
**Fix:** Remove `version: '3.8'` from top of `docker-compose.yml`

---

### Error 2 — `Cannot find module 'mongoose'`
```
Error: Cannot find module 'mongoose'
```
**Cause:** `mongoose` not in `package.json` when Docker image was built.

**Fix:**
```bash
npm install mongoose       # adds to package.json
docker compose down
docker compose up --build  # rebuild image with mongoose
```

---

### Error 3 — App container not starting
**Fix:** Check logs:
```bash
docker compose logs app
```
Then rebuild:
```bash
docker compose down
docker compose up --build
```

---

### Error 4 — MongoDB Compass showing wrong data (local MongoDB conflict)
**Cause:** Local MongoDB and Docker MongoDB both using port 27017.

**Fix Option 1:** Stop local MongoDB:
```bash
net stop MongoDB           # Windows
brew services stop mongodb-community  # Mac
```

**Fix Option 2 (Recommended):** Use different port in `docker-compose.yml`:
```yaml
mongo:
  ports:
    - "27018:27017"
```
Then connect Compass to `mongodb://localhost:27018`

---

## Data Flow Summary

```
Code written
    ↓
Dockerfile (build instructions)
    ↓
Docker Image (packaged app)
    ↓
Docker Container (running app)
    ↓
Docker Compose (app + MongoDB together)
    ↓
Volume (data persisted on your machine)
    ↓
MongoDB Compass (view data visually)
```

---

## Quick Start (After Initial Setup)

```bash
# Clone / navigate to project
cd my-app

# Start everything
docker compose up --build

# Open in browser
# http://localhost:3000

# View data in Compass
# mongodb://localhost:27018

# Stop everything
docker compose down
```

---

*Built for Docker learning — Node.js + MongoDB + Docker Compose + Volumes*
