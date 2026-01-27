import { Router } from "express";
import db from "../db/connection.js";
import { requireUser } from "../middleware/clerk-auth.js";

const router = Router();

router.use(requireUser());

// Get settings (creates default if not exists)
router.get("/settings", async (req, res) => {
  const userId = req.auth().userId;
  try {
    // Try to get existing settings
    let result = await db.execute({
      sql: "SELECT * FROM settings WHERE user_id = ?",
      args: [userId],
    });

    // If no settings exist, create default
    if (result.rows.length === 0) {
      await db.execute({
        sql: "INSERT INTO settings (user_id) VALUES (?)",
        args: [userId],
      });
      result = await db.execute({
        sql: "SELECT * FROM settings WHERE user_id = ?",
        args: [userId],
      });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error fetching settings:", err);
    res.status(500).json({ message: "Failed to fetch settings" });
  }
});

// Update settings
router.patch("/settings", async (req, res) => {
  const userId = req.auth().userId;
  const { unassigned_color, canvas_url, canvas_token } = req.body;
  try {
    // Ensure settings exist first
    await db.execute({
      sql: "INSERT OR IGNORE INTO settings (user_id) VALUES (?)",
      args: [userId],
    });

    // Build update query
    const updates = [];
    const args = [];

    if (unassigned_color !== undefined) {
      updates.push("unassigned_color = ?");
      args.push(unassigned_color);
    }
    if (canvas_url !== undefined) {
      updates.push("canvas_url = ?");
      args.push(canvas_url);
    }
    if (canvas_token !== undefined) {
      updates.push("canvas_token = ?");
      args.push(canvas_token);
    }

    if (updates.length === 0) {
      return res.status(400).json({ message: "No fields to update" });
    }

    updates.push("updated_at = CURRENT_TIMESTAMP");
    args.push(userId);

    await db.execute({
      sql: `UPDATE settings SET ${updates.join(", ")} WHERE user_id = ?`,
      args,
    });

    const updated = await db.execute({
      sql: "SELECT * FROM settings WHERE user_id = ?",
      args: [userId],
    });
    res.json(updated.rows[0]);
  } catch (err) {
    console.error("Error updating settings:", err);
    res.status(500).json({ message: "Failed to update settings" });
  }
});

// Add rejected item
router.post("/rejected", async (req, res) => {
  const userId = req.auth().userId;
  const { canvas_id } = req.body;
  try {
    await db.execute({
      sql: "INSERT OR IGNORE INTO rejected_items (user_id, canvas_id) VALUES (?, ?)",
      args: [userId, canvas_id],
    });
    res.status(201).json({ success: true });
  } catch (err) {
    console.error("Error rejecting item:", err);
    res.status(500).json({ message: "Failed to reject item" });
  }
});

// Remove rejected item (for undo)
router.delete("/rejected/:canvasId", async (req, res) => {
  const userId = req.auth().userId;
  const { canvasId } = req.params;
  try {
    await db.execute({
      sql: "DELETE FROM rejected_items WHERE user_id = ? AND canvas_id = ?",
      args: [userId, canvasId],
    });
    res.json({ success: true });
  } catch (err) {
    console.error("Error unreject item:", err);
    res.status(500).json({ message: "Failed to unreject item" });
  }
});

// Reset all user data (keep Canvas credentials and Canvas-linked classes)
router.post("/reset-data", async (req, res) => {
  const userId = req.auth().userId;
  try {
    // Delete all events
    await db.execute({
      sql: "DELETE FROM events WHERE user_id = ?",
      args: [userId],
    });

    // Delete all custom classes (keep Canvas-linked ones)
    await db.execute({
      sql: "DELETE FROM classes WHERE user_id = ? AND canvas_course_id IS NULL",
      args: [userId],
    });

    // Delete all rejected items
    await db.execute({
      sql: "DELETE FROM rejected_items WHERE user_id = ?",
      args: [userId],
    });

    res.json({ success: true });
  } catch (err) {
    console.error("Error resetting data:", err);
    res.status(500).json({ message: "Failed to reset data" });
  }
});

export default router;
