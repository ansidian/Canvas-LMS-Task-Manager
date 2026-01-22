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

export default function useAppController({ api, modKey, isGuest }) {
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
		loading,
		initialLoading,
		highlightCredentials,
		setCurrentDate,
		setSettingsOpen,
		setApprovalIndex,
		setSelectedEvent,
		setCreateEventDate,
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
		updateEvent: updateEventRecord,
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
		const deleted = await deleteEventRecord(eventId);
		if (deleted) {
			setSelectedEvent(null);
		}
	};

	const handleEventDrop = async (eventId, newDate) => {
		await moveEventRecord(eventId, newDate);
	};

	const handleCreateEvent = async (eventData) => {
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
		setHighlightCredentials,
		loadEvents,
		loadClasses: canvas.loadClasses,
		fetchCanvasAssignments: canvas.fetchCanvasAssignments,
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
