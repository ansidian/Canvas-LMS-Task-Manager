import { useState, useCallback, useRef } from "react";

export default function useTodoistMetadata(api) {
  const [projects, setProjects] = useState([]);
  const [labels, setLabels] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const fetchedRef = useRef(false);

  const fetchMetadata = useCallback(async () => {
    if (fetchedRef.current || !api) return;
    fetchedRef.current = true;
    try {
      const [proj, lab] = await Promise.all([
        api("/todoist/projects"),
        api("/todoist/labels"),
      ]);
      setProjects(proj);
      setLabels(lab);
      setLoaded(true);
    } catch (err) {
      console.error("Failed to fetch Todoist metadata:", err);
      fetchedRef.current = false;
    }
  }, [api]);

  const refreshLabels = useCallback(async () => {
    if (!api) return;
    try {
      const lab = await api("/todoist/labels");
      setLabels(lab);
    } catch (err) {
      console.error("Failed to refresh Todoist labels:", err);
    }
  }, [api]);

  return { projects, labels, loaded, fetchMetadata, refreshLabels };
}
