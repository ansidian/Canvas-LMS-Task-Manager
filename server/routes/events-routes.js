import { Router } from "express";
import db from "../db/connection.js";
import { requireUser } from "../middleware/clerk-auth.js";

const router = Router();

router.use(requireUser());

// Get events (supports optional query params: status, due_after, due_before, exclude_source)
router.get("/", async (req, res) => {
  const userId = req.auth().userId;
  const { status, due_after, due_before, exclude_source } = req.query;
  try {
    const conditions = ["e.user_id = ?"];
    const args = [userId];

    if (status) {
      const statuses = status.split(",").map((s) => s.trim());
      conditions.push(`e.status IN (${statuses.map(() => "?").join(", ")})`);
      args.push(...statuses);
    }
    if (due_after) {
      conditions.push("substr(e.due_date, 1, 10) >= ?");
      args.push(due_after);
    }
    if (due_before) {
      conditions.push("substr(e.due_date, 1, 10) <= ?");
      args.push(due_before);
    }
    if (exclude_source) {
      const sources = exclude_source.split(",").map((s) => s.trim());
      for (const source of sources) {
        if (source === "todoist") conditions.push("e.todoist_id IS NULL");
        else if (source === "canvas") conditions.push("e.canvas_id IS NULL");
        else if (source === "manual") conditions.push("(e.canvas_id IS NOT NULL OR e.todoist_id IS NOT NULL)");
      }
    }

    const result = await db.execute({
      sql: `
        SELECT e.*, c.name as class_name, c.color as class_color,
          (SELECT COUNT(*) FROM reminders r WHERE r.event_id = e.id AND r.sent = 0) as reminder_count
        FROM events e
        LEFT JOIN classes c ON e.class_id = c.id AND c.user_id = ?
        WHERE ${conditions.join(" AND ")}
        ORDER BY e.due_date
      `,
      args: [userId, ...args],
    });
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching events:", err);
    res.status(500).json({ message: "Failed to fetch events" });
  }
});

// Create event
router.post("/", async (req, res) => {
  const userId = req.auth().userId;
  const {
    title,
    description,
    due_date,
    class_id,
    event_type,
    status,
    notes,
    url,
    canvas_id,
    todoist_id,
    points_possible,
    canvas_due_date_override,
    canvas_status_override,
  } = req.body;
  try {
    const result = await db.execute({
      sql: `INSERT INTO events (user_id, title, description, due_date, class_id, event_type, status, notes, url, canvas_id, todoist_id, points_possible, canvas_due_date_override, canvas_status_override)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        userId,
        title,
        description ?? null,
        due_date,
        class_id || null,
        event_type,
        status || "incomplete",
        notes ?? null,
        url ?? null,
        canvas_id ?? null,
        todoist_id ?? null,
        points_possible ?? null,
        canvas_due_date_override ?? 0,
        canvas_status_override ?? 0,
      ],
    });
    const newEvent = await db.execute({
      sql: `SELECT e.*, c.name as class_name, c.color as class_color
            FROM events e
            LEFT JOIN classes c ON e.class_id = c.id AND c.user_id = ?
            WHERE e.id = ? AND e.user_id = ?`,
      args: [userId, result.lastInsertRowid, userId],
    });
    res.status(201).json(newEvent.rows[0]);
  } catch (err) {
    console.error("Error creating event:", err);
    res.status(500).json({ message: "Failed to create event" });
  }
});

// Update event
router.patch("/:id", async (req, res) => {
  const userId = req.auth().userId;
  const { id } = req.params;
  const {
    title,
    description,
    due_date,
    class_id,
    event_type,
    status,
    notes,
    url,
    todoist_id,
    points_possible,
    canvas_due_date_override,
    canvas_status_override,
  } = req.body;

  try {
    // Build update query dynamically based on provided fields
    const updates = [];
    const args = [];

    if (title !== undefined) {
      updates.push("title = ?");
      args.push(title);
    }
    if (description !== undefined) {
      updates.push("description = ?");
      args.push(description);
    }
    if (due_date !== undefined) {
      updates.push("due_date = ?");
      args.push(due_date);
    }
    if (class_id !== undefined) {
      updates.push("class_id = ?");
      args.push(class_id);
    }
    if (event_type !== undefined) {
      updates.push("event_type = ?");
      args.push(event_type);
    }
    if (status !== undefined) {
      updates.push("status = ?");
      args.push(status);
    }
    if (notes !== undefined) {
      updates.push("notes = ?");
      args.push(notes);
    }
    if (url !== undefined) {
      updates.push("url = ?");
      args.push(url);
    }
    if (todoist_id !== undefined) {
      updates.push("todoist_id = ?");
      args.push(todoist_id);
    }
    if (points_possible !== undefined) {
      updates.push("points_possible = ?");
      args.push(points_possible);
    }
    if (canvas_due_date_override !== undefined) {
      updates.push("canvas_due_date_override = ?");
      args.push(canvas_due_date_override);
    }
    if (canvas_status_override !== undefined) {
      updates.push("canvas_status_override = ?");
      args.push(canvas_status_override);
    }

    updates.push("updated_at = CURRENT_TIMESTAMP");
    args.push(id, userId);

    await db.execute({
      sql: `UPDATE events SET ${updates.join(", ")} WHERE id = ? AND user_id = ?`,
      args,
    });

    const updated = await db.execute({
      sql: `SELECT e.*, c.name as class_name, c.color as class_color,
              (SELECT COUNT(*) FROM reminders r WHERE r.event_id = e.id AND r.sent = 0) as reminder_count
            FROM events e
            LEFT JOIN classes c ON e.class_id = c.id AND c.user_id = ?
            WHERE e.id = ? AND e.user_id = ?`,
      args: [userId, id, userId],
    });
    res.json(updated.rows[0]);
  } catch (err) {
    console.error("Error updating event:", err);
    res.status(500).json({ message: "Failed to update event" });
  }
});

// Delete event
router.delete("/:id", async (req, res) => {
  const userId = req.auth().userId;
  const { id } = req.params;
  try {
    await db.execute({
      sql: "DELETE FROM events WHERE id = ? AND user_id = ?",
      args: [id, userId],
    });
    res.json({ success: true });
  } catch (err) {
    console.error("Error deleting event:", err);
    res.status(500).json({ message: "Failed to delete event" });
  }
});

export default router;
