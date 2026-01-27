import React from "react";
import ReactDOM from "react-dom/client";
import {
  MantineProvider,
  createTheme,
  useMantineColorScheme,
} from "@mantine/core";
import { ClerkProvider } from "@clerk/clerk-react";
import { dark } from "@clerk/themes";
import { Toaster } from "sonner";
import "@mantine/core/styles.css";
import "@mantine/dates/styles.css";
import App from "./App";
import "./index.css";
import "./sonner.css";
import ErrorBoundary from "./components/ErrorBoundary";
import { getStorageItem } from "./utils/storage";

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!PUBLISHABLE_KEY) {
  throw new Error("Missing Clerk Publishable Key");
}

const theme = createTheme({
  colors: {
    // Blue-tinted charcoal - like writing at night
    dark: [
      "#F8FAFC", // 0 - ink (primary text)
      "#94A3B8", // 1 - graphite (secondary text)
      "#64748B", // 2 - pencil (muted text)
      "#475569", // 3 - rule-strong (emphasis borders)
      "#3B4455", // 4 - rule (primary borders)
      "#2E323B", // 5 - card-hover
      "#252830", // 6 - card
      "#1E2128", // 7 - parchment
      "#1A1D24", // 8 - between parchment and paper
      "#171A1F", // 9 - paper (background)
    ],
    // Custom ink-blue as primary
    inkBlue: [
      "#E8F0FA",
      "#C4D9F2",
      "#9DBFE8",
      "#7AA3E5",
      "#5B8DD9",
      "#4A7BC7",
      "#3A6AB5",
      "#2D5A9E",
      "#1E4D8C",
      "#163A6B",
    ],
  },
  primaryColor: "inkBlue",
  primaryShade: { light: 8, dark: 4 },
  fontFamily: "Inter, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
});

// Get initial color scheme from localStorage, default to dark
const getInitialColorScheme = () => {
  const stored = getStorageItem("mantine-color-scheme");
  return stored || "dark";
};

// Wrapper component that applies Clerk theme based on Mantine color scheme
function ThemedClerkProvider({ children }) {
  const { colorScheme } = useMantineColorScheme();

  return (
    <ClerkProvider
      publishableKey={PUBLISHABLE_KEY}
      afterSignOutUrl="/?signedOut=1"
      appearance={{
        baseTheme: colorScheme === "dark" ? dark : undefined,
        layout: {
          logoImageUrl: "https://ctm.andysu.tech/icon.png",
          logoPlacement: "inside",
        },
        elements: {
          logoBox: {
            pointerEvents: "none",
            cursor: "default",
          },
        },
      }}
      localization={{
        signIn: {
          start: {
            title: "Canvas Task Manager (CTM)",
            subtitle: "Welcome! Please sign in to continue",
          },
        },
        signUp: {
          start: {
            title: "Canvas Task Manager (CTM)",
            subtitle: "Create your account to get started",
          },
        },
      }}
    >
      {children}
    </ClerkProvider>
  );
}

function ThemedToaster() {
  const { colorScheme } = useMantineColorScheme();
  return <Toaster position="top-center" theme={colorScheme} richColors />;
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <MantineProvider theme={theme} defaultColorScheme={getInitialColorScheme()}>
      <ThemedClerkProvider>
        <ThemedToaster />
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </ThemedClerkProvider>
    </MantineProvider>
  </React.StrictMode>,
);
