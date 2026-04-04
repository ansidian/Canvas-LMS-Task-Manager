# CTM API Key Authentication

External API access for CTM via per-user API keys, enabling integrations like ea-dashboard to read and update events without a Clerk session.

## Context

CTM's API is entirely Clerk JWT-gated. External apps (e.g., ea-dashboard's CTMCard deadlines section) cannot call CTM endpoints. This design adds a per-user API key as an alternative auth mechanism with a safety denylist on destructive operations.

## Database

Migration: add `api_key` column to `settings`.

```sql
ALTER TABLE settings ADD COLUMN api_key TEXT;
```

- Key format: `ctm_` prefix + 32 random hex characters (e.g., `ctm_a1b2c3d4e5f6...`)
- Generated server-side via `crypto.randomBytes(16).toString('hex')`
- Stored as plaintext in `settings.api_key` (acceptable for a single-user personal project; if multi-tenant, hash it)

## Middleware: `server/middleware/api-key-auth.js`

Runs early in the `/api` middleware chain, before Clerk's `requireUser()`.

Logic:
1. Extract `Authorization` header
2. If value starts with `Bearer ctm_`, treat as API key auth:
   - Query `SELECT user_id FROM settings WHERE api_key = ?`
   - If found, attach a synthetic auth object so `req.auth().userId` works downstream
   - Set `req.apiKeyAuth = true` flag for denylist checks
   - If not found, return `401 Unauthorized`
3. If no `ctm_` prefix in the header (or no header), do nothing — fall through to Clerk auth

## Route Denylist

When `req.apiKeyAuth === true`, the following routes are blocked with `403 Forbidden`:

| Route | Reason |
|---|---|
| `POST /api/reset-data` | Destructive — wipes all user data |
| `DELETE /api/events/:id` | Destructive — deletes events |
| `PATCH /api/settings` | Prevents credential changes via API key |
| `POST /api/settings/api-key` | Key management is Clerk-only |
| `DELETE /api/settings/api-key` | Key management is Clerk-only |
| `/api/guest/*` | Guest routes are irrelevant for API key auth |
| `POST /api/merge` | Merge is a guest-to-auth migration flow |

Everything else is allowed:
- `GET /api/events` — list events
- `PATCH /api/events/:id` — update event fields (status, title, due_date, etc.)
- `POST /api/events` — create events
- `GET /api/classes` — list classes
- `GET /api/settings` — read settings
- `GET /api/canvas/*`, `GET /api/todoist/*` — proxy reads

## Key Management Endpoints

### `POST /api/settings/api-key`

- **Auth**: Clerk JWT only (blocked for API key auth)
- **Behavior**: Generates a new API key, stores in `settings.api_key` for the authenticated user. If a key already exists, it is replaced (regenerate).
- **Response**: `{ api_key: "ctm_..." }` — returned once for the client to display/copy

### `DELETE /api/settings/api-key`

- **Auth**: Clerk JWT only
- **Behavior**: Sets `api_key = NULL`, revoking all API key access
- **Response**: `{ success: true }`

## Settings UI

Add an "API Key" section to the existing settings modal, following the same pattern as Canvas/Todoist token fields.

States:
1. **No key exists**: Show a "Generate API Key" button
2. **Key just generated**: Show the full key in a copyable field with a copy button. Warning text: "Save this key — it won't be shown again."
3. **Key exists (revisiting settings)**: Show masked placeholder (e.g., `ctm_••••••••`). Show "Regenerate" and "Revoke" buttons. Regenerate warns that the old key is invalidated.

The key is only returned in full from the `POST /api/settings/api-key` response. `GET /api/settings` currently does `SELECT *` which would include the raw `api_key` column — the implementation must strip `api_key` from the response and replace it with a boolean `has_api_key` field. This applies to both Clerk and API key auth GET requests.

## Middleware Integration in `server/index.js`

```
app.use(cors());
app.use(express.json());
app.use(clerkMiddleware());
app.use("/api", apiKeyAuth);        // <-- new: checks API key before routes
app.use("/api", apiRoutes);
```

The `apiKeyAuth` middleware must run after `clerkMiddleware()` (so Clerk can still populate auth for JWT requests) but before route handlers.

## Denylist Middleware

Implemented as a separate middleware or integrated into `apiKeyAuth`:

```
app.use("/api", apiKeyAuth);
app.use("/api", apiKeyDenylist);     // <-- blocks denied routes for API key requests
app.use("/api", apiRoutes);
```

The denylist middleware checks `req.apiKeyAuth === true` and matches the current route/method against the denylist table. If matched, returns 403.

## External Usage (ea-dashboard)

From ea-dashboard, requests to CTM look like:

```js
fetch("https://ctm.andysu.tech/api/events/163", {
  method: "PATCH",
  headers: {
    "Authorization": "Bearer ctm_a1b2c3d4...",
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ status: "complete" }),
});
```

No Clerk SDK, no session, no cookies needed.

## Files to Create/Modify

| File | Action |
|---|---|
| `server/db/migrations/XXX_add_api_key.sql` | Create — migration |
| `server/middleware/api-key-auth.js` | Create — API key auth + denylist middleware |
| `server/routes/settings-routes.js` | Modify — add key management endpoints |
| `server/index.js` | Modify — mount API key middleware |
| `client/src/components/SettingsModal.jsx` (or equivalent) | Modify — add API key UI section |
| `client/src/hooks/useSettingsApi.jsx` (or equivalent) | Modify — add key generation/revocation API calls |
