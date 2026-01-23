import { createContext, useContext, useState, useMemo, useCallback } from 'react';

const MergeContext = createContext(null);

const MERGED_SESSION_ID_KEY = 'merged_session_id';

/**
 * Get merged guest session ID from sessionStorage
 * @returns {string|null} The guest session ID that was merged, or null if none
 */
const getMergedSessionId = () => {
  if (typeof window === 'undefined') return null;
  try {
    return sessionStorage.getItem(MERGED_SESSION_ID_KEY);
  } catch {
    return null;
  }
};

/**
 * Set merged guest session ID in sessionStorage
 * @param {string|null} sessionId - The guest session ID that was merged, or null to clear
 */
const storeMergedSessionId = (sessionId) => {
  if (typeof window === 'undefined') return;
  try {
    if (sessionId) {
      sessionStorage.setItem(MERGED_SESSION_ID_KEY, sessionId);
    } else {
      sessionStorage.removeItem(MERGED_SESSION_ID_KEY);
    }
  } catch {
    // Silently ignore storage errors
  }
};

/**
 * Provider for merge state management.
 * Tracks merge status, errors, and modal visibility across components.
 */
export function MergeProvider({ children }) {
  const [mergeStatus, setMergeStatus] = useState(null); // null | 'pending' | 'success' | 'error'
  const [mergeError, setMergeError] = useState(null); // string | null
  const [showMergeModal, setShowMergeModal] = useState(false); // boolean
  const [mergedSessionId, setMergedSessionIdState] = useState(() => getMergedSessionId());

  const setMergedSessionId = useCallback((sessionId) => {
    setMergedSessionIdState(sessionId);
    storeMergedSessionId(sessionId);
  }, []);

  // Helper to check if a specific session was already merged
  const isMergeCompleted = useCallback((currentSessionId) => {
    return mergedSessionId === currentSessionId;
  }, [mergedSessionId]);

  const value = useMemo(
    () => ({
      mergeStatus,
      setMergeStatus,
      mergeError,
      setMergeError,
      showMergeModal,
      setShowMergeModal,
      mergedSessionId,
      setMergedSessionId,
      isMergeCompleted,
    }),
    [mergeStatus, mergeError, showMergeModal, mergedSessionId, setMergedSessionId, isMergeCompleted]
  );

  return <MergeContext.Provider value={value}>{children}</MergeContext.Provider>;
}

/**
 * Hook to access merge context.
 * Must be used within MergeProvider.
 */
export function useMerge() {
  const context = useContext(MergeContext);
  if (!context) {
    throw new Error('useMerge must be used within a MergeProvider');
  }
  return context;
}
