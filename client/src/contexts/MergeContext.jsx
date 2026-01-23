import { createContext, useContext, useState, useMemo, useCallback } from 'react';

const MergeContext = createContext(null);

const MERGE_COMPLETED_KEY = 'merge_completed';

/**
 * Get merge completion status from sessionStorage
 * @returns {boolean}
 */
const getMergeCompleted = () => {
  if (typeof window === 'undefined') return false;
  try {
    return sessionStorage.getItem(MERGE_COMPLETED_KEY) === 'true';
  } catch {
    return false;
  }
};

/**
 * Set merge completion status in sessionStorage
 * @param {boolean} completed
 */
const storeMergeCompleted = (completed) => {
  if (typeof window === 'undefined') return;
  try {
    if (completed) {
      sessionStorage.setItem(MERGE_COMPLETED_KEY, 'true');
    } else {
      sessionStorage.removeItem(MERGE_COMPLETED_KEY);
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
  const [mergeCompleted, setMergeCompletedState] = useState(() => getMergeCompleted());

  const setMergeCompleted = useCallback((completed) => {
    setMergeCompletedState(completed);
    storeMergeCompleted(completed);
  }, []);

  const value = useMemo(
    () => ({
      mergeStatus,
      setMergeStatus,
      mergeError,
      setMergeError,
      showMergeModal,
      setShowMergeModal,
      mergeCompleted,
      setMergeCompleted,
    }),
    [mergeStatus, mergeError, showMergeModal, mergeCompleted, setMergeCompleted]
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
