import ApprovalModal from "../ApprovalModal";
import CreateEventModal from "../CreateEventModal";
import EventModal from "../EventModal";
import SettingsModal from "../SettingsModal";
import { useAppControllerContext } from "../../contexts/AppControllerContext";

export default function AppModals() {
	const controller = useAppControllerContext();

	return (
		<>
			<SettingsModal
				opened={controller.settingsOpen}
				onClose={() => controller.setSettingsOpen(false)}
				classes={controller.classes}
				onClassesChange={controller.loadClasses}
				onEventsChange={controller.loadEvents}
				onClassesReorder={controller.handleClassesReorder}
				onClassUpdate={(updatedClass) => {
					controller.setClasses((prev) =>
						prev.map((cls) =>
							cls.id === updatedClass.id ? updatedClass : cls,
						),
					);
				}}
				highlightCredentials={controller.highlightCredentials}
				onHighlightClear={() => controller.setHighlightCredentials(false)}
				canvasAuthError={controller.canvasAuthError}
				onCanvasAuthErrorClear={controller.clearCanvasAuthError}
				unassignedColor={controller.unassignedColor}
				onUnassignedColorChange={controller.setUnassignedColor}
			/>

			<ApprovalModal
				opened={controller.approvalIndex >= 0}
				onClose={() => controller.setApprovalIndex(-1)}
				item={controller.approvalItem}
				classes={controller.classes}
				events={controller.events}
				unassignedColor={controller.unassignedColor}
				onApprove={controller.handleApprove}
				onReject={controller.handleReject}
				pendingCount={controller.filteredPendingItems.length}
				currentIndex={controller.approvalIndex}
				onNavigate={controller.navigateApproval}
				onOpenEvent={controller.handleOpenEvent}
			/>

			<EventModal
				opened={!!controller.selectedEvent}
				onClose={() => controller.setSelectedEvent(null)}
				event={controller.selectedEvent}
				classes={controller.classes}
				events={controller.events}
				unassignedColor={controller.unassignedColor}
				onUpdate={controller.handleEventUpdate}
				onDelete={controller.handleEventDelete}
				onOpenEvent={controller.handleOpenEvent}
			/>

			<CreateEventModal
				opened={!!controller.createEventDate}
				onClose={() => controller.setCreateEventDate(null)}
				date={controller.createEventDate}
				classes={controller.classes}
				events={controller.events}
				unassignedColor={controller.unassignedColor}
				onCreate={controller.handleCreateEvent}
				onOpenEvent={controller.handleOpenEvent}
			/>
		</>
	);
}
