import { useMantineColorScheme } from "@mantine/core";
import { useHotkeys } from "@mantine/hooks";
import { spotlight } from "@mantine/spotlight";
import "@mantine/spotlight/styles.css";
import { OnboardingTour } from "@gfazioli/mantine-onboarding-tour";
import "@gfazioli/mantine-onboarding-tour/styles.css";
import { SignedIn, SignedOut, SignIn, useAuth } from "@clerk/clerk-react";
import AppLayout from "./components/app/AppLayout";
import "./onboarding-tour.css";
import { EventsProvider } from "./contexts/EventsContext";
import { FiltersProvider } from "./contexts/FiltersContext";
import { OnboardingProvider } from "./contexts/OnboardingContext";
import { UIProvider } from "./contexts/UIContext";
import { AppControllerProvider } from "./contexts/AppControllerContext";
import useAppController from "./hooks/useAppController";

const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
const modKey = isMac ? "⌘" : "Ctrl";

// Main App Component
function AppContent() {
  const { getToken } = useAuth();

  // API helper with Clerk auth
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
    <EventsProvider api={api}>
      <FiltersProvider>
        <UIProvider>
          <OnboardingProvider>
            <AppContentBody api={api} />
          </OnboardingProvider>
        </UIProvider>
      </FiltersProvider>
    </EventsProvider>
  );
}

function AppContentBody({ api }) {
  const { toggleColorScheme } = useMantineColorScheme();
  const controller = useAppController({ api, modKey });
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

// Sign-in page wrapper component
function SignInPage() {
  const { colorScheme } = useMantineColorScheme();

  const backgroundStyle = {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "100vh",
    background:
      colorScheme === "dark"
        ? "linear-gradient(135deg, #1f2937 0%, #1e293b 50%, #0f172a 100%)"
        : "linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)",
  };

  return (
    <div style={backgroundStyle}>
      <SignIn />
    </div>
  );
}

// Main export with authentication
export default function App() {
  return (
    <>
      <SignedOut>
        <SignInPage />
      </SignedOut>

      <SignedIn>
        <AppContent />
      </SignedIn>
    </>
  );
}
