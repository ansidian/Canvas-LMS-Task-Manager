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
					unassignedColor={controller.unassignedColor}
				/>
			)}
		</AppShell.Main>
	);
}
