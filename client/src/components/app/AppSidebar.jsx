import { AppShell } from "@mantine/core";
import ResizableSidebar from "../ResizableSidebar";
import { PendingSidebarSkeleton } from "../SkeletonLoaders";
import { useAppControllerContext } from "../../contexts/AppControllerContext";

export default function AppSidebar() {
	const controller = useAppControllerContext();

	return (
		<AppShell.Aside p={0}>
			{controller.loading ? (
				<PendingSidebarSkeleton />
			) : (
				<ResizableSidebar
					pendingItems={controller.pendingItems}
					onPendingItemClick={controller.openApprovalModal}
					statusFilters={controller.statusFilters}
					onStatusFiltersChange={controller.setStatusFilters}
					classFilters={controller.classFilters}
					onClassFiltersChange={controller.setClassFilters}
					classes={controller.classes}
					unassignedColor={controller.unassignedColor}
					unassignedIndex={controller.unassignedIndex}
					onUnassignedIndexChange={controller.setUnassignedIndex}
					onClassesReorder={controller.handleClassesReorder}
				/>
			)}
		</AppShell.Aside>
	);
}
