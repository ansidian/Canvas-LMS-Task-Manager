import { AppShell } from "@mantine/core";
import Calendar from "../Calendar";
import MobileAgendaView from "../mobile/MobileAgendaView";
import { CalendarSkeleton } from "../SkeletonLoaders";
import { useAppControllerContext } from "../../contexts/AppControllerContext";

export default function AppMain({ isMobile }) {
	const controller = useAppControllerContext();

	return (
		<AppShell.Main
			style={{
				overflow: isMobile ? "auto" : "hidden",
				display: "flex",
				flexDirection: "column",
				height: isMobile
					? "calc(100dvh - 60px - 56px)"
					: "calc(100vh - 60px)",
			}}
		>
			{controller.initialLoading ? (
				<CalendarSkeleton />
			) : isMobile ? (
				<MobileAgendaView
					currentDate={controller.currentDate}
					events={controller.filteredEvents}
					classes={controller.classes}
					onEventClick={controller.setSelectedEvent}
					onDayAdd={controller.handleDayDoubleClick}
					unassignedColor={controller.unassignedColor}
					onSwipeLeft={controller.nextMonth}
					onSwipeRight={controller.prevMonth}
				/>
			) : (
				<Calendar
					currentDate={controller.currentDate}
					events={controller.filteredEvents}
					classes={controller.classes}
					onEventClick={controller.setSelectedEvent}
					onEventDrop={controller.handleEventDrop}
					onDayDoubleClick={controller.handleDayDoubleClick}
					onDayClick={controller.handleDayClick}
					onEventDelete={controller.handleEventDelete}
					onEventStatusChange={(id, status) =>
						controller.handleEventUpdate(id, { status })
					}
					onCreateTodoistTask={controller.handleCreateTodoistTask}
					hasTodoistToken={controller.hasTodoistToken}
					unassignedColor={controller.unassignedColor}
					ghostEvent={controller.ghostEvent}
				/>
			)}
		</AppShell.Main>
	);
}
