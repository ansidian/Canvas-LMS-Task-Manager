import { useCallback, useEffect, useReducer } from "react";
import {
	getStorageItem,
	getStorageJSON,
	setStorageJSON,
} from "../utils/storage";
import {
	FETCH_INTERVAL_MS,
	LAST_FETCH_KEY,
	PENDING_CACHE_KEY,
} from "./canvasSyncConstants";
import useCanvasClassesSync from "./useCanvasClassesSync";
import useCanvasFetch from "./useCanvasFetch";
import useCanvasReconcile from "./useCanvasReconcile";

const initialState = {
	classes: [],
	pendingItems: [],
	lastFetchTime: null,
	unassignedColor: "#a78b71",
	canvasAuthError: "",
	tooltipTick: 0,
};

function resolveNext(value, current) {
	return typeof value === "function" ? value(current) : value;
}

function initState() {
	const saved = getStorageItem(LAST_FETCH_KEY);
	return {
		...initialState,
		lastFetchTime: saved ? parseInt(saved, 10) : null,
	};
}

function canvasReducer(state, action) {
	switch (action.type) {
		case "SET_CLASSES":
			return {
				...state,
				classes: resolveNext(action.value, state.classes),
			};
		case "SET_PENDING_ITEMS":
			return {
				...state,
				pendingItems: resolveNext(action.value, state.pendingItems),
			};
		case "SET_LAST_FETCH_TIME":
			return {
				...state,
				lastFetchTime: resolveNext(action.value, state.lastFetchTime),
			};
		case "SET_UNASSIGNED_COLOR":
			return {
				...state,
				unassignedColor: resolveNext(action.value, state.unassignedColor),
			};
		case "SET_CANVAS_AUTH_ERROR":
			return {
				...state,
				canvasAuthError: resolveNext(
					action.value,
					state.canvasAuthError,
				),
			};
		case "BUMP_TOOLTIP_TICK":
			return {
				...state,
				tooltipTick: state.tooltipTick + 1,
			};
		default:
			return state;
	}
}

export default function useCanvasSync({
	api,
	setLoading,
	setHighlightCredentials,
	setSettingsOpen,
	events,
	updateEvent,
}) {
	const [state, dispatch] = useReducer(canvasReducer, initialState, initState);

	const setClasses = useCallback((next) => {
		dispatch({ type: "SET_CLASSES", value: next });
	}, []);

	const setPendingItems = useCallback((next) => {
		dispatch({ type: "SET_PENDING_ITEMS", value: next });
	}, []);

	const setLastFetchTime = useCallback((next) => {
		dispatch({ type: "SET_LAST_FETCH_TIME", value: next });
	}, []);

	const setUnassignedColor = useCallback((next) => {
		dispatch({ type: "SET_UNASSIGNED_COLOR", value: next });
	}, []);

	const setCanvasAuthError = useCallback((next) => {
		dispatch({ type: "SET_CANVAS_AUTH_ERROR", value: next });
	}, []);

	useEffect(() => {
		const interval = setInterval(() => {
			dispatch({ type: "BUMP_TOOLTIP_TICK" });
		}, 30000);
		return () => clearInterval(interval);
	}, []);

	useEffect(() => {
		if (state.pendingItems.length > 0) {
			setStorageJSON(PENDING_CACHE_KEY, state.pendingItems);
		}
	}, [state.pendingItems]);

	const getFetchTooltip = useCallback(() => {
		if (!state.lastFetchTime) {
			return "Fetch Canvas assignments";
		}
		const elapsed = Date.now() - state.lastFetchTime;
		const remaining = FETCH_INTERVAL_MS - elapsed;
		const elapsedMin = Math.floor(elapsed / 60000);
		const remainingMin = Math.max(0, Math.ceil(remaining / 60000));

		if (remaining <= 0) {
			return `Last fetched ${elapsedMin}m ago, refetch on next load`;
		}
		return `Last fetched ${elapsedMin}m ago, refetching in ${remainingMin}m`;
	}, [state.lastFetchTime]);

	const loadCachedPendingItems = useCallback(() => {
		const cached = getStorageJSON(PENDING_CACHE_KEY);
		if (cached) {
			setPendingItems(cached);
		}
	}, [setPendingItems]);

	const loadClasses = useCallback(async () => {
		try {
			const data = await api("/classes");
			setClasses(data);
			return data;
		} catch (err) {
			console.error("Failed to load classes:", err);
			return [];
		}
	}, [api, setClasses]);

	const loadSettings = useCallback(async () => {
		try {
			const data = await api("/settings");
			if (data.unassigned_color) {
				setUnassignedColor(data.unassigned_color);
			}
		} catch (err) {
			console.error("Failed to load settings:", err);
		}
	}, [api, setUnassignedColor]);

	const { ensureClassesExist } = useCanvasClassesSync({ api, loadClasses });
	const { syncCanvasUpdates } = useCanvasReconcile({
		api,
		events,
		updateEvent,
	});
	const { fetchCanvasAssignments } = useCanvasFetch({
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
	});

	const handleClassesReorder = useCallback(async (orderedIds) => {
		const previousClasses = state.classes;
		const classById = new Map(
			state.classes.map((cls) => [String(cls.id), cls]),
		);
		const optimistic = orderedIds
			.map((id, index) => {
				const cls = classById.get(id);
				if (!cls) return null;
				return { ...cls, sort_order: index };
			})
			.filter(Boolean);

		setClasses(optimistic);

		try {
			const updated = await api("/classes/order", {
				method: "PATCH",
				body: JSON.stringify({ orderedIds }),
			});
			setClasses(updated);
		} catch (err) {
			console.error("Failed to reorder classes:", err);
			setClasses(previousClasses);
		}
	}, [api, setClasses, state.classes]);

	return {
		classes: state.classes,
		setClasses,
		pendingItems: state.pendingItems,
		setPendingItems,
		lastFetchTime: state.lastFetchTime,
		unassignedColor: state.unassignedColor,
		setUnassignedColor,
		getFetchTooltip,
		loadCachedPendingItems,
		loadClasses,
		loadSettings,
		fetchCanvasAssignments,
		handleClassesReorder,
		canvasAuthError: state.canvasAuthError,
		clearCanvasAuthError: () => {
			setCanvasAuthError("");
		},
	};
}
