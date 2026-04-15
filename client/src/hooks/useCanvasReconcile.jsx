import { useCallback, useEffect, useRef } from "react";

export default function useCanvasReconcile({ api, events, updateEvent }) {
	const eventsRef = useRef([]);
	const updateEventRef = useRef(null);

	useEffect(() => {
		eventsRef.current = Array.isArray(events) ? events : [];
	}, [events]);

	useEffect(() => {
		updateEventRef.current = updateEvent;
	}, [updateEvent]);

	const syncCanvasUpdates = useCallback(async (data) => {
		const allAssignments = data?.allAssignments;
		if (!Array.isArray(allAssignments) || allAssignments.length === 0) {
			return;
		}

		const currentEvents = eventsRef.current || [];
		if (!currentEvents.length) return;

		const assignmentByCanvasId = new Map(
			allAssignments.map((assignment) => [
				assignment.canvas_id,
				assignment,
			]),
		);

		const updates = [];

		for (const event of currentEvents) {
			if (!event?.canvas_id) continue;
			const assignment = assignmentByCanvasId.get(event.canvas_id);
			if (!assignment) continue;

			const patch = {};

			if (
				assignment.due_date &&
				!event.canvas_due_date_override &&
				event.due_date !== assignment.due_date
			) {
				patch.due_date = assignment.due_date;
			}

			if (
				assignment.has_submitted &&
				event.status !== "complete" &&
				!event.canvas_status_override
			) {
				patch.status = "complete";
			}

			if (Object.keys(patch).length > 0) {
				updates.push({ event, patch });
			}
		}

		if (updates.length === 0 || !updateEventRef.current) return;

		await Promise.all(
			updates.map(({ event, patch }) =>
				updateEventRef.current(event.id, patch),
			),
		);
	}, []);

	return { syncCanvasUpdates };
}
