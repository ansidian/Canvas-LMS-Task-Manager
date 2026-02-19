import { AppShell } from "@mantine/core";
import Calendar from "../Calendar";
import { CalendarSkeleton } from "../SkeletonLoaders";
import { useAppControllerContext } from "../../contexts/AppControllerContext";

export default function AppMain() {
	const controller = useAppControllerContext();

	return (
		<AppShell.Main
			style={{
				overflow: "hidden",
				display: "flex",
				flexDirection: "column",
				height: "calc(100vh - 60px)",
			}}
		>
			{controller.initialLoading ? (
				<CalendarSkeleton />
			) : (
				<Calendar
					currentDate={controller.currentDate}
					events={controller.filteredEvents}
					classes={controller.classes}
					onEventClick={controller.setSelectedEvent}
					onEventDrop={controller.handleEventDrop}
					onDayDoubleClick={controller.handleDayDoubleClick}
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
