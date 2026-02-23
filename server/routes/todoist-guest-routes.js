import { Router } from "express";
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

// Fetch user's Todoist projects (guest access)
router.get("/projects", async (req, res) => {
  try {
    const projects = await fetchTodoistProjects(req.todoistToken);
    res.json(projects);
  } catch (err) {
    console.error("Error fetching Todoist projects (guest):", err);
    res.status(500).json({ message: "Failed to fetch Todoist projects" });
  }
});

// Fetch user's Todoist labels (guest access)
router.get("/labels", async (req, res) => {
  try {
    const labels = await fetchTodoistLabels(req.todoistToken);
    res.json(labels);
  } catch (err) {
    console.error("Error fetching Todoist labels (guest):", err);
    res.status(500).json({ message: "Failed to fetch Todoist labels" });
  }
});

// Fetch a single Todoist task by ID (guest access)
router.get("/tasks/:id", async (req, res) => {
  try {
    const task = await fetchTodoistTask(req.todoistToken, req.params.id);
    res.json(task);
  } catch (err) {
    console.error("Error fetching Todoist task (guest):", err);
    res.status(500).json({ message: "Failed to fetch Todoist task" });
  }
});

// Create a task in Todoist (guest access)
router.post("/tasks", async (req, res) => {
  const { content, due_string, due_date, due_datetime, priority, project_id, labels, description } = req.body;
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
      description,
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
    const { content, due_date, due_datetime, priority, project_id, labels, description } = req.body;
    const fields = {};
    if (content !== undefined) fields.content = content;
    if (due_datetime !== undefined) {
      fields.due_datetime = due_datetime;
    } else if (due_date !== undefined) {
      fields.due_date = due_date;
    }
    if (priority !== undefined) fields.priority = priority;
    if (project_id !== undefined) fields.project_id = project_id;
    if (labels !== undefined) fields.labels = labels;
    if (description !== undefined) fields.description = description;
    if (Object.keys(fields).length === 0) {
      return res.json({ id: req.params.id });
    }
    const result = await updateTodoistTask(req.todoistToken, req.params.id, fields);
    res.json(result);
  } catch (err) {
    console.error("Error updating Todoist task (guest):", err);
    res.status(500).json({ message: "Failed to update Todoist task" });
  }
});

export default router;
