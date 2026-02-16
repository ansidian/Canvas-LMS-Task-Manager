import db from "../db/connection.js";

export const validateTodoistCredentials = () => async (req, res, next) => {
  const userId = req.auth().userId;
  try {
    const result = await db.execute({
      sql: "SELECT todoist_token FROM settings WHERE user_id = ?",
      args: [userId],
    });
    const token = result.rows[0]?.todoist_token;
    if (!token) {
      return res.status(400).json({ message: "Todoist API token required" });
    }
    req.todoistToken = token;
    next();
  } catch (err) {
    console.error("Error loading Todoist credentials:", err);
    res.status(500).json({ message: "Failed to load Todoist credentials" });
  }
};
