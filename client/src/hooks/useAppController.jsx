import dayjs from "dayjs";
import useEvents from "../contexts/useEvents";
import { useFilters } from "../contexts/FiltersContext";
import { useOnboarding } from "../contexts/OnboardingContext";
import { useUI } from "../contexts/UIContext";
import useAppInitialization from "./useAppInitialization";
import useApprovalFlow from "./useApprovalFlow";
import useCanvasSync from "./useCanvasSync";
import useClassFiltersSync from "./useClassFiltersSync";
import useEventFiltering from "./useEventFiltering";
import useOnboardingTour from "./useOnboardingTour";
import useTodoistSync from "./useTodoistSync";

export default function useAppController({
	api,
	modKey,
	isGuest,
	resetGuestSession,
}) {
	const {
		events,
		setEvents,
		addEvent,
		replaceEvent,
		loadEvents,
		updateEvent: updateEventRecord,
		deleteEvent: deleteEventRecord,
		moveEvent: moveEventRecord,
		createEvent: createEventRecord,
	} = useEvents();
	const {
		statusFilters,
		classFilters,
		unassignedIndex,
		setStatusFilters,
		setClassFilters,
		setUnassignedIndex,
	} = useFilters();
	const {
		currentDate,
		settingsOpen,
		approvalIndex,
		selectedEvent,
		createEventDate,
		ghostEvent,
		loading,
		initialLoading,
		highlightCredentials,
		setCurrentDate,
		setSettingsOpen,
		setApprovalIndex,
		setSelectedEvent,
		setCreateEventDate,
		setGhostEvent,
		setLoading,
		setInitialLoading,
		setHighlightCredentials,
	} = useUI();
	const {
		showOnboarding,
		onboardingStep,
		setShowOnboarding,
		setOnboardingStep,
		completeOnboarding,
	} = useOnboarding();

	const canvas = useCanvasSync({
		api,
		setLoading,
		setHighlightCredentials,
		setSettingsOpen,
		events,
		addEvent,
		replaceEvent,
		updateEvent: updateEventRecord,
	});

	const todoist = useTodoistSync({
		api,
		addEvent,
		replaceEvent,
		updateEvent: updateEventRecord,
		loadClasses: canvas.loadClasses,
	});

	useClassFiltersSync({
		classes: canvas.classes,
		setClassFilters,
	});

	const approvalFlow = useApprovalFlow({
		api,
		events,
		setEvents,
		addEvent,
		replaceEvent,
		pendingItems: canvas.pendingItems,
		setPendingItems: canvas.setPendingItems,
		approvalIndex,
		setApprovalIndex,
	});

	const filtering = useEventFiltering({
		events,
		classes: canvas.classes,
		pendingItems: canvas.pendingItems,
		statusFilters,
		classFilters,
		unassignedColor: canvas.unassignedColor,
		onSelectEvent: setSelectedEvent,
	});

	useAppInitialization({
		loadEvents,
		loadClasses: canvas.loadClasses,
		loadSettings: canvas.loadSettings,
		loadCachedPendingItems: canvas.loadCachedPendingItems,
		fetchCanvasAssignments: canvas.fetchCanvasAssignments,
		fetchTodoistIfStale: todoist.fetchTodoistIfStale,
		setInitialLoading,
		setShowOnboarding,
	});

	const onboardingTour = useOnboardingTour({
		modKey,
		showOnboarding,
		onboardingStep,
		setOnboardingStep,
		completeOnboarding,
	});

	const handleEventUpdate = async (eventId, updates, options = {}) => {
		const updated = await updateEventRecord(eventId, updates);
		if (!updated) return;

		// Convert to Todoist: event assigned to Todoist class without existing link
		if (!updated.todoist_id && updates.class_id != null) {
			const todoistClass = canvas.classes.find(
				(c) => c.canvas_course_id === "todoist",
			);
			if (todoistClass && String(updates.class_id) === String(todoistClass.id)) {
				try {
					const dueDate = updated.due_date;
					const hasTime = dueDate && dueDate.includes("T");
					const todoistTask = await api("/todoist/tasks", {
						method: "POST",
						body: JSON.stringify({
							content: updated.title,
							...(hasTime
								? { due_datetime: dueDate }
								: { due_date: dueDate }),
						}),
					});
					// Link the local event to the new Todoist task
					const linkUpdates = {
						todoist_id: String(todoistTask.id),
						url: `https://app.todoist.com/app/task/${todoistTask.id}`,
					};
					// Todoist only supports incomplete/complete
					if (updated.status === "in_progress") {
						linkUpdates.status = "incomplete";
					}
					await updateEventRecord(eventId, linkUpdates);
				} catch (err) {
					console.error("Failed to create Todoist task for converted event:", err);
				}
			}
		}

		// 2-way Todoist sync
		if (updated.todoist_id) {
			if (updates.status === "complete") {
				api(`/todoist/tasks/${updated.todoist_id}/close`, { method: "POST" })
					.catch((err) => console.error("Failed to close Todoist task:", err));
			} else if (updates.status === "incomplete") {
				api(`/todoist/tasks/${updated.todoist_id}/reopen`, { method: "POST" })
					.catch((err) => console.error("Failed to reopen Todoist task:", err));
			}
			if (updates.title) {
				api(`/todoist/tasks/${updated.todoist_id}`, {
					method: "PATCH",
					body: JSON.stringify({ content: updates.title }),
				}).catch((err) => console.error("Failed to update Todoist task:", err));
			}
		}

		if (options.keepOpen) {
			if (options.closeDelayMs) {
				setTimeout(() => {
					setSelectedEvent(null);
				}, options.closeDelayMs);
			}
		} else {
			setSelectedEvent(null);
		}
	};

	const handleEventDelete = async (eventId) => {
		// Delete on Todoist before deleting locally
		const eventToDelete = events.find((e) => String(e.id) === String(eventId));
		if (eventToDelete?.todoist_id) {
			api(`/todoist/tasks/${eventToDelete.todoist_id}`, { method: "DELETE" })
				.catch((err) => console.error("Failed to delete Todoist task:", err));
		}

		const deleted = await deleteEventRecord(eventId);
		if (deleted) {
			setSelectedEvent(null);
		}
	};

	const handleEventDrop = async (eventId, newDate) => {
		await moveEventRecord(eventId, newDate);
	};

	const handleCreateEvent = async (eventData) => {
		setGhostEvent(null);
		const newEvent = await createEventRecord(eventData);
		if (newEvent) {
			setCreateEventDate(null);
		}
	};

	const handleDayDoubleClick = (date) => {
		setCreateEventDate(date);
	};

	const handleOpenEvent = (eventItem) => {
		if (!eventItem) return;
		setSelectedEvent(eventItem);
	};

	const prevMonth = () => setCurrentDate((date) => date.subtract(1, "month"));
	const nextMonth = () => setCurrentDate((date) => date.add(1, "month"));
	const goToToday = () => setCurrentDate(dayjs());

	return {
		api,
		isGuest: Boolean(isGuest),
		resetGuestSession,
		modKey,
		classes: canvas.classes,
		pendingItems: canvas.pendingItems,
		lastFetchTime: canvas.lastFetchTime,
		unassignedColor: canvas.unassignedColor,
		currentDate,
		settingsOpen,
		approvalIndex,
		selectedEvent,
		createEventDate,
		ghostEvent,
		loading,
		initialLoading,
		highlightCredentials,
		statusFilters,
		classFilters,
		unassignedIndex,
		showOnboarding,
		onboardingStep,
		events,
		filteredEvents: filtering.filteredEvents,
		filteredPendingItems: filtering.filteredPendingItems,
		spotlightActions: filtering.spotlightActions,
		approvalItem: approvalFlow.approvalItem,
		getFetchTooltip: canvas.getFetchTooltip,
		setClasses: canvas.setClasses,
		setUnassignedColor: canvas.setUnassignedColor,
		setStatusFilters,
		setClassFilters,
		setUnassignedIndex,
		setSettingsOpen,
		setApprovalIndex,
		setSelectedEvent,
		setCreateEventDate,
		setGhostEvent,
		setHighlightCredentials,
		loadEvents,
		loadClasses: canvas.loadClasses,
		fetchCanvasAssignments: canvas.fetchCanvasAssignments,
		fetchTodoistTasks: todoist.fetchTodoistTasks,
		handleApprove: approvalFlow.handleApprove,
		handleReject: approvalFlow.handleReject,
		handleEventUpdate,
		handleEventDelete,
		handleEventDrop,
		handleClassesReorder: canvas.handleClassesReorder,
		handleCreateEvent,
		handleDayDoubleClick,
		handleOpenEvent,
		openApprovalModal: approvalFlow.openApprovalModal,
		navigateApproval: approvalFlow.navigateApproval,
		prevMonth,
		nextMonth,
		goToToday,
		handleTourComplete: onboardingTour.handleTourComplete,
		tourStepsWithTracking: onboardingTour.tourStepsWithTracking,
		showDemoApprovalModal: onboardingTour.showDemoApprovalModal,
		showDemoEventModal: onboardingTour.showDemoEventModal,
		canvasAuthError: canvas.canvasAuthError,
		clearCanvasAuthError: canvas.clearCanvasAuthError,
	};
}
