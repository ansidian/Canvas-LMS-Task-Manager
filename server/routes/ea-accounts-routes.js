import { Router } from "express";
import db from "../db/connection.js";
import { requireUser } from "../middleware/clerk-auth.js";
import { encrypt, decrypt } from "../briefing/encryption.js";
import {
  getAuthUrl,
  handleCallback,
  testConnection as testGmail,
} from "../briefing/gmail.js";
import {
  testConnection as testIcloud,
} from "../briefing/icloud.js";

const router = Router();

// Gmail OAuth callback does NOT require Clerk auth (it's a redirect from Google)
router.get("/accounts/gmail/callback", async (req, res) => {
  const { code, state: accountId } = req.query;
  if (!code || !accountId) {
    return res.status(400).send("Missing code or state parameter");
  }

  try {
    // The accountId encodes "userId:label" — extract userId
    const [userId, label] = accountId.split(":");
    const result = await handleCallback(code, accountId, userId);

    // Update label if provided
    if (label) {
      await db.execute({
        sql: "UPDATE ea_accounts SET label = ? WHERE id = ?",
        args: [label, accountId],
      });
    }

    // Redirect back to the dashboard settings page
    const redirectUrl = process.env.EA_FRONTEND_URL || process.env.APP_URL || "/";
    res.redirect(`${redirectUrl}?account_connected=${result.email}`);
  } catch (err) {
    console.error("Gmail OAuth callback error:", err);
    res.status(500).send(`OAuth failed: ${err.message}`);
  }
});

// All other routes require auth
router.use(requireUser());

// GET /api/ea/accounts — list connected accounts
router.get("/accounts", async (req, res) => {
  const userId = req.auth().userId;
  try {
    const result = await db.execute({
      sql: "SELECT id, type, email, label, color, created_at FROM ea_accounts WHERE user_id = ?",
      args: [userId],
    });
    res.json(result.rows);
  } catch (err) {
    console.error("Error listing accounts:", err);
    res.status(500).json({ message: "Failed to list accounts" });
  }
});

// GET /api/ea/accounts/gmail/auth — start OAuth flow
router.get("/accounts/gmail/auth", async (req, res) => {
  const userId = req.auth().userId;
  const label = req.query.label || "Gmail";
  // Encode userId and label into the state param
  const accountId = `${userId}:${label}`;
  const url = getAuthUrl(accountId);
  res.json({ url });
});

// POST /api/ea/accounts/icloud — add iCloud account
router.post("/accounts/icloud", async (req, res) => {
  const userId = req.auth().userId;
  const { email, password, label, color } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "email and password (app-specific) are required" });
  }

  try {
    // Test the connection first
    await testIcloud(email, password);

    const accountId = `icloud-${email.split("@")[0]}`;
    await db.execute({
      sql: `INSERT INTO ea_accounts (id, user_id, type, email, label, color, credentials_encrypted)
            VALUES (?, ?, 'icloud', ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
              credentials_encrypted = excluded.credentials_encrypted,
              label = excluded.label,
              color = excluded.color,
              updated_at = datetime('now')`,
      args: [
        accountId,
        userId,
        email,
        label || email,
        color || "#a259ff",
        encrypt(password),
      ],
    });

    res.json({ id: accountId, email, label: label || email });
  } catch (err) {
    console.error("Error adding iCloud account:", err);
    res.status(400).json({ message: err.message });
  }
});

// POST /api/ea/accounts/test/:id — test account connection
router.post("/accounts/test/:id", async (req, res) => {
  const userId = req.auth().userId;
  const { id } = req.params;

  try {
    const result = await db.execute({
      sql: "SELECT * FROM ea_accounts WHERE id = ? AND user_id = ?",
      args: [id, userId],
    });
    if (!result.rows.length) {
      return res.status(404).json({ message: "Account not found" });
    }

    const account = result.rows[0];
    if (account.type === "gmail") {
      await testGmail(account);
    } else if (account.type === "icloud") {
      const password = decrypt(account.credentials_encrypted);
      await testIcloud(account.email, password);
    }

    res.json({ success: true });
  } catch (err) {
    console.error("Error testing account:", err);
    res.status(400).json({ message: err.message });
  }
});

// DELETE /api/ea/accounts/:id — remove account
router.delete("/accounts/:id", async (req, res) => {
  const userId = req.auth().userId;
  const { id } = req.params;

  try {
    const result = await db.execute({
      sql: "DELETE FROM ea_accounts WHERE id = ? AND user_id = ?",
      args: [id, userId],
    });
    if (result.rowsAffected === 0) {
      return res.status(404).json({ message: "Account not found" });
    }
    res.json({ success: true });
  } catch (err) {
    console.error("Error deleting account:", err);
    res.status(500).json({ message: "Failed to delete account" });
  }
});

// GET /api/ea/settings — get EA settings
router.get("/settings", async (req, res) => {
  const userId = req.auth().userId;
  try {
    let result = await db.execute({
      sql: "SELECT * FROM ea_settings WHERE user_id = ?",
      args: [userId],
    });

    if (!result.rows.length) {
      // Create default settings
      await db.execute({
        sql: "INSERT INTO ea_settings (user_id) VALUES (?)",
        args: [userId],
      });
      result = await db.execute({
        sql: "SELECT * FROM ea_settings WHERE user_id = ?",
        args: [userId],
      });
    }

    const settings = result.rows[0];
    // Don't expose encrypted passwords
    const { actual_budget_password_encrypted, ...safe } = settings;
    safe.actual_budget_configured = !!actual_budget_password_encrypted;
    res.json(safe);
  } catch (err) {
    console.error("Error fetching EA settings:", err);
    res.status(500).json({ message: "Failed to fetch settings" });
  }
});

// PUT /api/ea/settings — update EA settings
router.put("/settings", async (req, res) => {
  const userId = req.auth().userId;
  const {
    schedules_json,
    email_lookback_hours,
    weather_lat,
    weather_lng,
    weather_location,
    actual_budget_url,
    actual_budget_password,
    actual_budget_sync_id,
  } = req.body;

  try {
    // Ensure row exists
    await db.execute({
      sql: "INSERT OR IGNORE INTO ea_settings (user_id) VALUES (?)",
      args: [userId],
    });

    const updates = [];
    const args = [];

    if (schedules_json !== undefined) {
      updates.push("schedules_json = ?");
      args.push(
        typeof schedules_json === "string"
          ? schedules_json
          : JSON.stringify(schedules_json),
      );
    }
    if (email_lookback_hours !== undefined) {
      updates.push("email_lookback_hours = ?");
      args.push(email_lookback_hours);
    }
    if (weather_lat !== undefined) {
      updates.push("weather_lat = ?");
      args.push(weather_lat);
    }
    if (weather_lng !== undefined) {
      updates.push("weather_lng = ?");
      args.push(weather_lng);
    }
    if (weather_location !== undefined) {
      updates.push("weather_location = ?");
      args.push(weather_location);
    }
    if (actual_budget_url !== undefined) {
      updates.push("actual_budget_url = ?");
      args.push(actual_budget_url);
    }
    if (actual_budget_password !== undefined) {
      updates.push("actual_budget_password_encrypted = ?");
      args.push(actual_budget_password ? encrypt(actual_budget_password) : null);
    }
    if (actual_budget_sync_id !== undefined) {
      updates.push("actual_budget_sync_id = ?");
      args.push(actual_budget_sync_id);
    }

    if (updates.length > 0) {
      args.push(userId);
      await db.execute({
        sql: `UPDATE ea_settings SET ${updates.join(", ")} WHERE user_id = ?`,
        args,
      });
    }

    res.json({ success: true });
  } catch (err) {
    console.error("Error updating EA settings:", err);
    res.status(500).json({ message: "Failed to update settings" });
  }
});

export default router;
