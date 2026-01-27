import { useCallback, useEffect, useRef } from "react";

const QUIZ_SUBMISSION_CONCURRENCY = 4;

const parseCanvasIds = (canvasId) => {
	if (!canvasId || typeof canvasId !== "string") return null;
	const [courseId, assignmentId] = canvasId.split("-");
	if (!courseId || !assignmentId) return null;
	return { courseId, assignmentId };
};

const mapLimit = async (items, limit, mapper) => {
	const results = new Array(items.length);
	let index = 0;
	const workers = Array.from({ length: Math.min(limit, items.length) }, () =>
		(async () => {
			while (index < items.length) {
				const currentIndex = index;
				index += 1;
				results[currentIndex] = await mapper(items[currentIndex]);
			}
		})(),
	);
	await Promise.all(workers);
	return results;
};

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

		const dueDateUpdates = [];
		const quizTargets = [];

		for (const event of currentEvents) {
			if (!event?.canvas_id) continue;
			const assignment = assignmentByCanvasId.get(event.canvas_id);
			if (!assignment?.due_date) continue;

			if (
				!event.canvas_due_date_override &&
				event.due_date !== assignment.due_date
			) {
				dueDateUpdates.push({ event, due_date: assignment.due_date });
			}

			// Only auto-complete if user hasn't manually overridden status
			if (event.status !== "complete" && assignment.quiz_id && !event.canvas_status_override) {
				const ids = parseCanvasIds(event.canvas_id);
				if (ids) {
					quizTargets.push({ event, ids });
				}
			}
		}

		if (dueDateUpdates.length > 0 && updateEventRef.current) {
			await Promise.all(
				dueDateUpdates.map(({ event, due_date }) =>
					updateEventRef.current(event.id, { due_date }),
				),
			);
		}

		if (quizTargets.length === 0 || !updateEventRef.current) return;

		const submissions = await mapLimit(
			quizTargets,
			QUIZ_SUBMISSION_CONCURRENCY,
			async ({ event, ids }) => {
				try {
					const data = await api(
						`/canvas/submissions/self?courseId=${ids.courseId}&assignmentId=${ids.assignmentId}`,
					);
					return { event, submission: data };
				} catch (err) {
					console.warn("Failed to fetch Canvas submission:", err);
					return null;
				}
			},
		);

		const completed = submissions.filter(
			(item) => item?.submission?.submitted_at,
		);

		if (completed.length > 0) {
			await Promise.all(
				completed.map(({ event }) =>
					updateEventRef.current(event.id, { status: "complete" }),
				),
			);
		}
	}, [api]);

	return { syncCanvasUpdates };
}
