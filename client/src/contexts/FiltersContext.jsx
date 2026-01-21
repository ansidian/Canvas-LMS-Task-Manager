import { createContext, useContext, useEffect, useMemo, useReducer } from "react";
import { getStorageItem, getStorageJSON, setStorageItem, setStorageJSON } from "../utils/storage";

const FiltersContext = createContext(null);

const STATUS_FILTERS_KEY = "calendar_status_filters";
const CLASS_FILTERS_KEY = "calendar_class_filters";
const UNASSIGNED_ORDER_KEY = "calendar_unassigned_order_index";
const ALL_STATUSES = ["incomplete", "in_progress", "complete"];

const initialState = {
	statusFilters: (() => {
		const saved = getStorageJSON(STATUS_FILTERS_KEY);
		return saved || [...ALL_STATUSES];
	})(),
	classFilters: (() => {
		const saved = getStorageJSON(CLASS_FILTERS_KEY);
		return saved || ["unassigned"];
	})(),
	unassignedIndex: (() => {
		const saved = getStorageItem(UNASSIGNED_ORDER_KEY);
		return saved !== null ? parseInt(saved, 10) : null;
	})(),
};

function resolveNext(value, current) {
	return typeof value === "function" ? value(current) : value;
}

function filtersReducer(state, action) {
	switch (action.type) {
		case "SET_STATUS_FILTERS":
			return {
				...state,
				statusFilters: resolveNext(action.value, state.statusFilters),
			};
		case "SET_CLASS_FILTERS":
			return {
				...state,
				classFilters: resolveNext(action.value, state.classFilters),
			};
		case "SET_UNASSIGNED_INDEX":
			return {
				...state,
				unassignedIndex: resolveNext(action.value, state.unassignedIndex),
			};
		default:
			return state;
	}
}

export function FiltersProvider({ children }) {
	const [state, dispatch] = useReducer(filtersReducer, initialState);

	useEffect(() => {
		setStorageJSON(STATUS_FILTERS_KEY, state.statusFilters);
	}, [state.statusFilters]);

	useEffect(() => {
		setStorageJSON(CLASS_FILTERS_KEY, state.classFilters);
	}, [state.classFilters]);

	useEffect(() => {
		if (Number.isInteger(state.unassignedIndex)) {
			setStorageItem(UNASSIGNED_ORDER_KEY, String(state.unassignedIndex));
		}
	}, [state.unassignedIndex]);

	const value = useMemo(
		() => ({
			statusFilters: state.statusFilters,
			classFilters: state.classFilters,
			unassignedIndex: state.unassignedIndex,
			setStatusFilters: (next) =>
				dispatch({ type: "SET_STATUS_FILTERS", value: next }),
			setClassFilters: (next) =>
				dispatch({ type: "SET_CLASS_FILTERS", value: next }),
			setUnassignedIndex: (next) =>
				dispatch({ type: "SET_UNASSIGNED_INDEX", value: next }),
		}),
		[state.classFilters, state.statusFilters, state.unassignedIndex],
	);

	return (
		<FiltersContext.Provider value={value}>
			{children}
		</FiltersContext.Provider>
	);
}

export function useFilters() {
	const context = useContext(FiltersContext);
	if (!context) {
		throw new Error("useFilters must be used within a FiltersProvider");
	}
	return context;
}
