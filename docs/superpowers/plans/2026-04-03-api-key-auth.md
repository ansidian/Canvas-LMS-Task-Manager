# API Key Authentication Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add per-user API key authentication to CTM so external apps can access the API without a Clerk session.

**Architecture:** A new middleware checks for `Bearer ctm_*` tokens before Clerk auth runs. Valid keys resolve to a user ID via the `settings` table. A denylist middleware blocks destructive routes for API key requests. Key management endpoints and a settings UI tab allow generating/revoking keys.

**Tech Stack:** Express.js middleware, LibSQL/Turso migration, React + Mantine UI

**Spec:** `docs/superpowers/specs/2026-04-03-api-key-auth-design.md`

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `server/db/migrations/014_add_api_key.sql` | Create | Add `api_key` column to `settings` |
| `server/middleware/api-key-auth.js` | Create | API key lookup + denylist enforcement |
| `server/index.js` | Modify | Mount API key middleware |
| `server/routes/settings-routes.js` | Modify | Add key generate/revoke endpoints, strip `api_key` from GET response |
| `client/src/components/settings/SettingsApiKeyTab.jsx` | Create | API key UI tab |
| `client/src/components/SettingsModal.jsx` | Modify | Add API Key tab |

---

### Task 1: Database Migration

**Files:**
- Create: `server/db/migrations/014_add_api_key.sql`

- [ ] **Step 1: Create migration file**

```sql
ALTER TABLE settings ADD COLUMN api_key TEXT;
```

- [ ] **Step 2: Run migration**

Run: `cd /Users/andys/Documents/Projects/Canvas-LMS-Task-Manager && node server/db/migrate.js`
Expected: "Running migration: 014_add_api_key.sql" then "Completed migration"

- [ ] **Step 3: Verify column exists**

Run: `cd /Users/andys/Documents/Projects/Canvas-LMS-Task-Manager && node -e "import('./server/db/connection.js').then(m => m.default.execute('PRAGMA table_info(settings)')).then(r => console.log(r.rows.map(c => c.name)))"`
Expected: Output includes `api_key` in the column list

- [ ] **Step 4: Commit**

```bash
git add server/db/migrations/014_add_api_key.sql
git commit -m "feat: add api_key column to settings table"
```

---

### Task 2: API Key Auth Middleware

**Files:**
- Create: `server/middleware/api-key-auth.js`

- [ ] **Step 1: Create the middleware file**

```js
import db from "../db/connection.js";

// Routes blocked for API key auth (method + path pattern).
// Paths are relative to /api since this middleware is mounted on /api.
const DENYLIST = [
  { method: "POST", path: "/reset-data" },
  { method: "DELETE", pattern: /^\/events\/\d+$/ },
  { method: "PATCH", path: "/settings" },
  { method: "POST", path: "/settings/api-key" },
  { method: "DELETE", path: "/settings/api-key" },
  { method: "POST", path: "/merge" },
  { method: "*", pattern: /^\/guest\// },
];

function isDenied(method, path) {
  return DENYLIST.some((rule) => {
    if (rule.method !== "*" && rule.method !== method) return false;
    if (rule.path) return path === rule.path;
    if (rule.pattern) return rule.pattern.test(path);
    return false;
  });
}

export default async function apiKeyAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ctm_")) {
    return next();
  }

  const apiKey = authHeader.slice(7); // "Bearer ".length

  try {
    const result = await db.execute({
      sql: "SELECT user_id FROM settings WHERE api_key = ?",
      args: [apiKey],
    });

    if (result.rows.length === 0) {
      return res.status(401).json({ message: "Invalid API key" });
    }

    const userId = result.rows[0].user_id;

    // Check denylist before allowing
    if (isDenied(req.method, req.path)) {
      return res.status(403).json({ message: "This endpoint is not available via API key" });
    }

    // Attach synthetic auth so req.auth().userId works downstream
    req.auth = () => ({ userId, sessionId: null });
    req.apiKeyAuth = true;

    next();
  } catch (err) {
    console.error("API key auth error:", err);
    res.status(500).json({ message: "Authentication error" });
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add server/middleware/api-key-auth.js
git commit -m "feat: add API key auth middleware with route denylist"
```

---

### Task 3: Mount Middleware in Server

**Files:**
- Modify: `server/index.js:19-20`

- [ ] **Step 1: Add import and mount the middleware**

At the top of `server/index.js`, add the import after line 8:

```js
import apiKeyAuth from "./middleware/api-key-auth.js";
```

Then change the route mounting from:

```js
app.use("/api", apiRoutes);
```

to:

```js
app.use("/api", apiKeyAuth);
app.use("/api", apiRoutes);
```

This places API key auth after `clerkMiddleware()` (line 19) but before any route handlers. If the request has a `Bearer ctm_*` header, the middleware resolves the user and attaches auth. Otherwise it falls through to Clerk.

- [ ] **Step 2: Commit**

```bash
git add server/index.js
git commit -m "feat: mount API key auth middleware before API routes"
```

---

### Task 4: Key Management Endpoints + Strip Key from GET

**Files:**
- Modify: `server/routes/settings-routes.js`

- [ ] **Step 1: Add crypto import**

At the top of `server/routes/settings-routes.js`, after the existing imports, add:

```js
import crypto from "crypto";
```

- [ ] **Step 2: Strip api_key from GET /settings response**

In the `GET /settings` handler (line 10-36), after fetching the settings row, strip the raw key and add a boolean. Replace:

```js
    res.json(result.rows[0]);
```

with:

```js
    const settings = { ...result.rows[0] };
    settings.has_api_key = Boolean(settings.api_key);
    delete settings.api_key;
    res.json(settings);
```

- [ ] **Step 3: Add POST /settings/api-key endpoint**

Add before the `// Add rejected item` comment (line 97):

```js
// Generate or regenerate API key
router.post("/settings/api-key", async (req, res) => {
  if (req.apiKeyAuth) {
    return res.status(403).json({ message: "Cannot manage API keys via API key auth" });
  }
  const userId = req.auth().userId;
  try {
    const apiKey = "ctm_" + crypto.randomBytes(16).toString("hex");
    await db.execute({
      sql: "UPDATE settings SET api_key = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?",
      args: [apiKey, userId],
    });
    res.json({ api_key: apiKey });
  } catch (err) {
    console.error("Error generating API key:", err);
    res.status(500).json({ message: "Failed to generate API key" });
  }
});

// Revoke API key
router.delete("/settings/api-key", async (req, res) => {
  if (req.apiKeyAuth) {
    return res.status(403).json({ message: "Cannot manage API keys via API key auth" });
  }
  const userId = req.auth().userId;
  try {
    await db.execute({
      sql: "UPDATE settings SET api_key = NULL, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?",
      args: [userId],
    });
    res.json({ success: true });
  } catch (err) {
    console.error("Error revoking API key:", err);
    res.status(500).json({ message: "Failed to revoke API key" });
  }
});
```

- [ ] **Step 4: Commit**

```bash
git add server/routes/settings-routes.js
git commit -m "feat: add API key generate/revoke endpoints, strip key from GET response"
```

---

### Task 5: Settings UI — API Key Tab

**Files:**
- Create: `client/src/components/settings/SettingsApiKeyTab.jsx`

- [ ] **Step 1: Create the API Key tab component**

```jsx
import { useState } from "react";
import { Alert, Button, CopyButton, Group, Stack, Text, TextInput } from "@mantine/core";
import { IconAlertCircle, IconCheck, IconCopy } from "@tabler/icons-react";
import { notifyError, notifySuccess } from "../../utils/notify.jsx";

export default function SettingsApiKeyTab({ api, hasApiKey: initialHasKey }) {
  const [hasKey, setHasKey] = useState(initialHasKey);
  const [revealedKey, setRevealedKey] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [confirmRegenerate, setConfirmRegenerate] = useState(false);
  const [revoking, setRevoking] = useState(false);
  const [confirmRevoke, setConfirmRevoke] = useState(false);

  const generateKey = async () => {
    setGenerating(true);
    setConfirmRegenerate(false);
    try {
      const data = await api("/settings/api-key", { method: "POST" });
      setRevealedKey(data.api_key);
      setHasKey(true);
      notifySuccess(hasKey ? "API key regenerated." : "API key generated.");
    } catch (err) {
      notifyError(err.message || "Failed to generate API key.");
    } finally {
      setGenerating(false);
    }
  };

  const revokeKey = async () => {
    setRevoking(true);
    setConfirmRevoke(false);
    try {
      await api("/settings/api-key", { method: "DELETE" });
      setHasKey(false);
      setRevealedKey(null);
      notifySuccess("API key revoked.");
    } catch (err) {
      notifyError(err.message || "Failed to revoke API key.");
    } finally {
      setRevoking(false);
    }
  };

  return (
    <Stack>
      <Text size="sm" c="dimmed">
        Generate an API key to access CTM from external apps. The key grants
        read and update access to your events and classes.
      </Text>

      {revealedKey && (
        <Alert icon={<IconAlertCircle size={16} />} color="yellow" variant="light">
          Save this key now — it won't be shown again.
        </Alert>
      )}

      {revealedKey ? (
        <Group gap="xs" wrap="nowrap">
          <TextInput
            value={revealedKey}
            readOnly
            styles={{ input: { fontFamily: "monospace", fontSize: 13 } }}
            style={{ flex: 1 }}
          />
          <CopyButton value={revealedKey}>
            {({ copied, copy }) => (
              <Button
                variant="default"
                onClick={copy}
                leftSection={copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
              >
                {copied ? "Copied" : "Copy"}
              </Button>
            )}
          </CopyButton>
        </Group>
      ) : hasKey ? (
        <TextInput
          value="ctm_••••••••••••••••••••••••••••••••"
          readOnly
          styles={{ input: { fontFamily: "monospace", fontSize: 13, color: "var(--mantine-color-dimmed)" } }}
        />
      ) : null}

      <Group justify="flex-end">
        {hasKey && !confirmRevoke && (
          <Button
            variant="default"
            color="red"
            onClick={() => setConfirmRevoke(true)}
            disabled={revoking}
          >
            Revoke
          </Button>
        )}
        {confirmRevoke && (
          <>
            <Text size="sm" c="red">Revoke this key? External apps will lose access.</Text>
            <Button variant="default" onClick={() => setConfirmRevoke(false)}>Cancel</Button>
            <Button color="red" onClick={revokeKey} loading={revoking}>Confirm Revoke</Button>
          </>
        )}
        {!confirmRevoke && !confirmRegenerate && (
          <Button
            onClick={hasKey ? () => setConfirmRegenerate(true) : generateKey}
            loading={generating}
          >
            {hasKey ? "Regenerate" : "Generate API Key"}
          </Button>
        )}
        {confirmRegenerate && (
          <>
            <Text size="sm" c="orange">This will invalidate the current key.</Text>
            <Button variant="default" onClick={() => setConfirmRegenerate(false)}>Cancel</Button>
            <Button color="orange" onClick={generateKey} loading={generating}>Confirm Regenerate</Button>
          </>
        )}
      </Group>
    </Stack>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/components/settings/SettingsApiKeyTab.jsx
git commit -m "feat: add API key settings tab component"
```

---

### Task 6: Wire API Key Tab into Settings Modal

**Files:**
- Modify: `client/src/components/SettingsModal.jsx`

- [ ] **Step 1: Add import**

After the existing settings tab imports (line 8), add:

```js
import SettingsApiKeyTab from "./settings/SettingsApiKeyTab";
```

- [ ] **Step 2: Track has_api_key from settings load**

Add state for tracking the key status. After line 137 (end of the useEffect), add a state variable near the existing `useState` for `activeTab` (line 139):

```js
const [hasApiKey, setHasApiKey] = useState(false);
```

Then in the existing `useEffect` that loads settings (line 118-137), add `setHasApiKey(Boolean(data.has_api_key))` inside the `.then()` callback, after the `setSavedDiscordWebhook` line:

```js
        setHasApiKey(Boolean(data.has_api_key));
```

- [ ] **Step 3: Add panel content entry**

In the `panelContent` object, after the `reminders` entry and before `help`, add:

```js
    apikey: (
      <SettingsApiKeyTab api={api} hasApiKey={hasApiKey} />
    ),
```

- [ ] **Step 4: Add tab to tab list**

In the `<Tabs.List>` (line 237-243), add before the Help tab:

```jsx
          <Tabs.Tab value="apikey">API Key</Tabs.Tab>
```

- [ ] **Step 5: Verify the settings modal renders correctly**

Run: `cd /Users/andys/Documents/Projects/Canvas-LMS-Task-Manager && npm run client`
Expected: Dev server starts. Open the app, go to Settings. A new "API Key" tab should appear between "Reminders" and "Help".

- [ ] **Step 6: Commit**

```bash
git add client/src/components/SettingsModal.jsx
git commit -m "feat: wire API key tab into settings modal"
```

---

### Task 7: Manual End-to-End Verification

- [ ] **Step 1: Start the full dev server**

Run: `cd /Users/andys/Documents/Projects/Canvas-LMS-Task-Manager && npm run dev`

- [ ] **Step 2: Generate an API key via the UI**

Open the app → Settings → API Key tab → click "Generate API Key". Copy the returned key.

- [ ] **Step 3: Test API key auth with curl — allowed endpoint**

```bash
curl -s http://localhost:3001/api/events \
  -H "Authorization: Bearer <YOUR_KEY>" | head -c 200
```

Expected: JSON array of events (or `[]` if none exist).

- [ ] **Step 4: Test API key auth with curl — denied endpoint**

```bash
curl -s http://localhost:3001/api/reset-data \
  -X POST \
  -H "Authorization: Bearer <YOUR_KEY>" \
  -H "Content-Type: application/json"
```

Expected: `{"message":"This endpoint is not available via API key"}`

- [ ] **Step 5: Test status update**

```bash
curl -s http://localhost:3001/api/events/<EVENT_ID> \
  -X PATCH \
  -H "Authorization: Bearer <YOUR_KEY>" \
  -H "Content-Type: application/json" \
  -d '{"status":"complete"}'
```

Expected: JSON of the updated event with `"status":"complete"`.

- [ ] **Step 6: Test invalid key**

```bash
curl -s http://localhost:3001/api/events \
  -H "Authorization: Bearer ctm_invalid"
```

Expected: `{"message":"Invalid API key"}`

- [ ] **Step 7: Test revoke via UI**

Go to Settings → API Key → Revoke. Then re-run the curl from Step 3.
Expected: `{"message":"Invalid API key"}`

- [ ] **Step 8: Commit any fixes if needed, then final commit**

```bash
git add -A
git commit -m "feat: API key authentication for external app access"
```
