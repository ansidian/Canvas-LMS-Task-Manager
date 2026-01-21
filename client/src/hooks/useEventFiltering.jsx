import { useMemo } from "react";
import dayjs from "dayjs";
import {
	IconCircle,
	IconCircleHalf2,
	IconCircleCheck,
} from "@tabler/icons-react";

export default function useEventFiltering({
	events,
	classes,
	pendingItems,
	statusFilters,
	classFilters,
	unassignedColor,
	onSelectEvent,
}) {
	const classesById = useMemo(() => {
		const map = new Map();
		classes.forEach((cls) => {
			map.set(cls.id, cls);
		});
		return map;
	}, [classes]);

	const statusFilterSet = useMemo(
		() => new Set(statusFilters),
		[statusFilters],
	);
	const classFilterSet = useMemo(() => new Set(classFilters), [classFilters]);

	const filteredEvents = useMemo(() => {
		return events.filter((event) => {
			const statusMatch = statusFilterSet.has(event.status);
			const classMatch = event.class_id
				? classFilterSet.has(String(event.class_id))
				: classFilterSet.has("unassigned");
			return statusMatch && classMatch;
		});
	}, [events, statusFilterSet, classFilterSet]);

	const filteredPendingItems = useMemo(() => {
		const unsyncedCourseIds = new Set(
			classes
				.filter((cls) => cls.canvas_course_id && !cls.is_synced)
				.map((cls) => cls.canvas_course_id),
		);
		return pendingItems.filter(
			(item) => !unsyncedCourseIds.has(item.canvas_course_id),
		);
	}, [pendingItems, classes]);

	const spotlightActions = useMemo(() => {
		return events.map((event) => {
			const cls = classesById.get(event.class_id);
			const StatusIcon =
				event.status === "complete"
					? IconCircleCheck
					: event.status === "in_progress"
						? IconCircleHalf2
						: IconCircle;

			return {
				id: String(event.id),
				label: event.title,
				description: `${cls?.name || "No class"} • Due: ${dayjs(
					event.due_date,
				).format("MMM D, YYYY")}`,
				leftSection: (
					<StatusIcon size={20} color={cls?.color || unassignedColor} />
				),
				onClick: () => onSelectEvent(event),
			};
		});
	}, [events, classesById, unassignedColor, onSelectEvent]);

	return {
		filteredEvents,
		filteredPendingItems,
		spotlightActions,
	};
}
