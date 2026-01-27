import { useEffect, useState, useCallback } from "react";
import { useSession } from "@clerk/clerk-react";
import { useGuestSession } from "../contexts/GuestSessionContext";
import { useMerge } from "../contexts/MergeContext";
import useMergeDetection from "./useMergeDetection";
import {
  getGuestEvents,
  getGuestClasses,
  getGuestSettings,
  clearGuestData,
} from "../guest/guestStorage";

export default function useMergeFlow(getToken, isSignedIn) {
  const { hasGuestSession, guestSessionId, clearGuestSession } =
    useGuestSession();
  const { session } = useSession();
  const {
    showMergeModal,
    setShowMergeModal,
    mergedSessionId,
    isMergeCompleted,
    setMergedSessionId,
  } = useMerge();

  const [mergeData, setMergeData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Clear merged session ID on sign-out to allow re-merge on next sign-in
  useEffect(() => {
    if (!isSignedIn) {
      setMergedSessionId(null);
    }
  }, [isSignedIn, setMergedSessionId]);

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

    // Skip if guest data is empty - this handles:
    // 1. Fresh guests with no data
    // 2. Guests who clicked "Continue as Guest" from expiration modal (data cleared)
    // 3. Guests whose merge already completed (data cleared by handleMergeConfirm)
    if (guestEvents.length === 0 && guestClasses.length === 0) {
      return;
    }

    // Create api function for fetching auth data
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

  const handleMergeClose = () => {
    setShowMergeModal(false);
  };

  const confirmMerge = useCallback(
    async (resolutions) => {
      if (!guestSessionId) {
        setError("Guest session ID is required for merge");
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const token = await getToken();
        const payload = {
          guestSessionId,
          guestClasses: mergeData?.guestClasses || [],
          guestEvents: mergeData?.guestEvents || [],
          guestSettings: mergeData?.guestSettings || {},
          resolutions: resolutions || {},
        };

        const response = await fetch("/api/merge", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            errorData.error || `Merge failed with status ${response.status}`
          );
        }

        // Successful merge - clear guest data
        clearGuestData();
        setMergedSessionId(guestSessionId);
        clearGuestSession();
        setShowMergeModal(false);
        setMergeData(null);
        setIsLoading(false);

        // Reload page to show merged data immediately
        window.location.reload();
      } catch (err) {
        const userMessage =
          err.message === "Failed to fetch"
            ? "Network error - please check your connection and try again"
            : err.message || "An unexpected error occurred during merge";

        setError(userMessage);
        setIsLoading(false);
      }
    },
    [
      guestSessionId,
      getToken,
      mergeData,
      clearGuestSession,
      setMergedSessionId,
      setShowMergeModal,
    ]
  );

  // Return null if no merge data, otherwise return all modal props
  const mergeModalProps = mergeData
    ? {
        opened: showMergeModal,
        onClose: handleMergeClose,
        duplicateEvents,
        duplicateClasses,
        uniqueGuestEvents,
        uniqueGuestClasses,
        guestClasses: mergeData.guestClasses,
        guestSettings: mergeData.guestSettings,
        authClasses: mergeData.authClasses,
        confirmMerge,
        isLoading,
        error,
      }
    : null;

  return { mergeModalProps };
}
