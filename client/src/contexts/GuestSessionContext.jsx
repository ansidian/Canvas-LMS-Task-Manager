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
import { isGuestSessionExpired } from "../guest/guestExpiration";

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

  // Detect if session was expired on initial load
  const [expiredOnLoad, setExpiredOnLoad] = useState(() => {
    const existing = getGuestSession();
    return existing?.id ? isGuestSessionExpired() : false;
  });

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
    // Reset expiration timestamp; prevent stale expiration state after merge
    touchGuestSession();
    setSession(null);
    // Clear expiration flag so modal doesn't reappear on sign-out
    setExpiredOnLoad(false);
  };

  /**
   * Expiration + Merge Flow Interaction (MSG-03):
   *
   * When an expired guest clicks "Sign In" from ExpirationModal:
   * 1. SignInButton routes to Clerk (data NOT cleared yet)
   * 2. After Clerk sign-in, App.jsx detects guest session + merge needed
   * 3. MergePreviewModal shows with guest data still intact
   * 4. User confirms merge → guest data migrates to auth account
   * 5. handleMergeConfirm calls clearGuestSession() → data finally cleared
   *
   * Ensures guest data is never lost before merge confirmation.
   * clearExpiredSession is only called for "Continue as Guest" path.
   */
  const clearExpiredSession = () => {
    // Clear data but preserve session ID (same guest identity, fresh data)
    clearGuestData();
    // Reset lastActiveAt to now
    const freshSession = touchGuestSession();
    setSession(freshSession);
    // Mark expiration handled
    setExpiredOnLoad(false);
  };

  const value = useMemo(
    () => ({
      hasGuestSession: Boolean(session?.id),
      guestSessionId: session?.id ?? null,
      autoResumeBlocked,
      expiredOnLoad,
      startGuestSession,
      resetGuestSession,
      ensureGuestSession,
      clearAutoResumeBlocked,
      clearGuestSession,
      clearExpiredSession,
    }),
    [session?.id, autoResumeBlocked, expiredOnLoad],
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
