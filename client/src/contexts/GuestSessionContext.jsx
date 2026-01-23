import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  ensureGuestSession as ensureGuestSessionStorage,
  getAutoResumeBlocked,
  getGuestSession,
  resetGuestSession as resetGuestSessionStorage,
  setAutoResumeBlocked,
  touchGuestSession,
} from "../guest/guestSession";
import { clearGuestData } from "../guest/guestStorage";

const GuestSessionContext = createContext(null);

const hasSignedOutParam = () => {
  if (typeof window === "undefined") return false;
  const params = new URLSearchParams(window.location.search);
  return params.get("signedOut") === "1";
};

const clearSignedOutParam = () => {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  url.searchParams.delete("signedOut");
  const nextUrl = `${url.pathname}${url.search}${url.hash}`;
  window.history.replaceState({}, "", nextUrl);
};

export function GuestSessionProvider({ children, isSignedIn = false }) {
  const signedOutParam = useMemo(() => hasSignedOutParam(), []);
  const initialAutoResumeBlocked = signedOutParam || getAutoResumeBlocked();
  const [session, setSession] = useState(() => {
    const existing = getGuestSession();
    if (existing?.id) return existing;
    if (!isSignedIn && !initialAutoResumeBlocked) {
      return ensureGuestSessionStorage();
    }
    return null;
  });
  const [autoResumeBlocked, setAutoResumeBlockedState] = useState(
    () => initialAutoResumeBlocked,
  );

  useEffect(() => {
    if (!signedOutParam) return;
    setAutoResumeBlockedState(true);
    setAutoResumeBlocked(true);
    clearSignedOutParam();
  }, [signedOutParam]);

  useEffect(() => {
    if (isSignedIn || autoResumeBlocked) return;
    const nextSession = ensureGuestSessionStorage();
    setSession(nextSession);
  }, [isSignedIn, autoResumeBlocked]);

  const startGuestSession = () => {
    setAutoResumeBlockedState(false);
    setAutoResumeBlocked(false);
    const nextSession = touchGuestSession();
    setSession(nextSession);
    return nextSession;
  };

  const resetGuestSession = () => {
    const nextSession = resetGuestSessionStorage();
    setSession(nextSession);
    return nextSession;
  };

  const ensureGuestSession = () => {
    const nextSession = ensureGuestSessionStorage();
    setSession(nextSession);
    return nextSession;
  };

  const clearAutoResumeBlocked = () => {
    setAutoResumeBlockedState(false);
    setAutoResumeBlocked(false);
  };

  const clearGuestSession = () => {
    clearGuestData();
    setSession(null);
  };

  const value = useMemo(
    () => ({
      hasGuestSession: Boolean(session?.id),
      guestSessionId: session?.id ?? null,
      autoResumeBlocked,
      startGuestSession,
      resetGuestSession,
      ensureGuestSession,
      clearAutoResumeBlocked,
      clearGuestSession,
    }),
    [session?.id, autoResumeBlocked],
  );

  return (
    <GuestSessionContext.Provider value={value}>
      {children}
    </GuestSessionContext.Provider>
  );
}

export function useGuestSession() {
  const context = useContext(GuestSessionContext);
  if (!context) {
    throw new Error("useGuestSession must be used within a GuestSessionProvider");
  }
  return context;
}
