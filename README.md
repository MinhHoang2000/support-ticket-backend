# Tickets Backend

Backend API for the Tickets application: Node.js, Express, Prisma, PostgreSQL, Redis, and optional AI (OpenAI/LangChain) for ticket handling.

---

## System Architecture

The following diagram shows the main components and how they interact:

![System Architecture](Diagram.jpg)

---

## Running the Project with Docker

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and [Docker Compose](https://docs.docker.com/compose/install/) installed
- A `.env` file in the project root (see [Environment variables](#environment-variables))

### Environment variables

1. Copy the example env file:
   ```bash
   cp .env.example .env
   ```
2. Edit `.env` and set at least:
   - `DB_USER`, `DB_PASSWORD`, `DB_NAME` (or use defaults: `postgres` / `postgres` / `tickets_db`)
   - `DATABASE_URL` in the form: `postgresql://USER:PASSWORD@HOST:PORT/DATABASE` (for local Prisma/CLI; Compose overrides `HOST` inside the backend container)
   - `JWT_SECRET` for auth
   - `OPENAI_API_KEY` if you use AI features
   - Optionally `REDIS_USER` (default: `default`) and `REDIS_PASSWORD` for Redis auth (recommended in production)

### Option A: Production-like run (built image)

1. **Build and start all services** (PostgreSQL, Redis, backend):
   ```bash
   docker compose up --build -d
   ```
2. **Check that containers are running**:
   ```bash
   docker compose ps
   ```
   You should see `tickets_db`, `tickets_redis`, and `tickets_backend` (or similar) with state “Up”.
3. **Optional: view logs**:
   ```bash
   docker compose logs -f backend
   ```
4. **Open the API** (default port 3000):
   - API base: `http://localhost:3000/api/v1`
   - Health: `http://localhost:3000/api/v1/health`
   - Swagger UI: `http://localhost:3000/api-docs`
5. **Stop everything**:
   ```bash
   docker compose down
   ```
   Add `-v` to remove volumes (database and Redis data): `docker compose down -v`.

### Option B: Development run (hot reload)

1. **Build and start in dev mode** (uses `Dockerfile.dev` and nodemon):
   ```bash
   docker compose -f docker-compose.dev.yml up --build -d
   ```
2. **Check containers**:
   ```bash
   docker compose -f docker-compose.dev.yml ps
   ```
3. **Edit code** on your machine; the backend container runs nodemon and restarts on file changes (mounted `./src`, `./prisma`).
4. **API and Swagger** (default port 3000):
   - API base: `http://localhost:3000/api/v1`
   - Swagger UI: `http://localhost:3000/api-docs`
5. **Stop**:
   ```bash
   docker compose -f docker-compose.dev.yml down
   ```

### Summary

| Goal              | Command                                                    |
|-------------------|------------------------------------------------------------|
| Production run    | `docker compose up --build -d`                             |
| Development run   | `docker compose -f docker-compose.dev.yml up --build -d`   |
| Stop (production) | `docker compose down`                                      |
| Stop (development)| `docker compose -f docker-compose.dev.yml down`           |

---

## API Documentation (Swagger)

Interactive API documentation is served by **Swagger UI** when the backend is running.

- **URL:** [http://localhost:3000/api-docs](http://localhost:3000/api-docs)  
  (Use the host/port where your app is running, e.g. when using Docker the app is on port `3000` by default.)

- **What it provides:**
  - OpenAPI 3.0 spec for the **Tickets API**
  - Try-it-out for endpoints (auth, tickets, agent, health)
  - Request/response schemas and examples

- **Base API:** All versioned routes are under `/api/v1` (e.g. `/api/v1/health`, `/api/v1/auth/login`, `/api/v1/tickets`).

If you run the backend with Docker as above, open: **http://localhost:3000/api-docs**.
