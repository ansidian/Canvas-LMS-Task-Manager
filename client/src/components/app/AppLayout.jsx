import { AppShell } from "@mantine/core";
import { Spotlight } from "@mantine/spotlight";
import { IconSearch } from "@tabler/icons-react";
import { useAppControllerContext } from "../../contexts/AppControllerContext";
import AppHeader from "./AppHeader";
import AppMain from "./AppMain";
import AppModals from "./AppModals";
import AppOnboardingDemos from "./AppOnboardingDemos";
import AppSidebar from "./AppSidebar";

export default function AppLayout() {
	const controller = useAppControllerContext();
	const pendingCount = controller.filteredPendingItems.length;

	return (
		<>
			<Spotlight
				actions={controller.spotlightActions}
				nothingFound="No assignments found"
				searchProps={{
					leftSection: <IconSearch size={20} />,
					placeholder: "Search assignments...",
				}}
				highlightQuery
			/>

			<AppShell
				header={{ height: 60 }}
				aside={{
					width: 320,
					breakpoint: "sm",
					collapsed: { mobile: pendingCount === 0 },
				}}
				padding="md"
			>
				<AppShell.Header>
					<AppHeader pendingCount={pendingCount} />
				</AppShell.Header>
				<AppMain />
				<AppSidebar />
				<AppModals />
				<AppOnboardingDemos />
			</AppShell>
		</>
	);
}
