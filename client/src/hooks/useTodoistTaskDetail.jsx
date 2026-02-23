import { useState, useEffect, useRef, useCallback } from "react";
import { todoistColor } from "../utils/todoist-colors";

export default function useTodoistTaskDetail(api, todoistId) {
  const [taskDetail, setTaskDetail] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  // Raw editable values (project_id, labels[], priority, description)
  const [edits, setEdits] = useState(null);
  const [projects, setProjects] = useState([]);
  const [labels, setLabels] = useState([]);
  const cacheRef = useRef({});

  useEffect(() => {
    if (!todoistId || !api) {
      setTaskDetail(null);
      setEdits(null);
      setLoading(false);
      return;
    }

    // Return cached result
    if (cacheRef.current[todoistId]) {
      const cached = cacheRef.current[todoistId];
      setTaskDetail(cached.detail);
      setEdits(cached.edits);
      setProjects(cached.projects);
      setLabels(cached.labels);
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
      .then(([task, projectList, labelList]) => {
        if (cancelled) return;

        // Resolve project
        const project = projectList.find((p) => p.id === task.project_id);
        // Resolve label colors
        const labelMap = Object.fromEntries(
          labelList.map((l) => [l.name.toLowerCase(), l]),
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

        const editValues = {
          project_id: task.project_id || null,
          labels: task.labels || [],
          priority: task.priority,
          description: task.description || "",
        };

        cacheRef.current[todoistId] = {
          detail,
          edits: editValues,
          projects: projectList,
          labels: labelList,
        };
        setTaskDetail(detail);
        setEdits(editValues);
        setProjects(projectList);
        setLabels(labelList);
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

  const updateEdits = useCallback((patch) => {
    setEdits((prev) => (prev ? { ...prev, ...patch } : null));
  }, []);

  // Invalidate cache for this task so next open re-fetches
  const invalidateCache = useCallback(() => {
    if (todoistId) {
      delete cacheRef.current[todoistId];
    }
  }, [todoistId]);

  return { taskDetail, loading, error, edits, updateEdits, projects, labels, invalidateCache };
}
