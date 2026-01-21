import { createContext, useContext, useMemo, useReducer } from "react";
import dayjs from "dayjs";

const UIContext = createContext(null);

const initialState = {
	currentDate: dayjs(),
	settingsOpen: false,
	approvalIndex: -1,
	selectedEvent: null,
	createEventDate: null,
	loading: false,
	initialLoading: true,
	highlightCredentials: false,
};

function resolveNext(value, current) {
	return typeof value === "function" ? value(current) : value;
}

function uiReducer(state, action) {
	switch (action.type) {
		case "SET_CURRENT_DATE":
			return {
				...state,
				currentDate: resolveNext(action.value, state.currentDate),
			};
		case "SET_SETTINGS_OPEN":
			return {
				...state,
				settingsOpen: resolveNext(action.value, state.settingsOpen),
			};
		case "SET_APPROVAL_INDEX":
			return {
				...state,
				approvalIndex: resolveNext(action.value, state.approvalIndex),
			};
		case "SET_SELECTED_EVENT":
			return {
				...state,
				selectedEvent: resolveNext(action.value, state.selectedEvent),
			};
		case "SET_CREATE_EVENT_DATE":
			return {
				...state,
				createEventDate: resolveNext(
					action.value,
					state.createEventDate,
				),
			};
		case "SET_LOADING":
			return {
				...state,
				loading: resolveNext(action.value, state.loading),
			};
		case "SET_INITIAL_LOADING":
			return {
				...state,
				initialLoading: resolveNext(action.value, state.initialLoading),
			};
		case "SET_HIGHLIGHT_CREDENTIALS":
			return {
				...state,
				highlightCredentials: resolveNext(
					action.value,
					state.highlightCredentials,
				),
			};
		default:
			return state;
	}
}

export function UIProvider({ children }) {
	const [state, dispatch] = useReducer(uiReducer, initialState);

	const value = useMemo(
		() => ({
			currentDate: state.currentDate,
			settingsOpen: state.settingsOpen,
			approvalIndex: state.approvalIndex,
			selectedEvent: state.selectedEvent,
			createEventDate: state.createEventDate,
			loading: state.loading,
			initialLoading: state.initialLoading,
			highlightCredentials: state.highlightCredentials,
			setCurrentDate: (next) =>
				dispatch({ type: "SET_CURRENT_DATE", value: next }),
			setSettingsOpen: (next) =>
				dispatch({ type: "SET_SETTINGS_OPEN", value: next }),
			setApprovalIndex: (next) =>
				dispatch({ type: "SET_APPROVAL_INDEX", value: next }),
			setSelectedEvent: (next) =>
				dispatch({ type: "SET_SELECTED_EVENT", value: next }),
			setCreateEventDate: (next) =>
				dispatch({ type: "SET_CREATE_EVENT_DATE", value: next }),
			setLoading: (next) =>
				dispatch({ type: "SET_LOADING", value: next }),
			setInitialLoading: (next) =>
				dispatch({ type: "SET_INITIAL_LOADING", value: next }),
			setHighlightCredentials: (next) =>
				dispatch({ type: "SET_HIGHLIGHT_CREDENTIALS", value: next }),
		}),
		[
			state.currentDate,
			state.settingsOpen,
			state.approvalIndex,
			state.selectedEvent,
			state.createEventDate,
			state.loading,
			state.initialLoading,
			state.highlightCredentials,
		],
	);

	return <UIContext.Provider value={value}>{children}</UIContext.Provider>;
}

export function useUI() {
	const context = useContext(UIContext);
	if (!context) {
		throw new Error("useUI must be used within a UIProvider");
	}
	return context;
}
