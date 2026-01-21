import { Router } from "express";
import db from "../db/connection.js";
import { requireUser } from "../middleware/clerk-auth.js";

const router = Router();

router.use(requireUser());

// Get all classes
router.get("/", async (req, res) => {
  const userId = req.auth().userId;
  try {
    const result = await db.execute({
      sql: "SELECT * FROM classes WHERE user_id = ? ORDER BY sort_order, name",
      args: [userId],
    });
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching classes:", err);
    res.status(500).json({ message: "Failed to fetch classes" });
  }
});

// Create class
router.post("/", async (req, res) => {
  const userId = req.auth().userId;
  const { name, color, canvas_course_id } = req.body;
  try {
    const maxSortOrderResult = await db.execute({
      sql: "SELECT COALESCE(MAX(sort_order), -1) AS max_sort_order FROM classes WHERE user_id = ?",
      args: [userId],
    });
    const maxSortOrder = maxSortOrderResult.rows[0]?.max_sort_order ?? -1;
    const nextSortOrder = Number(maxSortOrder) + 1;

    const result = await db.execute({
      sql: "INSERT INTO classes (user_id, name, color, canvas_course_id, sort_order) VALUES (?, ?, ?, ?, ?)",
      args: [
        userId,
        name,
        color || "#3498db",
        canvas_course_id || null,
        nextSortOrder,
      ],
    });
    const newClass = await db.execute({
      sql: "SELECT * FROM classes WHERE id = ? AND user_id = ?",
      args: [result.lastInsertRowid, userId],
    });
    res.status(201).json(newClass.rows[0]);
  } catch (err) {
    console.error("Error creating class:", err);
    res.status(500).json({ message: "Failed to create class" });
  }
});

// Update class order
router.patch("/order", async (req, res) => {
  const userId = req.auth().userId;
  const { orderedIds } = req.body;

  if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
    return res
      .status(400)
      .json({ message: "orderedIds must be a non-empty array" });
  }

  try {
    for (let index = 0; index < orderedIds.length; index += 1) {
      const classId = orderedIds[index];
      await db.execute({
        sql: "UPDATE classes SET sort_order = ? WHERE id = ? AND user_id = ?",
        args: [index, classId, userId],
      });
    }

    const updated = await db.execute({
      sql: "SELECT * FROM classes WHERE user_id = ? ORDER BY sort_order, name",
      args: [userId],
    });

    res.json(updated.rows);
  } catch (err) {
    console.error("Error updating class order:", err);
    res.status(500).json({ message: "Failed to update class order" });
  }
});

// Update class
router.patch("/:id", async (req, res) => {
  const userId = req.auth().userId;
  const { id } = req.params;
  const { name, color, canvas_course_id, is_synced, sort_order } = req.body;
  try {
    // Build update query dynamically based on provided fields
    const updates = [];
    const args = [];

    if (name !== undefined) {
      updates.push("name = ?");
      args.push(name);
    }
    if (color !== undefined) {
      updates.push("color = ?");
      args.push(color);
    }
    if (canvas_course_id !== undefined) {
      updates.push("canvas_course_id = ?");
      args.push(canvas_course_id);
    }
    if (is_synced !== undefined) {
      updates.push("is_synced = ?");
      args.push(is_synced ? 1 : 0);
    }
    if (sort_order !== undefined) {
      updates.push("sort_order = ?");
      args.push(sort_order);
    }

    if (updates.length === 0) {
      return res.status(400).json({ message: "No fields to update" });
    }

    args.push(id, userId);

    await db.execute({
      sql: `UPDATE classes SET ${updates.join(", ")} WHERE id = ? AND user_id = ?`,
      args,
    });

    const updated = await db.execute({
      sql: "SELECT * FROM classes WHERE id = ? AND user_id = ?",
      args: [id, userId],
    });
    res.json(updated.rows[0]);
  } catch (err) {
    console.error("Error updating class:", err);
    res.status(500).json({ message: "Failed to update class" });
  }
});

// Delete class
router.delete("/:id", async (req, res) => {
  const userId = req.auth().userId;
  const { id } = req.params;
  try {
    // Delete all events associated with this class first
    await db.execute({
      sql: "DELETE FROM events WHERE class_id = ? AND user_id = ?",
      args: [id, userId],
    });

    // Then delete the class
    await db.execute({
      sql: "DELETE FROM classes WHERE id = ? AND user_id = ?",
      args: [id, userId],
    });
    res.json({ success: true });
  } catch (err) {
    console.error("Error deleting class:", err);
    res.status(500).json({ message: "Failed to delete class" });
  }
});

export default router;
