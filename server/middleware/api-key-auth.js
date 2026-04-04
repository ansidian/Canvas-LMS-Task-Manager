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
