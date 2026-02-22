import { useState, useEffect, useRef } from "react";
import { todoistColor } from "../utils/todoist-colors";

export default function useTodoistTaskDetail(api, todoistId) {
  const [taskDetail, setTaskDetail] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const cacheRef = useRef({});

  useEffect(() => {
    if (!todoistId || !api) {
      setTaskDetail(null);
      setLoading(false);
      return;
    }

    // Return cached result
    if (cacheRef.current[todoistId]) {
      setTaskDetail(cacheRef.current[todoistId]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    Promise.all([
      api(`/todoist/tasks/${todoistId}`),
      api("/todoist/projects"),
      api("/todoist/labels"),
    ])
      .then(([task, projects, labels]) => {
        if (cancelled) return;

        // Resolve project
        const project = projects.find((p) => p.id === task.project_id);
        // Resolve label colors
        const labelMap = Object.fromEntries(
          labels.map((l) => [l.name.toLowerCase(), l]),
        );
        const resolvedLabels = (task.labels || []).map((name) => {
          const meta = labelMap[name.toLowerCase()];
          return {
            name,
            color: meta ? todoistColor(meta.color) : null,
          };
        });

        const detail = {
          description: task.description,
          priority: task.priority,
          project: project
            ? { name: project.name, color: todoistColor(project.color) }
            : null,
          labels: resolvedLabels,
        };

        cacheRef.current[todoistId] = detail;
        setTaskDetail(detail);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error("Failed to fetch Todoist task detail:", err);
        setError(err);
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [todoistId, api]);

  return { taskDetail, loading, error };
}
