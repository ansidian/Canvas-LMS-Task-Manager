const TODOIST_API = "https://api.todoist.com/api/v1";

async function todoistFetch(path, token, options = {}) {
  const res = await fetch(`${TODOIST_API}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Todoist API error: ${res.status} ${text}`);
  }

  if (res.status === 204) return null;
  return res.json();
}

export async function fetchTodoistTasks(token) {
  const data = await todoistFetch("/tasks", token);
  // API v1 returns { results: [...], next_cursor }
  const tasks = data.results || data;
  // Only return tasks with due dates (can't place dateless tasks on calendar)
  return tasks
    .filter((t) => t.due)
    .map((t) => ({
      todoist_id: t.id,
      title: t.content,
      description: t.description || null,
      due_date: t.due.date,
      url: `https://app.todoist.com/app/task/${t.id}`,
      priority: t.priority,
      project_id: t.project_id,
      labels: t.labels,
    }));
}

export async function fetchTodoistProjects(token) {
  const data = await todoistFetch("/projects", token);
  const projects = data.results || data;
  return projects.map((p) => ({
    id: p.id,
    name: p.name,
    color: p.color,
    is_inbox: p.is_inbox_project ?? p.name === "Inbox",
  }));
}

export async function fetchTodoistLabels(token) {
  const data = await todoistFetch("/labels", token);
  const labels = data.results || data;
  return labels.map((l) => ({
    id: l.id,
    name: l.name,
    color: l.color,
  }));
}

/** Ensure each label name exists as a personal label, creating any that are missing. */
async function ensurePersonalLabels(token, labelNames) {
  if (!labelNames?.length) return;
  const existing = await fetchTodoistLabels(token);
  const existingNames = new Set(existing.map((l) => l.name.toLowerCase()));
  const missing = labelNames.filter((name) => !existingNames.has(name.toLowerCase()));
  if (!missing.length) return;
  await Promise.allSettled(
    missing.map((name) =>
      todoistFetch("/labels", token, {
        method: "POST",
        body: JSON.stringify({ name }),
      }),
    ),
  );
}

export async function createTodoistTask(token, { content, due_string, due_date, due_datetime, priority, project_id, labels, description }) {
  // Ensure labels exist as personal labels before creating the task
  await ensurePersonalLabels(token, labels);
  return todoistFetch("/tasks", token, {
    method: "POST",
    body: JSON.stringify({
      content,
      due_string: due_string || undefined,
      due_date: due_date || undefined,
      due_datetime: due_datetime || undefined,
      priority: priority || undefined,
      project_id: project_id || undefined,
      labels: labels?.length ? labels : undefined,
      description: description || undefined,
    }),
  });
}

export async function fetchTodoistTask(token, taskId) {
  const t = await todoistFetch(`/tasks/${taskId}`, token);
  return {
    todoist_id: t.id,
    title: t.content,
    description: t.description || null,
    priority: t.priority,
    project_id: t.project_id,
    labels: t.labels,
  };
}

export async function closeTodoistTask(token, taskId) {
  return todoistFetch(`/tasks/${taskId}/close`, token, { method: "POST" });
}

export async function reopenTodoistTask(token, taskId) {
  return todoistFetch(`/tasks/${taskId}/reopen`, token, { method: "POST" });
}

export async function deleteTodoistTask(token, taskId) {
  return todoistFetch(`/tasks/${taskId}`, token, { method: "DELETE" });
}

export async function updateTodoistTask(token, taskId, fields) {
  // project_id requires the separate move endpoint
  const { project_id, ...updateFields } = fields;

  let updateResult = null;

  if (Object.keys(updateFields).length > 0) {
    updateResult = await todoistFetch(`/tasks/${taskId}`, token, {
      method: "POST",
      body: JSON.stringify(updateFields),
    });
  }

  // Move to a different project (separate API call, must run after update)
  if (project_id !== undefined && project_id !== null) {
    await todoistFetch(`/tasks/${taskId}/move`, token, {
      method: "POST",
      body: JSON.stringify({ project_id }),
    });
  }

  return updateResult ?? { id: taskId };
}
