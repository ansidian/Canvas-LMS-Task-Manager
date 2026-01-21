import { useCallback, useRef } from "react";
import { LAST_FETCH_KEY } from "./canvasSyncConstants";
import { setStorageItem } from "../utils/storage";

export default function useCanvasFetch({
	api,
	loadClasses,
	ensureClassesExist,
	setPendingItems,
	setCanvasAuthError,
	setLastFetchTime,
	setLoading,
	setHighlightCredentials,
	setSettingsOpen,
	syncCanvasUpdates,
}) {
	const fetchInFlightRef = useRef(false);
	const fetchRequestIdRef = useRef(0);
	const fetchAbortRef = useRef(null);

	const fetchCanvasAssignments = useCallback(async ({ silent = false } = {}) => {
		if (fetchInFlightRef.current) {
			fetchAbortRef.current?.abort();
		}
		fetchInFlightRef.current = true;
		const requestId = fetchRequestIdRef.current + 1;
		fetchRequestIdRef.current = requestId;
		const controller = new AbortController();
		fetchAbortRef.current = controller;
		setLoading(true);
		try {
			const currentClasses = await loadClasses();

			const data = await api("/canvas/assignments", {
				headers: {},
				signal: controller.signal,
			});

			await ensureClassesExist(data.courses, currentClasses);

			if (fetchRequestIdRef.current !== requestId) return;
			setPendingItems(data.assignments);
			setCanvasAuthError("");
			await syncCanvasUpdates(data);

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
				setHighlightCredentials(true);
				setSettingsOpen(true);
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
		loadClasses,
		ensureClassesExist,
		setHighlightCredentials,
		setSettingsOpen,
		setLoading,
		setPendingItems,
		setCanvasAuthError,
		setLastFetchTime,
		syncCanvasUpdates,
	]);

	return { fetchCanvasAssignments };
}
