import { useCallback, useRef } from "react";
import { LAST_FETCH_KEY } from "./canvasSyncConstants";
import { CANVAS_DND_TOAST_ID, dismissToast, notifySuccess } from "../utils/notify.jsx";
import { setStorageItem } from "../utils/storage";

export default function useCanvasFetch({
	api,
	isGuest,
	loadEvents,
	loadClasses,
	ensureClassesExist,
	setPendingItems,
	setCanvasAuthError,
	setLastFetchTime,
	setLoading,
	setHighlightCredentials,
	setSettingsOpen,
	syncCanvasUpdates,
	addEvent,
	replaceEvent,
}) {
	const fetchInFlightRef = useRef(false);
	const fetchRequestIdRef = useRef(0);
	const fetchAbortRef = useRef(null);

	const fetchCanvasAssignments = useCallback(async ({ silent = false } = {}) => {
		if (fetchInFlightRef.current) {
			fetchAbortRef.current?.abort();
		}
		fetchInFlightRef.current = true;
		dismissToast(CANVAS_DND_TOAST_ID);
		const requestId = fetchRequestIdRef.current + 1;
		fetchRequestIdRef.current = requestId;
		const controller = new AbortController();
		fetchAbortRef.current = controller;
		setLoading(true);
		try {
      if (isGuest) {
        const currentClasses = await loadClasses();

        const data = await api("/canvas/assignments", {
          headers: {},
          signal: controller.signal,
        });

        await ensureClassesExist(data.courses, currentClasses);

        if (fetchRequestIdRef.current !== requestId) return;

        const updatedClasses = await loadClasses();

        const syncedAssignments = data.assignments.filter((a) => {
          const cls = updatedClasses.find(
            (c) => c.canvas_course_id === a.canvas_course_id,
          );
          return !cls || cls.is_synced;
        });

        const submittedItems = syncedAssignments.filter((a) => a.has_submitted);
        const pendingAssignments = syncedAssignments.filter(
          (a) => !a.has_submitted,
        );

        const autoApprovePromises = submittedItems.map((item) => {
          const matchingClass = updatedClasses.find(
            (cls) => cls.canvas_course_id === item.canvas_course_id,
          );
          const classId = matchingClass?.id ?? null;

          const tempId = `temp-auto-${Date.now()}-${Math.random().toString(16).slice(2)}`;
          const optimisticEvent = {
            id: tempId,
            title: item.title,
            due_date: item.due_date,
            class_id: classId,
            event_type: "assignment",
            status: "complete",
            notes: "",
            url: item.url,
            description: item.description ?? null,
            points_possible: item.points_possible ?? null,
            canvas_id: item.canvas_id,
            canvas_due_date_override: 0,
          };

          addEvent(optimisticEvent);

          return api("/events", {
            method: "POST",
            body: JSON.stringify({
              title: item.title,
              description: item.description ?? null,
              due_date: item.due_date,
              class_id: classId,
              event_type: "assignment",
              status: "complete",
              notes: "",
              url: item.url,
              points_possible: item.points_possible ?? null,
              canvas_id: item.canvas_id,
              canvas_due_date_override: 0,
            }),
          })
            .then((newEvent) => {
              replaceEvent(tempId, newEvent);
              notifySuccess(`"${item.title}" added as complete`);
            })
            .catch((err) => {
              console.error("Failed to auto-approve submitted item:", err);
            });
        });

        Promise.allSettled(autoApprovePromises);

        setPendingItems(pendingAssignments);
        setCanvasAuthError("");
        await syncCanvasUpdates(data);
      } else {
        const data = await api("/canvas/assignments", {
          headers: {},
          signal: controller.signal,
        });

        if (fetchRequestIdRef.current !== requestId) return;

        setPendingItems(data.assignments);
        setCanvasAuthError("");
        await Promise.all([loadClasses(), loadEvents()]);
        if (data?.stats?.approved > 0) {
          notifySuccess(
            `${data.stats.approved} submitted item${data.stats.approved === 1 ? "" : "s"} marked complete`,
          );
        }
      }

      const now = Date.now();
      setStorageItem(LAST_FETCH_KEY, String(now));
      setLastFetchTime(now);
    } catch (err) {
			if (err?.name === "AbortError") {
				return;
			}
			console.error("Failed to fetch Canvas assignments:", err);
			const message = err?.message || "";
			if (
				/401|403|400|credentials|invalid|network|required/i.test(message)
			) {
				const now = Date.now();
				setStorageItem(LAST_FETCH_KEY, String(now));
				setLastFetchTime(now);
				const errorLabel = /required/i.test(message)
					? "Canvas credentials are required. Add your Canvas URL and token."
					: /400|invalid/i.test(message)
					? "Canvas URL looks invalid. Check the base URL for your school."
					: "Canvas rejected the credentials. Verify your Canvas URL and API token.";
				setCanvasAuthError(errorLabel);
				// Only auto-open settings on explicit user action, not background refresh
				if (!silent) {
					setHighlightCredentials(true);
					setSettingsOpen(true);
				}
			}
		} finally {
			if (fetchRequestIdRef.current === requestId) {
				setLoading(false);
				fetchInFlightRef.current = false;
				fetchAbortRef.current = null;
			}
		}
	}, [
		api,
		isGuest,
		loadEvents,
		loadClasses,
		ensureClassesExist,
		setHighlightCredentials,
		setSettingsOpen,
		setLoading,
		setPendingItems,
		setCanvasAuthError,
		setLastFetchTime,
		syncCanvasUpdates,
		addEvent,
		replaceEvent,
	]);

	return { fetchCanvasAssignments };
}
