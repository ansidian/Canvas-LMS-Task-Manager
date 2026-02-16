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

export async function createTodoistTask(token, { content, due_string, due_date, due_datetime, priority }) {
  return todoistFetch("/tasks", token, {
    method: "POST",
    body: JSON.stringify({
      content,
      due_string: due_string || undefined,
      due_date: due_date || undefined,
      due_datetime: due_datetime || undefined,
      priority: priority || undefined,
    }),
  });
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
  return todoistFetch(`/tasks/${taskId}`, token, {
    method: "POST",
    body: JSON.stringify(fields),
  });
}
