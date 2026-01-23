import { AppShell, Box } from "@mantine/core";
import { Spotlight } from "@mantine/spotlight";
import { IconSearch } from "@tabler/icons-react";
import { useAppControllerContext } from "../../contexts/AppControllerContext";
import AppHeader from "./AppHeader";
import AppMain from "./AppMain";
import AppModals from "./AppModals";
import AppOnboardingDemos from "./AppOnboardingDemos";
import AppSidebar from "./AppSidebar";
import GuestBanner from "./GuestBanner";

export default function AppLayout() {
	const controller = useAppControllerContext();
	const pendingCount = controller.filteredPendingItems.length;
	const headerHeight = controller.isGuest ? 92 : 60;

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
				header={{ height: headerHeight }}
				aside={{
					width: 320,
					breakpoint: "sm",
					collapsed: { mobile: pendingCount === 0 },
				}}
				padding="md"
			>
				<AppShell.Header>
					<Box h="100%" style={{ display: "flex", flexDirection: "column" }}>
						{controller.isGuest && <GuestBanner />}
						<Box style={{ flex: 1, display: "flex", alignItems: "center" }}>
							<AppHeader pendingCount={pendingCount} />
						</Box>
					</Box>
				</AppShell.Header>
				<AppMain />
				<AppSidebar />
				<AppModals />
				<AppOnboardingDemos />
			</AppShell>
		</>
	);
}
