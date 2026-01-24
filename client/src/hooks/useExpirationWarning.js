import { useState, useEffect, useMemo } from "react";
import { getGuestExpirationInfo } from "../guest/guestExpiration";

const DISMISS_KEY = "guest_expiration_warning_dismissed";

/**
 * Hook to manage expiration warning display logic
 * @param {boolean} isGuest - Whether the user is in guest mode
 * @returns {{shouldShowWarning: boolean, daysRemaining: number | null, warningLevel: 'urgent' | 'warning' | null, dismissWarning: function}}
 */
export default function useExpirationWarning(isGuest) {
  // Get expiration info only when in guest mode
  const info = useMemo(
    () => (isGuest ? getGuestExpirationInfo() : null),
    [isGuest]
  );

  // Track dismissed state with sessionStorage (resets each session/visit)
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === "undefined") return false;
    return sessionStorage.getItem(DISMISS_KEY) === "1";
  });

  // Calculate if warning should be shown
  const shouldShowWarning =
    isGuest &&
    !dismissed &&
    info?.warningLevel !== null;

  // Function to dismiss the warning
  const dismissWarning = () => {
    if (typeof window !== "undefined") {
      sessionStorage.setItem(DISMISS_KEY, "1");
    }
    setDismissed(true);
  };

  return {
    shouldShowWarning,
    daysRemaining: info?.daysRemaining ?? null,
    warningLevel: info?.warningLevel ?? null,
    dismissWarning,
  };
}
