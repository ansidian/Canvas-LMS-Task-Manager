import { Box, Button, useMantineColorScheme } from "@mantine/core";
import { useHotkeys } from "@mantine/hooks";
import { spotlight } from "@mantine/spotlight";
import "@mantine/spotlight/styles.css";
import { OnboardingTour } from "@gfazioli/mantine-onboarding-tour";
import "@gfazioli/mantine-onboarding-tour/styles.css";
import { SignedIn, SignedOut, useAuth } from "@clerk/clerk-react";
import AppLayout from "./components/app/AppLayout";
import "./onboarding-tour.css";
import { EventsProvider } from "./contexts/EventsContext";
import { FiltersProvider } from "./contexts/FiltersContext";
import { OnboardingProvider } from "./contexts/OnboardingContext";
import { UIProvider } from "./contexts/UIContext";
import { AppControllerProvider } from "./contexts/AppControllerContext";
import useAppController from "./hooks/useAppController";
import GuestEntry from "./components/auth/GuestEntry";
import guestApi from "./guest/guestApi";
import {
  GuestSessionProvider,
  useGuestSession,
} from "./contexts/GuestSessionContext";
import { MergeProvider } from "./contexts/MergeContext";
import MergePreviewModal from "./components/modals/MergePreviewModal";
import ExpirationModal from "./components/modals/ExpirationModal";
import useMergeFlow from "./hooks/useMergeFlow";

const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
const modKey = isMac ? "⌘" : "Ctrl";

// Main App Component
function AppContent({ api, isGuest }) {
  return (
    <EventsProvider api={api}>
      <FiltersProvider>
        <UIProvider>
          <OnboardingProvider>
            <AppContentBody api={api} isGuest={isGuest} />
          </OnboardingProvider>
        </UIProvider>
      </FiltersProvider>
    </EventsProvider>
  );
}

function AppContentBody({ api, isGuest }) {
  const { toggleColorScheme } = useMantineColorScheme();
  const { resetGuestSession } = useGuestSession();
  const controller = useAppController({
    api,
    modKey,
    isGuest,
    resetGuestSession,
  });
  const shouldStartOnboarding =
    controller.showOnboarding &&
    !controller.loading &&
    !controller.initialLoading;

  // Approval modal has its own arrow key handlers, so disable calendar navigation when it's open
  const isApprovalModalOpen = controller.approvalIndex >= 0;

  useHotkeys([
    ["n", () => !isApprovalModalOpen && controller.nextMonth()],
    ["ArrowRight", () => !isApprovalModalOpen && controller.nextMonth()],
    ["p", () => !isApprovalModalOpen && controller.prevMonth()],
    ["ArrowLeft", () => !isApprovalModalOpen && controller.prevMonth()],
    ["t", controller.goToToday],
    ["mod+j", () => toggleColorScheme()],
    ["mod+k", () => spotlight.open()],
    ["r", () => controller.fetchCanvasAssignments()],
    ["mod+,", () => controller.setSettingsOpen(true)],
  ]);

  return (
    <OnboardingTour
      tour={controller.tourStepsWithTracking}
      started={shouldStartOnboarding}
      onOnboardingTourEnd={controller.handleTourComplete}
      onOnboardingTourClose={controller.handleTourComplete}
      withSkipButton
      withPrevButton
      withNextButton
      withStepper
      focusRevealProps={{
        withOverlay: true,
        disableTargetInteraction: true,
        overlayProps: {
          backgroundOpacity: 0.6,
          blur: 0,
          zIndex: 100,
        },
        popoverProps: {
          zIndex: 200,
          offset: 16,
        },
      }}
    >
      <AppControllerProvider value={controller}>
        <AppLayout />
      </AppControllerProvider>
    </OnboardingTour>
  );
}

function AppShell({ getToken, isSignedIn }) {
  const { hasGuestSession, autoResumeBlocked, expiredOnLoad, clearExpiredSession } =
    useGuestSession();
  const { mergeModalProps } = useMergeFlow(getToken, isSignedIn);

  const api = async (endpoint, options = {}) => {
    const token = await getToken();
    const res = await fetch(`/api${endpoint}`, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...options.headers,
      },
      ...options,
    });
    if (!res.ok) {
      const error = await res
        .json()
        .catch(() => ({ message: "Request failed" }));
      throw new Error(error.message || "Request failed");
    }
    return res.json();
  };

  return (
    <>
      <SignedOut>
        {expiredOnLoad ? (
          <ExpirationModal
            opened={expiredOnLoad}
            onContinueAsGuest={clearExpiredSession}
            onClose={clearExpiredSession}
          />
        ) : hasGuestSession && !autoResumeBlocked ? (
          <AppContent api={guestApi} isGuest />
        ) : (
          <GuestEntry />
        )}
      </SignedOut>

      <SignedIn>
        <AppContent api={api} isGuest={false} />
        {mergeModalProps && <MergePreviewModal {...mergeModalProps} />}
      </SignedIn>
    </>
  );
}

// Main export with authentication
export default function App() {
  const { getToken, isSignedIn } = useAuth();

  return (
    <GuestSessionProvider isSignedIn={isSignedIn}>
      <MergeProvider>
        <AppShell getToken={getToken} isSignedIn={isSignedIn} />
      </MergeProvider>
    </GuestSessionProvider>
  );
}
