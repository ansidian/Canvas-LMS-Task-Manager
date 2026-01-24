import { Box, Button, useMantineColorScheme } from "@mantine/core";
import { useHotkeys } from "@mantine/hooks";
import { spotlight } from "@mantine/spotlight";
import "@mantine/spotlight/styles.css";
import { OnboardingTour } from "@gfazioli/mantine-onboarding-tour";
import "@gfazioli/mantine-onboarding-tour/styles.css";
import { SignedIn, SignedOut, useAuth, useSession } from "@clerk/clerk-react";
import { useEffect, useMemo, useState } from "react";
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
import { MergeProvider, useMerge } from "./contexts/MergeContext";
import MergePreviewModal from "./components/modals/MergePreviewModal";
import ExpirationModal from "./components/modals/ExpirationModal";
import useMergeDetection from "./hooks/useMergeDetection";
import {
  getGuestEvents,
  getGuestClasses,
  getGuestSettings,
} from "./guest/guestStorage";

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

  useHotkeys([
    ["n", controller.nextMonth],
    ["ArrowRight", controller.nextMonth],
    ["p", controller.prevMonth],
    ["ArrowLeft", controller.prevMonth],
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
  const {
    hasGuestSession,
    autoResumeBlocked,
    guestSessionId,
    clearGuestSession,
    expiredOnLoad,
    clearExpiredSession,
  } = useGuestSession();
  const { session } = useSession();
  const {
    showMergeModal,
    setShowMergeModal,
    mergedSessionId,
    isMergeCompleted,
    setMergedSessionId,
  } = useMerge();

  const [mergeData, setMergeData] = useState(null);

  // Clear merged session ID on sign-out to allow re-merge on next sign-in
  useEffect(() => {
    if (!isSignedIn) {
      setMergedSessionId(null);
    }
  }, [isSignedIn, setMergedSessionId]);

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

  // Detect sign-in and trigger merge modal
  useEffect(() => {
    // Skip if not signed in or no session object
    if (!isSignedIn || !session) {
      return;
    }

    // Skip if no guest session or this session already merged
    if (!hasGuestSession || isMergeCompleted(guestSessionId)) {
      return;
    }

    // Load guest data
    const guestEvents = getGuestEvents();
    const guestClasses = getGuestClasses();
    const guestSettings = getGuestSettings();

    // Skip if guest data is empty
    if (guestEvents.length === 0 && guestClasses.length === 0) {
      return;
    }

    // Fetch authenticated data and detect duplicates
    const fetchAuthDataAndDetect = async () => {
      try {
        const [authEvents, authClasses] = await Promise.all([
          api("/events"),
          api("/classes"),
        ]);

        // Store data for modal
        setMergeData({
          guestEvents,
          guestClasses,
          guestSettings,
          authEvents,
          authClasses,
        });

        // Show merge modal
        setShowMergeModal(true);
      } catch (err) {
        console.error("Failed to fetch auth data for merge:", err);
      }
    };

    fetchAuthDataAndDetect();
  }, [
    isSignedIn,
    session,
    hasGuestSession,
    guestSessionId,
    mergedSessionId, // Track merged session ID instead of callback
    // Stable/omitted:
    // - getToken: stable from useAuth
    // - setShowMergeModal: stable from context
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ]);

  // Compute merge detection results when mergeData is available
  const {
    duplicateEvents = [],
    duplicateClasses = [],
    uniqueGuestEvents = [],
    uniqueGuestClasses = [],
  } = useMergeDetection(
    mergeData?.guestEvents,
    mergeData?.guestClasses,
    mergeData?.authEvents,
    mergeData?.authClasses,
  );

  const handleMergeConfirm = () => {
    // Mark this guest session as merged
    setMergedSessionId(guestSessionId);

    // Clear guest session after successful merge
    clearGuestSession();
    setShowMergeModal(false);
    setMergeData(null);

    // Reload page to show merged data immediately
    window.location.reload();
  };

  const handleMergeClose = () => {
    setShowMergeModal(false);
  };

  // Create API client for merge modal with proper auth
  const mergeApiClient = {
    post: async (endpoint, payload) => {
      const token = await getToken();
      return fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
    },
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

        {/* Merge Modal */}
        {mergeData && (
          <MergePreviewModal
            opened={showMergeModal}
            onClose={handleMergeClose}
            duplicateEvents={duplicateEvents}
            duplicateClasses={duplicateClasses}
            uniqueGuestEvents={uniqueGuestEvents}
            uniqueGuestClasses={uniqueGuestClasses}
            guestSessionId={guestSessionId}
            guestClasses={mergeData.guestClasses}
            guestEvents={mergeData.guestEvents}
            guestSettings={mergeData.guestSettings}
            authClasses={mergeData.authClasses}
            onConfirm={handleMergeConfirm}
            api={mergeApiClient}
          />
        )}
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
