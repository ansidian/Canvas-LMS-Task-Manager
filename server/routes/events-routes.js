import { Router } from "express";
import db from "../db/connection.js";
import { requireUser } from "../middleware/clerk-auth.js";

const router = Router();

router.use(requireUser());

// Get all events
router.get("/", async (req, res) => {
  const userId = req.auth().userId;
  try {
    const result = await db.execute({
      sql: `
        SELECT e.*, c.name as class_name, c.color as class_color
        FROM events e
        LEFT JOIN classes c ON e.class_id = c.id AND c.user_id = ?
        WHERE e.user_id = ?
        ORDER BY e.due_date
      `,
      args: [userId, userId],
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
    points_possible,
    canvas_due_date_override,
  } = req.body;
  try {
    const result = await db.execute({
      sql: `INSERT INTO events (user_id, title, description, due_date, class_id, event_type, status, notes, url, canvas_id, points_possible, canvas_due_date_override)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
        points_possible ?? null,
        canvas_due_date_override ?? 0,
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
    points_possible,
    canvas_due_date_override,
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
    if (points_possible !== undefined) {
      updates.push("points_possible = ?");
      args.push(points_possible);
    }
    if (canvas_due_date_override !== undefined) {
      updates.push("canvas_due_date_override = ?");
      args.push(canvas_due_date_override);
    }

    updates.push("updated_at = CURRENT_TIMESTAMP");
    args.push(id, userId);

    await db.execute({
      sql: `UPDATE events SET ${updates.join(", ")} WHERE id = ? AND user_id = ?`,
      args,
    });

    const updated = await db.execute({
      sql: `SELECT e.*, c.name as class_name, c.color as class_color
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
