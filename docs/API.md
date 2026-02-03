# Tickets API — Frontend Reference

Base URL: **`/api/v1`**  
All responses are JSON. Success responses use the shape below unless noted.

---

## Response format

### Success

```json
{
  "success": true,
  "data": { ... },
  "message": "Optional human-readable message"
}
```

### Error

```json
{
  "success": false,
  "data": null,
  "message": "User-facing error message",
  "errorCode": "VALIDATION_ERROR",
  "timestamp": "2026-02-03T12:00:00.000Z"
}
```

**Common `errorCode` values:** `VALIDATION_ERROR`, `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `BAD_REQUEST`, `CONFLICT`, `INTERNAL_ERROR`, `RATE_LIMIT_EXCEEDED`, `SERVICE_UNAVAILABLE`.

---

## Authentication

- **All API endpoints** require authentication except signup, login, logout, and health.
- Send: `Authorization: Bearer <JWT>` on every request to tickets.
- **Auth routes** (signup, login, logout) do **not** require a token.
- After login, send the returned `token` in the `Authorization` header for all other requests.
- Logout: call `POST /auth/logout` (optionally with the current Bearer token). The client should then discard the token.

---

## Endpoints

### Health

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/v1/health` | No | Server, DB, and Redis status |

**Response (200 OK or 503 Service Unavailable)**

```json
{
  "success": true,
  "data": {
    "status": "ok",
    "uptime": 123.45,
    "environment": "development",
    "version": "v1",
    "database": "ok",
    "redis": "ok"
  },
  "message": "Server is healthy"
}
```

Use `status: "degraded"` and `database`/`redis: "error"` when DB or Redis is down (503).

---

### Auth

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/v1/auth/signup` | No | Create account |
| `POST` | `/api/v1/auth/login` | No | Log in, get user + JWT |
| `POST` | `/api/v1/auth/logout` | No | Log out (client discards token) |

**Rate limit:** 20 requests per minute per IP for signup and login.

#### POST `/api/v1/auth/signup`

**Request body**

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `email` | string | Yes | Valid email |
| `password` | string | Yes | 8–128 characters |
| `firstName` | string | Yes | Max 100 characters |
| `lastName` | string | Yes | Max 100 characters |

**Responses**

- **201** – User created. `data`: `{ id, email, firstName, lastName, createdAt, updatedAt }` (no password).
- **400** – Validation error (`errorCode: VALIDATION_ERROR`).
- **409** – Email already registered (`errorCode: CONFLICT`).

#### POST `/api/v1/auth/login`

**Request body**

| Field | Type | Required |
|-------|------|----------|
| `email` | string | Yes |
| `password` | string | Yes |

**Responses**

- **200** – `data`: `{ user: { id, email, firstName, lastName, createdAt, updatedAt }, token: "<JWT>" }`. Use `token` in `Authorization: Bearer <token>`.
- **400** – Validation error.
- **401** – Invalid email or password.

#### POST `/api/v1/auth/logout`

No body. **200** – Logged out; client should discard the token.

---

### Tickets

All ticket endpoints require **`Authorization: Bearer <JWT>`**.  
Create-ticket and list endpoints are rate-limited (see below).

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/v1/tickets/mine` | Yes | List current user's tickets (same query params as list) |
| `GET` | `/api/v1/tickets/:id` | Yes | Get one ticket by ID (creator only; limited fields) |
| `POST` | `/api/v1/tickets` | Yes | Create a ticket (associated with current user) |
| `POST` | `/api/v1/tickets/:id/close` | Yes | Close a ticket (creator only) |
| `DELETE` | `/api/v1/tickets/:id` | Yes | Delete a ticket (creator only) |

**Agent / Admin (base path `/api/v1/agent`):**

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/v1/agent/tickets` | **Admin or Agent** | List all tickets (paginated, filterable, sortable) |
| `GET` | `/api/v1/agent/tickets/:id` | **Admin or Agent** | Get full ticket detail (all fields) |
| `PATCH` | `/api/v1/agent/tickets/:id/draft` | **Admin or Agent** | Update AI draft while ticket is OPEN/IN_PROGRESS |
| `POST` | `/api/v1/agent/tickets/:id/resolve` | **Admin or Agent** | Copy draft into response and mark RESOLVED |

**Create ticket rate limit:** 20 requests per minute per IP.

#### GET `/api/v1/tickets/mine`

Returns tickets belonging to the **authenticated user** (based on the Bearer token). Same query parameters and response shape as `GET /api/v1/agent/tickets`. Only tickets created by the current user (or linked to their account) are returned.

**Query parameters:** Same as `GET /api/v1/agent/tickets` (`page`, `limit`, `status`, `category`, `sentiment`, `urgency`, `sortBy`, `sortOrder`, `search`).

**Response (200):** Same shape as list: `data`: `{ tickets, total, page, limit, totalPages }`.

**401** – Missing or invalid token. **400** – Validation error on query params.

#### GET `/api/v1/tickets/:id`

**Creator only.** Only the user who created the ticket can access. Returns a **limited** set of fields: `id`, `title`, `content`, `createdAt`, `updatedAt`, `status`. The `response` field is included **only when status is RESOLVED or CLOSED**; otherwise it is omitted.

**Response (200)** – Single ticket object with: `id`, `title`, `content`, `createdAt`, `updatedAt`, `status`, and optionally `response` (only if status is `RESOLVED` or `CLOSED`).

**400** – Invalid ID. **403** – Not the creator of this ticket. **404** – Ticket not found.

#### GET `/api/v1/agent/tickets` (admin or agent)

Returns all tickets. Requires **admin** or **agent** role. Base path for agent APIs is `/api/v1/agent`.

**Query parameters**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `page` | integer | 1 | Page number (≥ 1) |
| `limit` | integer | 20 | Items per page: `10`, `20`, `50`, or `100` |
| `status` | string | — | Filter: `OPEN`, `IN_PROGRESS`, `RESOLVED`, `CLOSED` |
| `category` | string | — | Filter by category (max 200 chars) |
| `sentiment` | integer | — | Filter by sentiment |
| `urgency` | string | — | Filter by urgency (max 200 chars) |
| `sortBy` | string | `createdAt` | Sort field: `createdAt`, `title` |
| `sortOrder` | string | `desc` | `asc` or `desc` |
| `search` | string | — | Full-text search in title (max 500 chars) |

**Response (200)** – Same shape as list: `data`: `{ tickets, total, page, limit, totalPages }`. Ticket list items match DB shape.

**400** – Invalid query params. **401** – Missing or invalid token. **403** – Not admin or agent.

#### GET `/api/v1/agent/tickets/:id` (admin or agent)

Returns the **full** ticket (all fields). Requires **admin** or **agent** role.

**Response (200)** – Full ticket object (all DB fields: id, title, content, userId, createdAt, updatedAt, status, category, tag, sentiment, urgency, responseDraft, response, replyMadeBy).

**400** – Invalid ID. **403** – Not admin or agent. **404** – Ticket not found.

#### PATCH `/api/v1/agent/tickets/:id/draft` (admin or agent)

Updates only the ticket's AI response draft. Drafts can be changed **only while the ticket status is `OPEN` or `IN_PROGRESS`**; attempts to edit drafts on other statuses return `400 Bad Request`.

**Request body**

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `draftReplyMessage` | string | Yes | Max 50,000 characters |

**Response (200)** – `data`: updated ticket (includes latest draft + metadata).

**400** – Invalid ID, validation error, or ticket status not editable. **403** – Not admin or agent. **404** – Ticket not found.

#### POST `/api/v1/agent/tickets/:id/resolve` (admin or agent)

Copies the current `responseDraft` into `response` and marks the ticket as `RESOLVED`. Requirements: ticket must exist and be `IN_PROGRESS` or `OPEN`; `responseDraft` must be non-empty (after trimming). No request body.

**Response (200)** – `data`: updated ticket (status `RESOLVED`, `response` now matches the draft).

**400** – Invalid ID, ticket not `IN_PROGRESS`/`OPEN`, or draft missing/empty. **403** – Not admin or agent. **404** – Ticket not found.

#### POST `/api/v1/tickets`

**Request body**

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `title` | string | Yes | 1–255 characters |
| `content` | string | Yes | 1–50,000 characters |

**Response (201)** – `data`: created ticket (same shape as GET by id).

**400** – Validation error.

#### POST `/api/v1/tickets/:id/close`

Marks the ticket as `CLOSED`. **Only the user who created the ticket can close it.**

- **Authorization:** Authenticated user must be the ticket creator (`ticket.userId` must match the JWT user id). If the ticket has no creator (`userId` is null), the request is rejected.
- No request body.

**Response (200)** – `data`: updated ticket (status `CLOSED`).

**400** – Invalid ID or ticket is already closed.  
**403** – Only the user who created the ticket can close it (`errorCode: FORBIDDEN`).  
**404** – Ticket not found.

#### DELETE `/api/v1/tickets/:id`

**Creator only.** Only the user who created the ticket can delete it.

**Response (200)** – `data`: `{ "id": <deleted_id> }`.

**400** – Invalid ID. **403** – Not the creator of this ticket. **404** – Ticket not found.

---

## Ticket and enum reference

**Ticket status:** `OPEN` | `IN_PROGRESS` | `RESOLVED` | `CLOSED`  
Tickets start as `OPEN`, move to `IN_PROGRESS` automatically after AI triage, and can be marked `RESOLVED` via `POST /api/v1/tickets/:id/resolve`. Only the creator can close a ticket via `POST /api/v1/tickets/:id/close`, which sets status to `CLOSED`.

**Reply origin:** `AI` | `HUMAN_AI` (who last produced the reply: AI only vs human-edited AI)

**Ticket object (user GET `/api/v1/tickets/:id`)** – Limited fields: `id`, `title`, `content`, `createdAt`, `updatedAt`, `status`; `response` only when status is `RESOLVED` or `CLOSED`.

**Ticket object (full, admin/agent GET `/api/v1/agent/tickets/:id`)** – All fields as in list, plus:

- `userId` (integer | null) – Creator user ID.
- `responseDraft` (string | null) – AI-generated response draft.
- `response` (string | null) – Reply sent to the user.
- `replyMadeBy` (`AI` | `HUMAN_AI` | null).

---

## CORS and JSON

- CORS is enabled; frontend can call the API from a browser.
- Request/response JSON body size limit: **200kb** (covers ticket content and draft sizes).

---

## Quick checklist for frontend

1. **Base URL:** `/api/v1` (or full origin, e.g. `https://api.example.com/api/v1`).
2. **Auth:** All endpoints except signup/login/logout/health require `Authorization: Bearer <token>`. Use `GET /api/v1/tickets/mine` for the current user's tickets; use `GET /api/v1/agent/tickets` and `GET /api/v1/agent/tickets/:id` for admin/agent (403 if not admin or agent).
3. **Errors:** Check `success === false`, use `message` and `errorCode` for UX; use HTTP status for retries/redirects (e.g. 401 → re-login).
4. **Pagination:** `GET /tickets` returns `tickets`, `total`, `page`, `limit`, `totalPages`.
5. **Validation:** Use the same constraints (lengths, enums) as in this doc to avoid 400s.
