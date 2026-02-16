import { Router } from "express";
import {
  fetchTodoistTasks,
  createTodoistTask,
  closeTodoistTask,
  reopenTodoistTask,
  deleteTodoistTask,
  updateTodoistTask,
} from "../services/todoist.js";

const router = Router();

const extractToken = (req, res, next) => {
  const token = req.headers["x-todoist-token"];
  if (!token) {
    return res.status(400).json({ message: "Todoist API token required" });
  }
  req.todoistToken = token;
  next();
};

router.use(extractToken);

// Fetch active Todoist tasks (guest access — no DB lookup)
router.get("/tasks", async (req, res) => {
  try {
    const tasks = await fetchTodoistTasks(req.todoistToken);
    res.json({ tasks });
  } catch (err) {
    console.error("Error fetching Todoist tasks (guest):", err);
    if (err?.message?.includes("401")) {
      res.status(401).json({ message: "Todoist API token invalid" });
    } else {
      res.status(500).json({ message: "Failed to fetch Todoist tasks" });
    }
  }
});

// Create a task in Todoist (guest access)
router.post("/tasks", async (req, res) => {
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
    console.error("Error creating Todoist task (guest):", err);
    res.status(500).json({ message: "Failed to create Todoist task" });
  }
});

// Close (complete) a Todoist task (guest access)
router.post("/tasks/:id/close", async (req, res) => {
  try {
    await closeTodoistTask(req.todoistToken, req.params.id);
    res.json({ success: true });
  } catch (err) {
    console.error("Error closing Todoist task (guest):", err);
    res.status(500).json({ message: "Failed to close Todoist task" });
  }
});

// Reopen a completed Todoist task (guest access)
router.post("/tasks/:id/reopen", async (req, res) => {
  try {
    await reopenTodoistTask(req.todoistToken, req.params.id);
    res.json({ success: true });
  } catch (err) {
    console.error("Error reopening Todoist task (guest):", err);
    res.status(500).json({ message: "Failed to reopen Todoist task" });
  }
});

// Delete a Todoist task (guest access)
router.delete("/tasks/:id", async (req, res) => {
  try {
    await deleteTodoistTask(req.todoistToken, req.params.id);
    res.json({ success: true });
  } catch (err) {
    console.error("Error deleting Todoist task (guest):", err);
    res.status(500).json({ message: "Failed to delete Todoist task" });
  }
});

// Update a Todoist task (guest access)
router.patch("/tasks/:id", async (req, res) => {
  try {
    const { content } = req.body;
    const result = await updateTodoistTask(req.todoistToken, req.params.id, {
      content,
    });
    res.json(result);
  } catch (err) {
    console.error("Error updating Todoist task (guest):", err);
    res.status(500).json({ message: "Failed to update Todoist task" });
  }
});

export default router;
