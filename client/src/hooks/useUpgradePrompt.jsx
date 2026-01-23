import { useEffect, useState } from "react";

const DISMISS_KEY = "upgrade_banner_dismissed";
const TIMESTAMP_KEY = "upgrade_banner_timestamp";
const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;

/**
 * Hook to manage upgrade prompt visibility for guest users.
 * @param {boolean} isGuest - Whether user is in guest mode
 * @param {boolean} hasGuestEvents - Whether user has created events in guest mode
 * @returns {{ shouldShowBanner: boolean, dismissBanner: function }}
 */
export default function useUpgradePrompt(isGuest, hasGuestEvents) {
	const [shouldShowBanner, setShouldShowBanner] = useState(false);

	useEffect(() => {
		// Only show banner if user is in guest mode and has events
		if (!isGuest || !hasGuestEvents) {
			setShouldShowBanner(false);
			return;
		}

		// Check if banner was dismissed for current session
		const dismissedInSession = sessionStorage.getItem(DISMISS_KEY);
		if (dismissedInSession === "true") {
			setShouldShowBanner(false);
			return;
		}

		// Check if banner was dismissed within last 24 hours
		const dismissTimestamp = localStorage.getItem(TIMESTAMP_KEY);
		if (dismissTimestamp) {
			const timeSinceDismiss = Date.now() - parseInt(dismissTimestamp, 10);
			if (timeSinceDismiss < TWENTY_FOUR_HOURS) {
				setShouldShowBanner(false);
				return;
			}
		}

		// Show banner if all conditions met
		setShouldShowBanner(true);
	}, [isGuest, hasGuestEvents]);

	const dismissBanner = () => {
		// Dismiss for current session
		sessionStorage.setItem(DISMISS_KEY, "true");
		// Store timestamp for 24-hour check
		localStorage.setItem(TIMESTAMP_KEY, Date.now().toString());
		setShouldShowBanner(false);
	};

	return {
		shouldShowBanner,
		dismissBanner,
	};
}
