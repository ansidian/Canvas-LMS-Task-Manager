import { Router } from "express";
import db from "../db/connection.js";
import { requireUser } from "../middleware/clerk-auth.js";
import { validateTodoistCredentials } from "../middleware/todoist-auth.js";
import {
  fetchTodoistTasks,
  createTodoistTask,
  closeTodoistTask,
  reopenTodoistTask,
  deleteTodoistTask,
  updateTodoistTask,
} from "../services/todoist.js";

const router = Router();

router.use(requireUser());

// Fetch active Todoist tasks with due dates
router.get(
  "/tasks",
  validateTodoistCredentials(),
  async (req, res) => {
    const userId = req.auth().userId;
    try {
      const tasks = await fetchTodoistTasks(req.todoistToken);

      // Get existing todoist-linked events for dedup/reconciliation
      const existing = await db.execute({
        sql: "SELECT id, todoist_id, title, due_date, status, updated_at, created_at FROM events WHERE user_id = ? AND todoist_id IS NOT NULL",
        args: [userId],
      });

      const existingMap = {};
      for (const row of existing.rows) {
        existingMap[row.todoist_id] = row;
      }

      res.json({ tasks, existingMap });
    } catch (err) {
      console.error("Error fetching Todoist tasks:", err);
      if (err?.message?.includes("401")) {
        res.status(401).json({ message: "Todoist API token invalid" });
      } else {
        res.status(500).json({ message: "Failed to fetch Todoist tasks" });
      }
    }
  },
);

// Create a task in Todoist
router.post(
  "/tasks",
  validateTodoistCredentials(),
  async (req, res) => {
    const { content, due_string, due_date, due_datetime, priority } = req.body;
    if (!content) {
      return res.status(400).json({ message: "Task content is required" });
    }
    try {
      const task = await createTodoistTask(req.todoistToken, {
        content,
        due_string,
        due_date,
        due_datetime,
        priority,
      });
      res.status(201).json(task);
    } catch (err) {
      console.error("Error creating Todoist task:", err);
      res.status(500).json({ message: "Failed to create Todoist task" });
    }
  },
);

// Close (complete) a Todoist task
router.post(
  "/tasks/:id/close",
  validateTodoistCredentials(),
  async (req, res) => {
    try {
      await closeTodoistTask(req.todoistToken, req.params.id);
      res.json({ success: true });
    } catch (err) {
      console.error("Error closing Todoist task:", err);
      res.status(500).json({ message: "Failed to close Todoist task" });
    }
  },
);

// Reopen a completed Todoist task
router.post(
  "/tasks/:id/reopen",
  validateTodoistCredentials(),
  async (req, res) => {
    try {
      await reopenTodoistTask(req.todoistToken, req.params.id);
      res.json({ success: true });
    } catch (err) {
      console.error("Error reopening Todoist task:", err);
      res.status(500).json({ message: "Failed to reopen Todoist task" });
    }
  },
);

// Delete a Todoist task
router.delete(
  "/tasks/:id",
  validateTodoistCredentials(),
  async (req, res) => {
    try {
      await deleteTodoistTask(req.todoistToken, req.params.id);
      res.json({ success: true });
    } catch (err) {
      console.error("Error deleting Todoist task:", err);
      res.status(500).json({ message: "Failed to delete Todoist task" });
    }
  },
);

// Update a Todoist task (title, etc.)
router.patch(
  "/tasks/:id",
  validateTodoistCredentials(),
  async (req, res) => {
    try {
      const { content } = req.body;
      const result = await updateTodoistTask(req.todoistToken, req.params.id, {
        content,
      });
      res.json(result);
    } catch (err) {
      console.error("Error updating Todoist task:", err);
      res.status(500).json({ message: "Failed to update Todoist task" });
    }
  },
);

export default router;
