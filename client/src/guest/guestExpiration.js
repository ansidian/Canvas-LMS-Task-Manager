import { getGuestSession } from "./guestSession";

export const GUEST_EXPIRATION_DAYS = 30;
export const GUEST_WARNING_THRESHOLDS = [7, 1];

/**
 * Check if the guest session has expired (inactive for >= 30 days)
 * @returns {boolean} true if session is expired, false otherwise
 */
export const isGuestSessionExpired = () => {
  const session = getGuestSession();
  if (!session || !session.lastActiveAt) {
    return false; // nothing to expire
  }

  const daysSinceActive = Math.floor(
    (Date.now() - session.lastActiveAt) / (1000 * 60 * 60 * 24)
  );

  return daysSinceActive >= GUEST_EXPIRATION_DAYS;
};

/**
 * Get detailed expiration information for the current guest session
 * @returns {{expired: boolean, daysRemaining: number | null, warningLevel: 'urgent' | 'warning' | null}}
 */
export const getGuestExpirationInfo = () => {
  const session = getGuestSession();
  if (!session || !session.lastActiveAt) {
    return {
      expired: false,
      daysRemaining: null,
      warningLevel: null,
    };
  }

  const daysSinceActive = Math.floor(
    (Date.now() - session.lastActiveAt) / (1000 * 60 * 60 * 24)
  );

  const daysRemaining = GUEST_EXPIRATION_DAYS - daysSinceActive;
  const expired = daysRemaining <= 0;

  let warningLevel = null;
  if (daysRemaining <= 1 && daysRemaining > 0) {
    warningLevel = "urgent";
  } else if (daysRemaining <= 7 && daysRemaining > 1) {
    warningLevel = "warning";
  }

  return {
    expired,
    daysRemaining,
    warningLevel,
  };
};
