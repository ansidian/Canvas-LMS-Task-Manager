import { createClient } from "@libsql/client";

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;
const DISCORD_USER_ID = process.env.DISCORD_USER_ID;
const CLERK_USER_ID = process.env.CLERK_USER_ID;
const USER_TIMEZONE = "America/Los_Angeles";

// Ensure notification_log table exists
await db.execute(`
  CREATE TABLE IF NOT EXISTS notification_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id INTEGER NOT NULL,
    notification_type TEXT NOT NULL,
    sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(event_id, notification_type)
  )
`);

/**
 * Parse a due_date string into a proper UTC Date object.
 * Canvas dates have a Z suffix and are already UTC.
 * Todoist dates are floating local time (no timezone) — interpret as Pacific.
 */
function parseDueDateToUTC(dueDateStr) {
  if (!dueDateStr) return null;

  // Already has explicit timezone info — parse directly
  if (/Z$|[+-]\d{2}:\d{2}$/.test(dueDateStr)) {
    return new Date(dueDateStr);
  }

  // Floating local time (e.g. Todoist "2026-02-19T08:00:00") — interpret as Pacific.
  // On GitHub Actions (UTC), new Date() without Z treats it as UTC, which is wrong.
  // Fix: parse as UTC, then use Intl to find the actual Pacific→UTC offset.
  const asUTC = new Date(
    dueDateStr.includes("T") ? dueDateStr + "Z" : dueDateStr + "T00:00:00Z"
  );
  const pacificTimeStr = asUTC.toLocaleString("en-US", {
    timeZone: USER_TIMEZONE,
  });
  const pacificAsLocal = new Date(pacificTimeStr);
  const offsetMs = asUTC.getTime() - pacificAsLocal.getTime();

  return new Date(asUTC.getTime() + offsetMs);
}

// Fetch candidate events with a wide SQL window (14h) to account for timezone
// offsets on floating dates. Precise filtering happens in JavaScript below.
const NORM = "replace(replace(e.due_date, 'T', ' '), 'Z', '')";

const result = await db.execute(`
  SELECT e.id, e.title, e.due_date, e.canvas_url, e.status,
         c.name as class_name, c.color as class_color,
         (SELECT 1 FROM notification_log nl WHERE nl.event_id = e.id AND nl.notification_type = '6h') as has_6h,
         (SELECT 1 FROM notification_log nl WHERE nl.event_id = e.id AND nl.notification_type = '1h') as has_1h
  FROM events e
  LEFT JOIN classes c ON e.class_id = c.id AND c.user_id = e.user_id
  WHERE e.user_id = '${CLERK_USER_ID}'
    AND e.due_date LIKE '%T%'
    AND e.status != 'complete'
    AND (e.todoist_id IS NULL OR e.todoist_id = '')
    AND ${NORM} > datetime('now', '-480 minutes')
    AND ${NORM} <= datetime('now', '+840 minutes')
    AND (
      NOT EXISTS (SELECT 1 FROM notification_log nl WHERE nl.event_id = e.id AND nl.notification_type = '6h')
      OR NOT EXISTS (SELECT 1 FROM notification_log nl WHERE nl.event_id = e.id AND nl.notification_type = '1h')
    )
`);

// Filter with proper timezone handling
const now = Date.now();
const events = [];

for (const row of result.rows) {
  const dueUTC = parseDueDateToUTC(row.due_date);
  if (!dueUTC) continue;

  const diffMinutes = (dueUTC.getTime() - now) / 60000;

  // Must be in the future and within 6 hours
  if (diffMinutes <= 0 || diffMinutes > 360) continue;

  let notification_type = null;
  if (diffMinutes <= 60 && !row.has_1h) {
    notification_type = "1h";
  } else if (!row.has_6h) {
    notification_type = "6h";
  }

  if (!notification_type) continue;

  events.push({ ...row, notification_type, _dueUTC: dueUTC });
}

if (events.length === 0) {
  console.log("No upcoming deadlines to notify about.");
  process.exit(0);
}

console.log(`Found ${events.length} event(s) to notify about.`);

for (const event of events) {
  const dueDate = event._dueUTC;
  const diffMs = dueDate.getTime() - now;
  const diffMinutes = Math.round(diffMs / 60000);
  const hours = Math.floor(diffMinutes / 60);
  const minutes = diffMinutes % 60;

  const timeRemaining =
    hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

  // Format due time in Pacific
  const pacificTime = dueDate.toLocaleString("en-US", {
    timeZone: USER_TIMEZONE,
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  const isUrgent = event.notification_type === "1h";
  const color = isUrgent
    ? 0xff4444 // red for 1h
    : 0xffaa00; // orange for 6h

  const embed = {
    color,
    title: event.title,
    fields: [
      ...(event.class_name
        ? [{ name: "Class", value: event.class_name, inline: true }]
        : []),
      { name: "Due", value: pacificTime, inline: true },
    ],
    footer: {
      text: `Due in ${timeRemaining}`,
    },
    ...(event.canvas_url ? { url: event.canvas_url } : {}),
  };

  const body = {
    content: DISCORD_USER_ID
      ? `<@${DISCORD_USER_ID}> ${isUrgent ? "Deadline approaching soon!" : ""}`
      : isUrgent ? "Deadline approaching soon!" : "",
    embeds: [embed],
  };

  const res = await fetch(WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (res.ok) {
    await db.execute({
      sql: "INSERT OR IGNORE INTO notification_log (event_id, notification_type) VALUES (?, ?)",
      args: [event.id, event.notification_type],
    });
    console.log(
      `Notified: "${event.title}" (${event.notification_type} warning)`
    );
  } else {
    console.error(
      `Failed to notify for "${event.title}": ${res.status} ${res.statusText}`
    );
  }
}

console.log("Done.");
