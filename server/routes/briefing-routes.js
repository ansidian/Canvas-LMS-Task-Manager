import { Router } from "express";
import db from "../db/connection.js";
import { generateBriefing, quickRefresh } from "../briefing/index.js";
import { fetchEmailBody as fetchGmailBody } from "../briefing/gmail.js";
import { fetchEmailBody as fetchIcloudBody } from "../briefing/icloud.js";
import { decrypt } from "../briefing/encryption.js";
import { sendBill, testConnection as testActual } from "../briefing/actual.js";

const EA_API_KEY = process.env.EA_API_KEY;

function requireApiKey(req, res, next) {
  const key = req.headers["x-api-key"];
  if (!EA_API_KEY || key !== EA_API_KEY) {
    return res.status(401).json({ message: "Invalid or missing API key" });
  }
  next();
}

const router = Router();
router.use(requireApiKey);

// Minimum minutes between full AI generations (prevents accidental Haiku cost)
const GENERATION_COOLDOWN_MINUTES = 10;

// POST /api/briefing/generate — full AI briefing generation (Haiku call)
// Client should poll GET /api/briefing/status/:id until status = "ready"
router.post("/generate", async (req, res) => {
  const userId = process.env.EA_USER_ID;
  const force = req.body?.force === true;

  try {
    // Cooldown check: if a briefing was generated recently, return it instead
    if (!force) {
      const recent = await db.execute({
        sql: `SELECT id, generated_at, briefing_json FROM ea_briefings
              WHERE user_id = ? AND status = 'ready'
              ORDER BY generated_at DESC LIMIT 1`,
        args: [userId],
      });

      if (recent.rows.length) {
        const generatedAt = new Date(recent.rows[0].generated_at + "Z").getTime();
        const minutesAgo = (Date.now() - generatedAt) / 60000;

        if (minutesAgo < GENERATION_COOLDOWN_MINUTES) {
          return res.json({
            id: recent.rows[0].id,
            status: "cooldown",
            minutesRemaining: Math.ceil(GENERATION_COOLDOWN_MINUTES - minutesAgo),
            message: `AI briefing was generated ${Math.floor(minutesAgo)}m ago. Next generation available in ${Math.ceil(GENERATION_COOLDOWN_MINUTES - minutesAgo)}m.`,
          });
        }
      }
    }

    // Fire async — generateBriefing creates its own ea_briefings row
    generateBriefing(userId).catch((err) =>
      console.error("[Briefing] Generation failed:", err.message),
    );

    // Brief delay to let the INSERT happen, then return the row ID for polling
    await new Promise((r) => setTimeout(r, 100));
    const latest = await db.execute({
      sql: `SELECT id FROM ea_briefings WHERE user_id = ? ORDER BY id DESC LIMIT 1`,
      args: [userId],
    });

    res.json({ id: latest.rows[0]?.id, status: "generating" });
  } catch (err) {
    console.error("Error triggering briefing:", err);
    res.status(500).json({ message: "Failed to trigger briefing generation" });
  }
});

// POST /api/briefing/refresh — quick data refresh (no AI, no Haiku cost)
// Updates weather, calendar, deadlines, raw emails. Preserves existing AI insights.
// Returns the updated briefing synchronously (fast, ~2-5s).
router.post("/refresh", async (req, res) => {
  const userId = process.env.EA_USER_ID;
  try {
    const result = await quickRefresh(userId);
    res.json(result);
  } catch (err) {
    console.error("Error refreshing briefing:", err);
    res.status(500).json({ message: "Failed to refresh briefing data" });
  }
});

// GET /api/briefing/latest — get most recent ready briefing
router.get("/latest", async (req, res) => {
  const userId = process.env.EA_USER_ID;
  try {
    const result = await db.execute({
      sql: `SELECT id, status, briefing_json, generated_at, generation_time_ms
            FROM ea_briefings
            WHERE user_id = ? AND status = 'ready'
            ORDER BY generated_at DESC LIMIT 1`,
      args: [userId],
    });

    if (!result.rows.length) {
      return res.json({ briefing: null });
    }

    const row = result.rows[0];
    res.json({
      id: row.id,
      status: row.status,
      briefing: JSON.parse(row.briefing_json),
      generated_at: row.generated_at,
      generation_time_ms: row.generation_time_ms,
    });
  } catch (err) {
    console.error("Error fetching latest briefing:", err);
    res.status(500).json({ message: "Failed to fetch latest briefing" });
  }
});

// GET /api/briefing/history — last 20 briefings (metadata only)
router.get("/history", async (req, res) => {
  const userId = process.env.EA_USER_ID;
  try {
    const result = await db.execute({
      sql: `SELECT id, status, generated_at, generation_time_ms, error_message
            FROM ea_briefings
            WHERE user_id = ?
            ORDER BY generated_at DESC LIMIT 20`,
      args: [userId],
    });
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching briefing history:", err);
    res.status(500).json({ message: "Failed to fetch briefing history" });
  }
});

// GET /api/briefing/status/:id — poll generation status
router.get("/status/:id", async (req, res) => {
  const userId = process.env.EA_USER_ID;
  const { id } = req.params;
  try {
    const result = await db.execute({
      sql: `SELECT id, status, error_message, generation_time_ms
            FROM ea_briefings WHERE id = ? AND user_id = ?`,
      args: [id, userId],
    });

    if (!result.rows.length) {
      return res.status(404).json({ message: "Briefing not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error fetching briefing status:", err);
    res.status(500).json({ message: "Failed to fetch briefing status" });
  }
});

// GET /api/briefing/email/:uid — fetch full email body
router.get("/email/:uid", async (req, res) => {
  const userId = process.env.EA_USER_ID;
  const { uid } = req.params;

  try {
    if (uid.startsWith("icloud-")) {
      // iCloud email — need to find the account and decrypt password
      const accounts = await db.execute({
        sql: "SELECT * FROM ea_accounts WHERE user_id = ? AND type = 'icloud'",
        args: [userId],
      });
      if (!accounts.rows.length) {
        return res.status(404).json({ message: "No iCloud account found" });
      }
      const account = accounts.rows[0];
      const password = decrypt(account.credentials_encrypted);
      const body = await fetchIcloudBody(account.email, password, uid);
      return res.json(body);
    } else {
      // Gmail email — find account that has this message
      const accounts = await db.execute({
        sql: "SELECT * FROM ea_accounts WHERE user_id = ? AND type = 'gmail'",
        args: [userId],
      });
      // Try each Gmail account until we find the message
      for (const account of accounts.rows) {
        try {
          const body = await fetchGmailBody(account, uid);
          return res.json(body);
        } catch {
          continue;
        }
      }
      return res.status(404).json({ message: "Email not found in any account" });
    }
  } catch (err) {
    console.error("Error fetching email body:", err);
    res.status(500).json({ message: "Failed to fetch email body" });
  }
});

// GET /api/briefing/:id — fetch a specific briefing by ID (for history viewing)
router.get("/:id", async (req, res) => {
  const userId = process.env.EA_USER_ID;
  const { id } = req.params;
  try {
    const result = await db.execute({
      sql: `SELECT id, status, briefing_json, generated_at, generation_time_ms
            FROM ea_briefings WHERE id = ? AND user_id = ? AND status = 'ready'`,
      args: [id, userId],
    });

    if (!result.rows.length) {
      return res.status(404).json({ message: "Briefing not found" });
    }

    const row = result.rows[0];
    res.json({
      id: row.id,
      status: row.status,
      briefing: JSON.parse(row.briefing_json),
      generated_at: row.generated_at,
      generation_time_ms: row.generation_time_ms,
    });
  } catch (err) {
    console.error("Error fetching briefing by ID:", err);
    res.status(500).json({ message: "Failed to fetch briefing" });
  }
});

// POST /api/briefing/actual/send — send bill to Actual Budget
router.post("/actual/send", async (req, res) => {
  const userId = process.env.EA_USER_ID;
  const billData = req.body;

  if (!billData?.payee || !billData?.amount || !billData?.type) {
    return res.status(400).json({ message: "payee, amount, and type are required" });
  }

  try {
    const result = await sendBill(billData, userId);
    res.json(result);
  } catch (err) {
    console.error("Error sending to Actual Budget:", err);
    res.status(500).json({ message: err.message });
  }
});

// POST /api/briefing/actual/test — test Actual Budget connection
router.post("/actual/test", async (req, res) => {
  const userId = process.env.EA_USER_ID;
  try {
    const result = await testActual(userId);
    res.json(result);
  } catch (err) {
    console.error("Actual Budget test failed:", err.message);
    res.status(400).json({ message: err.message || "Connection failed" });
  }
});

export default router;
