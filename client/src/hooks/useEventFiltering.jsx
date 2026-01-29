import { useMemo } from "react";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import isToday from "dayjs/plugin/isToday";
import isTomorrow from "dayjs/plugin/isTomorrow";
import {
	IconCircle,
	IconCircleHalf2,
	IconCircleCheck,
} from "@tabler/icons-react";

dayjs.extend(relativeTime);
dayjs.extend(isToday);
dayjs.extend(isTomorrow);

function formatDueDate(date) {
	const d = dayjs(date);
	const now = dayjs();

	if (d.isToday()) return "Due today";
	if (d.isTomorrow()) return "Due tomorrow";
	if (d.isBefore(now, "day")) return `Overdue · ${d.format("MMM D")}`;
	if (d.diff(now, "day") <= 7) return `Due ${d.fromNow()}`;
	return `Due ${d.format("MMM D")}`;
}

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
		const filtered = events.filter((event) => {
      const statusMatch = statusFilterSet.has(event.status);
      const classMatch = event.class_id
        ? classFilterSet.has(String(event.class_id))
        : classFilterSet.has("unassigned");
      return statusMatch && classMatch;
    });
		return filtered;
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
		// do not search events from unsynced classes
		const syncedEvents = events.filter((event) => {
			if (!event.class_id) return true;
			const cls = classesById.get(event.class_id);
			return !cls || cls.is_synced !== false;
		});

		return syncedEvents.map((event) => {
			const cls = classesById.get(event.class_id);
			const color = cls?.color || unassignedColor;
			const StatusIcon =
				event.status === "complete"
					? IconCircleCheck
					: event.status === "in_progress"
						? IconCircleHalf2
						: IconCircle;

			return {
				id: String(event.id),
				label: event.title,
				description: `${cls?.name || "No class"} · ${formatDueDate(event.due_date)}`,
				leftSection: (
					<div style={{ display: "flex", alignItems: "center", gap: 8 }}>
						<div
							style={{
								width: 3,
								height: 28,
								borderRadius: 2,
								backgroundColor: color,
								flexShrink: 0,
							}}
						/>
						<StatusIcon size={18} color={color} style={{ flexShrink: 0 }} />
					</div>
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
