import { Router } from "express";
import db from "../db/connection.js";
import { requireUser } from "../middleware/clerk-auth.js";

const router = Router();
router.use(requireUser());

// Compute remind_at from event's due_date + offset_minutes.
// For all-day events (date-only string or midnight UTC), anchors to 23:59 local-equivalent UTC.
async function computeRemindAt(eventId, offsetMinutes) {
  const result = await db.execute({
    sql: "SELECT due_date FROM events WHERE id = ?",
    args: [eventId],
  });
  if (!result.rows.length) return null;

  const dueDate = result.rows[0].due_date;
  if (!dueDate) return null;

  let dueUtc = new Date(dueDate);
  if (isNaN(dueUtc.getTime())) return null;

  // Detect all-day events: date-only string (no 'T') or time is exactly midnight UTC
  const isDateOnly = !dueDate.includes("T");
  const isMidnightUtc =
    dueUtc.getUTCHours() === 0 &&
    dueUtc.getUTCMinutes() === 0 &&
    dueUtc.getUTCSeconds() === 0;

  if (isDateOnly || isMidnightUtc) {
    // Anchor to 23:59 UTC on the same calendar day so reminders fire end-of-day
    dueUtc = new Date(
      Date.UTC(
        dueUtc.getUTCFullYear(),
        dueUtc.getUTCMonth(),
        dueUtc.getUTCDate(),
        23,
        59,
        0,
      ),
    );
  }

  const remindAt = new Date(dueUtc.getTime() + offsetMinutes * 60_000);
  return remindAt.toISOString();
}

// GET /api/reminders?event_id=:id
router.get("/", async (req, res) => {
  const userId = req.auth().userId;
  const { event_id } = req.query;
  if (!event_id) {
    return res.status(400).json({ message: "event_id is required" });
  }
  try {
    // Verify event belongs to user
    const eventCheck = await db.execute({
      sql: "SELECT id FROM events WHERE id = ? AND user_id = ?",
      args: [event_id, userId],
    });
    if (!eventCheck.rows.length) {
      return res.status(404).json({ message: "Event not found" });
    }

    const result = await db.execute({
      sql: "SELECT * FROM reminders WHERE event_id = ? ORDER BY offset_minutes ASC",
      args: [event_id],
    });
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching reminders:", err);
    res.status(500).json({ message: "Failed to fetch reminders" });
  }
});

// POST /api/reminders — { event_id, offset_minutes }
router.post("/", async (req, res) => {
  const userId = req.auth().userId;
  const { event_id, offset_minutes } = req.body;

  if (event_id == null || offset_minutes == null) {
    return res.status(400).json({ message: "event_id and offset_minutes are required" });
  }

  try {
    // Verify event belongs to user
    const eventCheck = await db.execute({
      sql: "SELECT id FROM events WHERE id = ? AND user_id = ?",
      args: [event_id, userId],
    });
    if (!eventCheck.rows.length) {
      return res.status(404).json({ message: "Event not found" });
    }

    const remindAt = await computeRemindAt(event_id, offset_minutes);

    const insert = await db.execute({
      sql: "INSERT INTO reminders (event_id, offset_minutes, remind_at) VALUES (?, ?, ?)",
      args: [event_id, offset_minutes, remindAt],
    });

    const newReminder = await db.execute({
      sql: "SELECT * FROM reminders WHERE id = ?",
      args: [insert.lastInsertRowid],
    });
    res.status(201).json(newReminder.rows[0]);
  } catch (err) {
    console.error("Error creating reminder:", err);
    res.status(500).json({ message: "Failed to create reminder" });
  }
});

// DELETE /api/reminders/:id
router.delete("/:id", async (req, res) => {
  const userId = req.auth().userId;
  const { id } = req.params;

  try {
    // Verify ownership via join
    const check = await db.execute({
      sql: `SELECT r.id FROM reminders r
            JOIN events e ON r.event_id = e.id
            WHERE r.id = ? AND e.user_id = ?`,
      args: [id, userId],
    });
    if (!check.rows.length) {
      return res.status(404).json({ message: "Reminder not found" });
    }

    await db.execute({ sql: "DELETE FROM reminders WHERE id = ?", args: [id] });
    res.json({ success: true });
  } catch (err) {
    console.error("Error deleting reminder:", err);
    res.status(500).json({ message: "Failed to delete reminder" });
  }
});

// PATCH /api/reminders/reset — recompute remind_at for all unsent reminders of an event
// { event_id }
router.patch("/reset", async (req, res) => {
  const userId = req.auth().userId;
  const { event_id } = req.body;

  if (!event_id) {
    return res.status(400).json({ message: "event_id is required" });
  }

  try {
    // Verify event belongs to user
    const eventCheck = await db.execute({
      sql: "SELECT id FROM events WHERE id = ? AND user_id = ?",
      args: [event_id, userId],
    });
    if (!eventCheck.rows.length) {
      return res.status(404).json({ message: "Event not found" });
    }

    const reminders = await db.execute({
      sql: "SELECT id, offset_minutes FROM reminders WHERE event_id = ? AND sent = 0",
      args: [event_id],
    });

    for (const reminder of reminders.rows) {
      const remindAt = await computeRemindAt(event_id, reminder.offset_minutes);
      await db.execute({
        sql: "UPDATE reminders SET remind_at = ?, sent = 0, retry_count = 0 WHERE id = ?",
        args: [remindAt, reminder.id],
      });
    }

    res.json({ updated: reminders.rows.length });
  } catch (err) {
    console.error("Error resetting reminders:", err);
    res.status(500).json({ message: "Failed to reset reminders" });
  }
});

// POST /api/reminders/test — fire a test Discord message immediately
router.post("/test", async (req, res) => {
  const userId = req.auth().userId;

  try {
    const settingsResult = await db.execute({
      sql: "SELECT discord_webhook FROM settings WHERE user_id = ?",
      args: [userId],
    });
    const webhookUrl = settingsResult.rows[0]?.discord_webhook;
    if (!webhookUrl) {
      return res.status(400).json({ message: "No Discord webhook configured" });
    }

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        embeds: [
          {
            title: "⏰ Test Reminder",
            description: "Your Discord webhook is working! Reminders will be sent here.",
            color: 0x5b8dd9,
          },
        ],
      }),
    });

    if (response.status === 429) {
      const retryAfter = response.headers.get("retry-after") || "60";
      return res.status(429).json({
        message: `Discord is rate-limiting requests. Try again in ${retryAfter} seconds.`,
      });
    }

    if (!response.ok) {
      const text = await response.text();
      return res.status(502).json({ message: `Discord returned ${response.status}: ${text}` });
    }

    res.json({ success: true });
  } catch (err) {
    console.error("Error sending test webhook:", err);
    res.status(500).json({ message: "Failed to send test reminder" });
  }
});

export default router;
