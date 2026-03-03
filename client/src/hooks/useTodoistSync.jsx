import { useCallback, useRef } from "react";
import { getStorageItem, setStorageItem } from "../utils/storage";
import { notifyError, notifySuccess } from "../utils/notify.jsx";

const TODOIST_LAST_FETCH_KEY = "todoist_last_fetch_timestamp";
const FETCH_INTERVAL_MS = 60 * 1000; // 60 seconds minimum between fetches
const TODOIST_CLASS_COLOR = "#e44332";

export default function useTodoistSync({
  api,
  addEvent,
  replaceEvent,
  updateEvent,
  loadClasses,
}) {
  const fetchInFlightRef = useRef(false);

  const ensureTodoistClass = useCallback(
    async (classes) => {
      const existing = classes.find(
        (c) => c.canvas_course_id === "todoist",
      );
      if (existing) return existing.id;

      try {
        const created = await api("/classes", {
          method: "POST",
          body: JSON.stringify({
            name: "Todoist",
            color: TODOIST_CLASS_COLOR,
            canvas_course_id: "todoist",
          }),
        });
        return created.id;
      } catch (err) {
        console.error("Failed to create Todoist class:", err);
        return null;
      }
    },
    [api],
  );

  const fetchTodoistTasks = useCallback(
    async ({ silent = false } = {}) => {
      if (fetchInFlightRef.current) return;
      fetchInFlightRef.current = true;

      try {
        const { tasks, existingMap } = await api("/todoist/tasks");
        const classes = await loadClasses();
        const todoistClassId = await ensureTodoistClass(classes);

        // Reload classes after potential creation
        if (todoistClassId) {
          await loadClasses();
        }

        const existingTodoistIds = new Set(Object.keys(existingMap));
        let addedCount = 0;
        let updatedCount = 0;
        const createPromises = [];

        // Process each task from Todoist
        for (const task of tasks) {
          const taskIdStr = String(task.todoist_id);

          if (!existingTodoistIds.has(taskIdStr)) {
            // New task — auto-create as local event
            const tempId = `temp-todoist-${Date.now()}-${Math.random().toString(16).slice(2)}`;
            const optimisticEvent = {
              id: tempId,
              title: task.title,
              due_date: task.due_date,
              class_id: todoistClassId,
              event_type: "assignment",
              status: "incomplete",
              notes: "",
              url: task.url,
              todoist_id: taskIdStr,
            };

            addEvent(optimisticEvent);

            createPromises.push(
              api("/events", {
                method: "POST",
                body: JSON.stringify({
                  title: task.title,
                  due_date: task.due_date,
                  class_id: todoistClassId,
                  event_type: "assignment",
                  status: "incomplete",
                  url: task.url,
                  todoist_id: taskIdStr,
                }),
              })
                .then((newEvent) => replaceEvent(tempId, newEvent))
                .catch((err) =>
                  console.error("Failed to create Todoist event:", err),
                ),
            );

            addedCount++;
          } else {
            // Existing task — reconcile with Todoist as source of truth
            const local = existingMap[taskIdStr];

            // Recurring tasks: if local is complete but Todoist still has
            // it active, the task advanced to its next occurrence.
            // Detach the completed event and create a fresh one.
            if (local.status === "complete") {
              // Detach completed instance so it stays as history
              updateEvent(local.id, { todoist_id: null });

              // Create new event for the next occurrence
              const tempId = `temp-todoist-${Date.now()}-${Math.random().toString(16).slice(2)}`;
              const optimisticEvent = {
                id: tempId,
                title: task.title,
                due_date: task.due_date,
                class_id: todoistClassId,
                event_type: "assignment",
                status: "incomplete",
                notes: "",
                url: task.url,
                todoist_id: taskIdStr,
              };

              addEvent(optimisticEvent);

              createPromises.push(
                api("/events", {
                  method: "POST",
                  body: JSON.stringify({
                    title: task.title,
                    due_date: task.due_date,
                    class_id: todoistClassId,
                    event_type: "assignment",
                    status: "incomplete",
                    url: task.url,
                    todoist_id: taskIdStr,
                  }),
                })
                  .then((newEvent) => replaceEvent(tempId, newEvent))
                  .catch((err) =>
                    console.error("Failed to create recurring Todoist event:", err),
                  ),
              );

              addedCount++;
            } else {
              // Still active locally — just reconcile title/date changes
              const titleChanged = local.title !== task.title;
              const dateChanged =
                new Date(local.due_date).getTime() !==
                new Date(task.due_date).getTime();

              if (titleChanged || dateChanged) {
                const updates = {};
                if (titleChanged) updates.title = task.title;
                if (dateChanged) updates.due_date = task.due_date;

                updateEvent(local.id, updates);
                updatedCount++;
              }
            }
          }
        }

        // Wait for all event creations to complete before finishing
        await Promise.all(createPromises);

        // Tasks no longer in Todoist response → mark complete and detach
        const activeTodoistIds = new Set(
          tasks.map((t) => String(t.todoist_id)),
        );
        for (const [todoistId, local] of Object.entries(existingMap)) {
          if (!activeTodoistIds.has(todoistId)) {
            updateEvent(local.id, { status: "complete", todoist_id: null });
          }
        }

        const now = Date.now();
        setStorageItem(TODOIST_LAST_FETCH_KEY, String(now));

        if (!silent && addedCount > 0) {
          notifySuccess(
            `${addedCount} Todoist task${addedCount === 1 ? "" : "s"} added`,
          );
        }
      } catch (err) {
        console.error("Failed to fetch Todoist tasks:", err);
        if (!silent) {
          const msg = err?.message || "";
          if (/401|invalid|token/i.test(msg)) {
            notifyError("Todoist token is invalid. Check Settings.");
          } else if (!/400|required/i.test(msg)) {
            // Don't notify if token simply not configured
            notifyError("Failed to fetch Todoist tasks.");
          }
        }
      } finally {
        fetchInFlightRef.current = false;
      }
    },
    [api, addEvent, replaceEvent, updateEvent, loadClasses, ensureTodoistClass],
  );

  const fetchTodoistIfStale = useCallback(
    () => {
      const lastFetch = getStorageItem(TODOIST_LAST_FETCH_KEY);
      const isStale =
        !lastFetch ||
        Date.now() - parseInt(lastFetch, 10) > FETCH_INTERVAL_MS;
      if (isStale) {
        fetchTodoistTasks({ silent: true });
      }
    },
    [fetchTodoistTasks],
  );

  return { fetchTodoistTasks, fetchTodoistIfStale };
}
