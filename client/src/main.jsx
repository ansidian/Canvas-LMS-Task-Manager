import React from "react";
import ReactDOM from "react-dom/client";
import {
  MantineProvider,
  createTheme,
  useMantineColorScheme,
} from "@mantine/core";
import { ClerkProvider } from "@clerk/clerk-react";
import { dark } from "@clerk/themes";
import "@mantine/core/styles.css";
import "@mantine/dates/styles.css";
import App from "./App";
import "./index.css";

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!PUBLISHABLE_KEY) {
  throw new Error("Missing Clerk Publishable Key");
}

const theme = createTheme({
  colors: {
    dark: [
      "#fafafa", // 0 - text-primary (dark mode)
      "#a1a1aa", // 1 - text-secondary
      "#71717a", // 2 - text-muted
      "#3a3a3f", // 3 - border-secondary
      "#2a2a2e", // 4 - border-primary
      "#232326", // 5 - bg-hover
      "#1c1c1f", // 6 - bg-card
      "#18181b", // 7 - bg-tertiary
      "#111113", // 8 - bg-secondary
      "#0a0a0b", // 9 - bg-primary
    ],
  },
  primaryColor: "blue",
  fontFamily: "Inter, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
});

// Get initial color scheme from localStorage, default to dark
const getInitialColorScheme = () => {
  const stored = localStorage.getItem("mantine-color-scheme");
  return stored || "dark";
};

// Wrapper component that applies Clerk theme based on Mantine color scheme
function ThemedClerkProvider({ children }) {
  const { colorScheme } = useMantineColorScheme();

  return (
    <ClerkProvider
      publishableKey={PUBLISHABLE_KEY}
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

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <MantineProvider theme={theme} defaultColorScheme={getInitialColorScheme()}>
      <ThemedClerkProvider>
        <App />
      </ThemedClerkProvider>
    </MantineProvider>
  </React.StrictMode>,
);
