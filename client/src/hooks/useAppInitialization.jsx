import { useEffect, useRef } from "react";
import { getStorageItem } from "../utils/storage";

const LAST_FETCH_KEY = "canvas_last_fetch_timestamp";
const FETCH_INTERVAL_MS = 5 * 60 * 1000;

export default function useAppInitialization({
	loadEvents,
	loadClasses,
	loadSettings,
	loadCachedPendingItems,
	fetchCanvasAssignments,
	setInitialLoading,
	setShowOnboarding,
}) {
	const hasInitializedRef = useRef(false);

	useEffect(() => {
		if (hasInitializedRef.current) {
			return;
		}
		hasInitializedRef.current = true;
		const loadInitialData = async () => {
			await Promise.all([loadEvents(), loadClasses(), loadSettings()]);
			loadCachedPendingItems();
			setInitialLoading(false);

			const lastFetch = getStorageItem(LAST_FETCH_KEY);
			const isStale =
				!lastFetch ||
				Date.now() - parseInt(lastFetch, 10) > FETCH_INTERVAL_MS;
			if (isStale) {
				fetchCanvasAssignments({ silent: true });
			}
		};
		loadInitialData();
	}, [
		loadEvents,
		loadClasses,
		loadSettings,
		loadCachedPendingItems,
		setInitialLoading,
		fetchCanvasAssignments,
	]);

	useEffect(() => {
		const hasCompleted = getStorageItem("hasCompletedOnboarding");
		if (!hasCompleted) {
			const timer = setTimeout(() => {
				setShowOnboarding(true);
			}, 250);
			return () => clearTimeout(timer);
		}
		return undefined;
	}, [setShowOnboarding]);
}
