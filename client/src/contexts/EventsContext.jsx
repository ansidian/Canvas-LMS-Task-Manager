import { useCallback, useMemo, useReducer, useRef } from "react";
import {
	CANVAS_DND_TOAST_ID,
	notifyAction,
	notifyError,
	notifyUndo,
} from "../utils/notify.jsx";
import {
	combineLocalDateAndTime,
	extractTime,
	hasTimeComponent,
	toUTCString,
} from "../utils/datetime";
import EventsContext from "./events-context";

const initialState = {
	events: [],
};

function eventsReducer(state, action) {
	switch (action.type) {
		case "SET_EVENTS":
			return { ...state, events: action.events };
		case "ADD_EVENT":
			return { ...state, events: [...state.events, action.event] };
		case "REPLACE_EVENT":
			return {
				...state,
				events: state.events.map((event) =>
					event.id === action.tempId ? action.event : event,
				),
			};
		case "UPDATE_EVENT":
			return {
				...state,
				events: state.events.map((event) =>
					event.id === action.event.id ? action.event : event,
				),
			};
		case "REMOVE_EVENT":
			return {
				...state,
				events: state.events.filter((event) => event.id !== action.eventId),
			};
		case "RESTORE_EVENT": {
			const nextEvents = [...state.events];
			nextEvents.splice(action.index, 0, action.event);
			return {
				...state,
				events: nextEvents,
			};
		}
		default:
			return state;
	}
}

export function EventsProvider({ api, children }) {
	const [state, dispatch] = useReducer(eventsReducer, initialState);
	const updateRequestRef = useRef(new Map());
	const pendingDeleteRef = useRef(new Map());

	const setEvents = useCallback((events) => {
		dispatch({ type: "SET_EVENTS", events });
	}, []);

	const addEvent = useCallback((event) => {
		dispatch({ type: "ADD_EVENT", event });
	}, []);

	const replaceEvent = useCallback((tempId, event) => {
		dispatch({ type: "REPLACE_EVENT", tempId, event });
	}, []);

	const removeEvent = useCallback((eventId) => {
		dispatch({ type: "REMOVE_EVENT", eventId });
	}, []);

	const loadEvents = useCallback(async () => {
		try {
			const data = await api("/events");
			dispatch({ type: "SET_EVENTS", events: data });
			return data;
		} catch (err) {
			console.error("Failed to load events:", err);
			return [];
		}
	}, [api]);

	const createEvent = useCallback(
		async (eventData) => {
			try {
				const newEvent = await api("/events", {
					method: "POST",
					body: JSON.stringify({ ...eventData, status: "incomplete" }),
				});
				dispatch({ type: "ADD_EVENT", event: newEvent });
				return newEvent;
			} catch (err) {
				console.error("Failed to create event:", err);
				return null;
			}
		},
		[api],
	);

	const updateEvent = useCallback(
		async (eventId, updates) => {
			const requestId = (updateRequestRef.current.get(eventId) || 0) + 1;
			updateRequestRef.current.set(eventId, requestId);
			try {
				const updated = await api(`/events/${eventId}`, {
					method: "PATCH",
					body: JSON.stringify(updates),
				});
				if (updateRequestRef.current.get(eventId) !== requestId) return null;
				dispatch({ type: "UPDATE_EVENT", event: updated });
				return updated;
			} catch (err) {
				console.error("Failed to update event:", err);
				return null;
			}
		},
		[api],
	);

	const deleteEvent = useCallback(
		async (eventId) => {
			const eventIndex = state.events.findIndex(
				(event) => event.id === eventId,
			);
			if (eventIndex === -1) return false;

			const deletedEvent = state.events[eventIndex];
			dispatch({ type: "REMOVE_EVENT", eventId });

			const timeoutId = setTimeout(async () => {
				try {
					await api(`/events/${eventId}`, { method: "DELETE" });
				} catch (err) {
					console.error("Failed to delete event:", err);
					dispatch({
						type: "RESTORE_EVENT",
						event: deletedEvent,
						index: eventIndex,
					});
					notifyError(err.message || "Failed to delete event.");
				} finally {
					pendingDeleteRef.current.delete(eventId);
				}
			}, 7000);

			pendingDeleteRef.current.set(eventId, {
				timeoutId,
				event: deletedEvent,
				index: eventIndex,
			});

			const deletedTitle = deletedEvent?.title || "Untitled event";
			notifyUndo({
				title: `Deleted "${deletedTitle}"`,
				message: "Event has been deleted.",
				onUndo: () => {
					const pending = pendingDeleteRef.current.get(eventId);
					if (!pending) return;
					clearTimeout(pending.timeoutId);
					pendingDeleteRef.current.delete(eventId);
					dispatch({
						type: "RESTORE_EVENT",
						event: pending.event,
						index: pending.index,
					});
				},
			});

			return true;
		},
		[api, state.events],
	);

	const moveEvent = useCallback(
    async (eventId, newDate) => {
      try {
        const originalEvent = state.events.find(
          (event) => event.id === eventId,
        );
        let updatedDueDate = newDate;

        if (originalEvent && hasTimeComponent(originalEvent.due_date)) {
          const timeString = extractTime(originalEvent.due_date);
          const localDateTime = combineLocalDateAndTime(newDate, timeString);
          updatedDueDate = toUTCString(localDateTime);
        }

        if (originalEvent && updatedDueDate === originalEvent.due_date) {
          return originalEvent;
        }

        const updated = await api(`/events/${eventId}`, {
          method: "PATCH",
          body: JSON.stringify({ due_date: updatedDueDate }),
        });
        dispatch({ type: "UPDATE_EVENT", event: updated });
        if (updated?.canvas_id && !updated?.canvas_due_date_override) {
          const eventTitle = originalEvent.title;
          notifyAction({
            id: CANVAS_DND_TOAST_ID,
            title: `${eventTitle}'s date changed locally`,
            message: "Canvas will resync this due date on the next fetch.",
            actionLabel: "Keep change",
            onAction: () =>
              updateEvent(eventId, { canvas_due_date_override: 1 }),
            duration: 7000,
            countdown: 7,
          });
        }
        return updated;
      } catch (err) {
        console.error("Failed to move event:", err);
        return null;
      }
    },
    [api, state.events, updateEvent],
  );

	const value = useMemo(
		() => ({
			events: state.events,
			setEvents,
			addEvent,
			replaceEvent,
			removeEvent,
			loadEvents,
			createEvent,
			updateEvent,
			deleteEvent,
			moveEvent,
		}),
		[
			state.events,
			setEvents,
			addEvent,
			replaceEvent,
			removeEvent,
			loadEvents,
			createEvent,
			updateEvent,
			deleteEvent,
			moveEvent,
		],
	);

	return (
		<EventsContext.Provider value={value}>{children}</EventsContext.Provider>
	);
}
