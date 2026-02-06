import { createClient } from "@libsql/client";

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;

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

// Find events due in ~6h or ~1h that haven't been notified yet
const result = await db.execute(`
  SELECT e.id, e.title, e.due_date, e.canvas_url, e.status,
         c.name as class_name, c.color as class_color,
         CASE
           WHEN e.due_date BETWEEN datetime('now', '+330 minutes') AND datetime('now', '+390 minutes')
                AND NOT EXISTS (SELECT 1 FROM notification_log nl WHERE nl.event_id = e.id AND nl.notification_type = '6h')
             THEN '6h'
           WHEN e.due_date BETWEEN datetime('now', '+30 minutes') AND datetime('now', '+90 minutes')
                AND NOT EXISTS (SELECT 1 FROM notification_log nl WHERE nl.event_id = e.id AND nl.notification_type = '1h')
             THEN '1h'
         END as notification_type
  FROM events e
  LEFT JOIN classes c ON e.class_id = c.id AND c.user_id = e.user_id
  WHERE e.due_date LIKE '%T%'
    AND e.status != 'complete'
    AND e.due_date > datetime('now')
    AND (
      (e.due_date BETWEEN datetime('now', '+330 minutes') AND datetime('now', '+390 minutes')
       AND NOT EXISTS (SELECT 1 FROM notification_log nl WHERE nl.event_id = e.id AND nl.notification_type = '6h'))
      OR
      (e.due_date BETWEEN datetime('now', '+30 minutes') AND datetime('now', '+90 minutes')
       AND NOT EXISTS (SELECT 1 FROM notification_log nl WHERE nl.event_id = e.id AND nl.notification_type = '1h'))
    )
`);

const events = result.rows;

if (events.length === 0) {
  console.log("No upcoming deadlines to notify about.");
  process.exit(0);
}

console.log(`Found ${events.length} event(s) to notify about.`);

for (const event of events) {
  const dueDate = new Date(event.due_date);
  const nowMs = Date.now();
  const diffMs = dueDate.getTime() - nowMs;
  const diffMinutes = Math.round(diffMs / 60000);
  const hours = Math.floor(diffMinutes / 60);
  const minutes = diffMinutes % 60;

  const timeRemaining =
    hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

  // Format due time in Pacific
  const pacificTime = dueDate.toLocaleString("en-US", {
    timeZone: "America/Los_Angeles",
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
      { name: "Time Remaining", value: timeRemaining, inline: true },
    ],
    footer: {
      text: isUrgent ? "1 hour warning" : "6 hour warning",
    },
    ...(event.canvas_url ? { url: event.canvas_url } : {}),
  };

  const body = {
    content: isUrgent ? "Deadline approaching soon!" : "",
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
