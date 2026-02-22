import { Router } from "express";
import db from "../db/connection.js";
import { requireUser } from "../middleware/clerk-auth.js";
import { validateTodoistCredentials } from "../middleware/todoist-auth.js";
import {
  fetchTodoistTasks,
  fetchTodoistTask,
  fetchTodoistProjects,
  fetchTodoistLabels,
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

// Fetch user's Todoist projects
router.get(
  "/projects",
  validateTodoistCredentials(),
  async (req, res) => {
    try {
      const projects = await fetchTodoistProjects(req.todoistToken);
      res.json(projects);
    } catch (err) {
      console.error("Error fetching Todoist projects:", err);
      res.status(500).json({ message: "Failed to fetch Todoist projects" });
    }
  },
);

// Fetch user's Todoist labels
router.get(
  "/labels",
  validateTodoistCredentials(),
  async (req, res) => {
    try {
      const labels = await fetchTodoistLabels(req.todoistToken);
      res.json(labels);
    } catch (err) {
      console.error("Error fetching Todoist labels:", err);
      res.status(500).json({ message: "Failed to fetch Todoist labels" });
    }
  },
);

// Fetch a single Todoist task by ID
router.get(
  "/tasks/:id",
  validateTodoistCredentials(),
  async (req, res) => {
    try {
      const task = await fetchTodoistTask(req.todoistToken, req.params.id);
      res.json(task);
    } catch (err) {
      console.error("Error fetching Todoist task:", err);
      res.status(500).json({ message: "Failed to fetch Todoist task" });
    }
  },
);

// Create a task in Todoist
router.post(
  "/tasks",
  validateTodoistCredentials(),
  async (req, res) => {
    const { content, due_string, due_date, due_datetime, priority, project_id, labels } = req.body;
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
        project_id,
        labels,
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

// Update a Todoist task (title, date, etc.)
router.patch(
  "/tasks/:id",
  validateTodoistCredentials(),
  async (req, res) => {
    try {
      const { content, due_date, due_datetime } = req.body;
      const fields = {};
      if (content !== undefined) fields.content = content;
      if (due_datetime !== undefined) {
        fields.due_datetime = due_datetime;
      } else if (due_date !== undefined) {
        fields.due_date = due_date;
      }
      const result = await updateTodoistTask(req.todoistToken, req.params.id, fields);
      res.json(result);
    } catch (err) {
      console.error("Error updating Todoist task:", err);
      res.status(500).json({ message: "Failed to update Todoist task" });
    }
  },
);

export default router;
