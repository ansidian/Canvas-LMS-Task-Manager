# CTM External API

REST API for accessing Canvas LMS Task Manager data from external applications.

**Base URL:** `https://ctm.andysu.tech/api` (production) or `http://localhost:3001/api` (development)

## Authentication

All requests require an API key passed via the `Authorization` header:

```
Authorization: Bearer ctm_your_key_here
```

Generate an API key in CTM: **Settings → API Key → Generate API Key**.

Regenerating a key invalidates the previous one. Revoking deletes it entirely.

### Error Responses

| Status | Body | Meaning |
|--------|------|---------|
| `401` | `{"message": "Invalid API key"}` | Key doesn't exist or was revoked |
| `403` | `{"message": "This endpoint is not available via API key"}` | Endpoint is on the denylist |

### Denied Endpoints

These endpoints are blocked for API key auth (Clerk session required):

- `PATCH /api/settings` — credential changes
- `POST /api/settings/api-key` — key management
- `DELETE /api/settings/api-key` — key management
- `DELETE /api/events/:id` — event deletion
- `POST /api/reset-data` — data reset
- `POST /api/merge` — guest merge
- `/api/guest/*` — all guest routes

---

## Events

### List Events

```
GET /api/events
```

Returns all events for the authenticated user, ordered by due date.

**Query Parameters** (all optional):

| Param | Type | Description | Example |
|-------|------|-------------|---------|
| `status` | string | Comma-separated status filter | `incomplete,in_progress` |
| `due_after` | string | Minimum due date (inclusive, `YYYY-MM-DD`) | `2026-04-03` |
| `due_before` | string | Maximum due date (inclusive, `YYYY-MM-DD`) | `2026-04-10` |
| `exclude_source` | string | Comma-separated sources to exclude (`todoist`, `canvas`, `manual`) | `todoist` |

**Example — upcoming incomplete non-Todoist events this week:**

```bash
curl -s "https://ctm.andysu.tech/api/events?status=incomplete,in_progress&due_after=2026-04-03&due_before=2026-04-10&exclude_source=todoist" \
  -H "Authorization: Bearer ctm_your_key"
```

**Response:** `200 OK`

```json
[
  {
    "id": 47,
    "title": "Quiz 5",
    "description": "<p>Quiz description HTML</p>",
    "due_date": "2026-04-10T06:59:00Z",
    "due_time": null,
    "status": "incomplete",
    "event_type": "assignment",
    "class_id": 5,
    "class_name": "DATA SCIENCE (CS 4661-02)",
    "class_color": "#fa5252",
    "canvas_id": "119672-2269950",
    "todoist_id": null,
    "url": "https://calstatela.instructure.com/courses/119672/assignments/2269950",
    "notes": "",
    "points_possible": 3,
    "canvas_due_date_override": 0,
    "canvas_status_override": 0,
    "reminder_count": 0,
    "created_at": "2026-04-04T00:26:39",
    "updated_at": null
  }
]
```

**Event fields:**

| Field | Type | Description |
|-------|------|-------------|
| `id` | integer | Unique event ID |
| `title` | string | Event title |
| `description` | string\|null | HTML description |
| `due_date` | string | ISO 8601 date or datetime |
| `due_time` | string\|null | Time string (rarely used; time is usually in `due_date`) |
| `status` | string | `"incomplete"`, `"in_progress"`, or `"complete"` |
| `event_type` | string | `"assignment"`, `"quiz"`, `"discussion"`, `"task"`, etc. |
| `class_id` | integer\|null | FK to classes table |
| `class_name` | string\|null | Joined class name |
| `class_color` | string\|null | Joined class hex color |
| `canvas_id` | string\|null | Canvas assignment ID (format: `courseId-assignmentId`) |
| `todoist_id` | string\|null | Todoist task ID |
| `url` | string\|null | Link to source (Canvas assignment URL, etc.) |
| `notes` | string\|null | User notes |
| `points_possible` | number\|null | Assignment point value |
| `canvas_due_date_override` | 0\|1 | User overrode the Canvas due date |
| `canvas_status_override` | 0\|1 | User overrode the Canvas status |
| `reminder_count` | integer | Number of pending (unsent) reminders |
| `created_at` | string | Creation timestamp |
| `updated_at` | string\|null | Last update timestamp |

---

### Create Event

```
POST /api/events
```

**Request body:**

```json
{
  "title": "Read chapter 5",
  "due_date": "2026-04-15",
  "event_type": "task",
  "status": "incomplete",
  "class_id": 5,
  "description": "Chapters 5.1 through 5.4",
  "notes": null,
  "url": null,
  "points_possible": null
}
```

**Required fields:** `title`, `due_date`, `event_type`

**Optional fields:** `description`, `class_id`, `status` (defaults to `"incomplete"`), `notes`, `url`, `canvas_id`, `todoist_id`, `points_possible`, `canvas_due_date_override`, `canvas_status_override`

**Response:** `201 Created` — returns the created event object.

---

### Update Event

```
PATCH /api/events/:id
```

Partial update — only include fields you want to change.

**Example — mark complete:**

```bash
curl -s "https://ctm.andysu.tech/api/events/47" \
  -X PATCH \
  -H "Authorization: Bearer ctm_your_key" \
  -H "Content-Type: application/json" \
  -d '{"status": "complete"}'
```

**Updatable fields:** `title`, `description`, `due_date`, `class_id`, `event_type`, `status`, `notes`, `url`, `todoist_id`, `points_possible`, `canvas_due_date_override`, `canvas_status_override`

**Response:** `200 OK` — returns the full updated event object.

---

## Classes

### List Classes

```
GET /api/classes
```

Returns all classes for the authenticated user, ordered by sort order then name.

**Response:** `200 OK`

```json
[
  {
    "id": 5,
    "name": "DATA SCIENCE (CS 4661-02)",
    "color": "#fa5252",
    "canvas_course_id": "119672",
    "is_synced": 1,
    "sort_order": 0,
    "created_at": "2026-04-04T00:26:39"
  }
]
```

**Class fields:**

| Field | Type | Description |
|-------|------|-------------|
| `id` | integer | Unique class ID |
| `name` | string | Class name |
| `color` | string | Hex color code |
| `canvas_course_id` | string\|null | Linked Canvas course ID |
| `is_synced` | 0\|1 | Whether Canvas sync is enabled |
| `sort_order` | integer | Display order |
| `created_at` | string | Creation timestamp |

---

### Create Class

```
POST /api/classes
```

**Request body:**

```json
{
  "name": "Physics 101",
  "color": "#3498db"
}
```

**Required fields:** `name`

**Optional fields:** `color` (defaults to `"#3498db"`), `canvas_course_id`

**Response:** `201 Created` — returns the created class object.

---

### Update Class

```
PATCH /api/classes/:id
```

Partial update. Accepts: `name`, `color`, `canvas_course_id`, `is_synced`, `sort_order`.

**Response:** `200 OK` — returns the updated class object.

---

## Settings

### Get Settings

```
GET /api/settings
```

Returns user settings. The `api_key` field is stripped and replaced with `has_api_key` (boolean).

**Response:** `200 OK`

```json
{
  "id": 1,
  "user_id": "user_abc123",
  "unassigned_color": "#a78b71",
  "canvas_url": "https://university.instructure.com",
  "canvas_token": "...",
  "todoist_token": "...",
  "discord_webhook": "https://discord.com/api/webhooks/...",
  "has_api_key": true,
  "created_at": "2026-04-04T00:26:37",
  "updated_at": "2026-04-04T00:32:31"
}
```

> **Note:** `PATCH /api/settings` is blocked for API key auth. Settings can only be modified via the CTM web UI.

---

## Deep Links

Link directly to an event in the CTM web UI:

```
https://ctm.andysu.tech/#/event/{id}
```

This opens the event detail modal. Requires an active Clerk session (not API key).

---

## Status Values

| Value | Meaning |
|-------|---------|
| `incomplete` | Not started (default) |
| `in_progress` | Work in progress |
| `complete` | Done |

---

## Rate Limits

No rate limiting is currently enforced. Be reasonable with request frequency.
