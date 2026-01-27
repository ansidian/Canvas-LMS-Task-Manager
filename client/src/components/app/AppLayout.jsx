import { AppShell, Box } from "@mantine/core";
import { Spotlight } from "@mantine/spotlight";
import { IconSearch } from "@tabler/icons-react";
import { useAppControllerContext } from "../../contexts/AppControllerContext";
import useEvents from "../../contexts/useEvents";
import useUpgradePrompt from "../../hooks/useUpgradePrompt";
import useExpirationWarning from "../../hooks/useExpirationWarning";
import AppHeader from "./AppHeader";
import AppMain from "./AppMain";
import AppModals from "./AppModals";
import AppOnboardingDemos from "./AppOnboardingDemos";
import AppSidebar from "./AppSidebar";
import GuestBanner from "./GuestBanner";
import UpgradeBanner from "../upgrade/UpgradeBanner";
import ExpirationWarningBanner from "../upgrade/ExpirationWarningBanner";

export default function AppLayout() {
	const controller = useAppControllerContext();
	const { events } = useEvents();
	const pendingCount = controller.filteredPendingItems.length;

	// Check if guest user has created events to show upgrade banner
	const hasGuestEvents = controller.isGuest && events.length > 0;
	const { shouldShowBanner, dismissBanner } = useUpgradePrompt(
		controller.isGuest,
		hasGuestEvents
	);

	// Check for expiration warnings
	const { shouldShowWarning, daysRemaining, warningLevel, dismissWarning } =
		useExpirationWarning(controller.isGuest);

	// Calculate header height: base 60px + 32px for GuestBanner + 48px for ExpirationWarningBanner + 48px for UpgradeBanner if shown
	let headerHeight = 60;
	if (controller.isGuest) {
		headerHeight += 32; // GuestBanner
		if (shouldShowWarning) {
			headerHeight += 48; // ExpirationWarningBanner
		}
		if (shouldShowBanner) {
			headerHeight += 48; // UpgradeBanner
		}
	}

	return (
    <>
      <Spotlight
        actions={controller.spotlightActions}
        nothingFound="No assignments found"
        searchProps={{
          placeholder: "Find your assignments...",
        }}
        highlightQuery
        limit={10}
        scrollable
        maxHeight={400}
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
            {controller.isGuest && shouldShowWarning && (
              <ExpirationWarningBanner
                daysRemaining={daysRemaining}
                warningLevel={warningLevel}
                onDismiss={dismissWarning}
              />
            )}
            {controller.isGuest && shouldShowBanner && (
              <UpgradeBanner onDismiss={dismissBanner} />
            )}
            <Box style={{ flex: 1, display: "flex", alignItems: "center" }}>
              <AppHeader
                pendingCount={pendingCount}
                isGuest={controller.isGuest}
              />
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
