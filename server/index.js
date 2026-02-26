import "dotenv/config";
import express from "express";
import cors from "cors";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { clerkMiddleware } from "@clerk/express";
import apiRoutes from "./routes/index.js";
import db from "./db/connection.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
app.use(clerkMiddleware());
app.use("/api", apiRoutes);

// Serve static files in production
if (process.env.NODE_ENV === "production") {
  app.use(express.static(join(__dirname, "../client/dist")));
}

// SPA fallback for production
if (process.env.NODE_ENV === "production") {
  app.get("*", (req, res) => {
    res.sendFile(join(__dirname, "../client/dist/index.html"));
  });
}

// --- Discord Reminder Scheduler ---

function formatOffsetLabel(offsetMinutes) {
  if (offsetMinutes === 0) return "at due time";
  const abs = Math.abs(offsetMinutes);
  const direction = offsetMinutes < 0 ? "before" : "after";
  if (abs < 60) return `${abs} minute${abs !== 1 ? "s" : ""} ${direction}`;
  if (abs < 1440) {
    const h = abs / 60;
    return `${h} hour${h !== 1 ? "s" : ""} ${direction}`;
  }
  const d = abs / 1440;
  return `${d} day${d !== 1 ? "s" : ""} ${direction}`;
}

async function sendDiscordWebhook(webhookUrl, reminder) {
  const label = formatOffsetLabel(reminder.offset_minutes);
  const dueDisplay = reminder.due_date
    ? new Date(reminder.due_date).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : "Unknown";

  const deeplink = process.env.APP_URL
    ? `${process.env.APP_URL}/#/event/${reminder.event_id}`
    : reminder.url;

  const body = {
    embeds: [
      {
        title: `⏰ ${reminder.title}`,
        description: `**Due:** ${dueDisplay}\n**Reminder:** ${label}`,
        color: 0x5b8dd9,
        ...(deeplink ? { url: deeplink } : {}),
      },
    ],
  };

  const res = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Discord webhook failed (${res.status}): ${text}`);
  }
}

async function checkReminders() {
  try {
    const now = new Date().toISOString();

    // Fetch all unsent due reminders, grouped by user so we can look up their webhook
    const due = await db.execute({
      sql: `SELECT r.id, r.event_id, r.offset_minutes, e.title, e.due_date, e.url, e.user_id
            FROM reminders r
            JOIN events e ON r.event_id = e.id
            WHERE r.sent = 0 AND r.remind_at <= ?`,
      args: [now],
    });

    if (!due.rows.length) return;

    // Group by user_id to batch webhook lookups
    const byUser = {};
    for (const row of due.rows) {
      if (!byUser[row.user_id]) byUser[row.user_id] = [];
      byUser[row.user_id].push(row);
    }

    for (const [userId, reminders] of Object.entries(byUser)) {
      const settingsResult = await db.execute({
        sql: "SELECT discord_webhook FROM settings WHERE user_id = ?",
        args: [userId],
      });
      const webhookUrl = settingsResult.rows[0]?.discord_webhook;
      if (!webhookUrl) continue;

      for (const reminder of reminders) {
        try {
          await sendDiscordWebhook(webhookUrl, reminder);
          await db.execute({
            sql: "UPDATE reminders SET sent = 1 WHERE id = ?",
            args: [reminder.id],
          });
        } catch (err) {
          console.error(`Failed to send reminder ${reminder.id}:`, err.message);
        }
      }
    }
  } catch (err) {
    console.error("Reminder scheduler error:", err);
  }
}

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  setInterval(checkReminders, 10_000);
});
