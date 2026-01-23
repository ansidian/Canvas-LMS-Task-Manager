import { useState, useCallback } from 'react';
import { useMerge } from '../contexts/MergeContext';
import { clearGuestData } from '../guest/guestStorage';

/**
 * Hook for orchestrating merge flow between guest and authenticated accounts.
 *
 * Handles:
 * - POST request to /api/merge with guest data and resolutions
 * - Merge status tracking via MergeContext
 * - Guest data cleanup after successful merge
 * - Error handling with user-friendly messages
 *
 * @param {Object} api - API client instance
 * @param {string} guestSessionId - Guest session identifier
 * @returns {Object} { confirmMerge, isLoading, error }
 */
export default function useMergeFlow(api, guestSessionId) {
  const { setMergeStatus, setMergeError, setMergeCompleted } = useMerge();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const confirmMerge = useCallback(
    async (resolutions, guestData) => {
      if (!guestSessionId) {
        const errorMsg = 'Guest session ID is required for merge';
        setError(errorMsg);
        setMergeError(errorMsg);
        setMergeStatus('error');
        return;
      }

      setIsLoading(true);
      setError(null);
      setMergeStatus('pending');
      setMergeError(null);

      try {
        const payload = {
          guestSessionId,
          guestClasses: guestData.classes || [],
          guestEvents: guestData.events || [],
          guestSettings: guestData.settings || {},
          resolutions: resolutions || {},
        };

        const response = await api.post('/api/merge', payload);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const errorMsg =
            errorData.error || `Merge failed with status ${response.status}`;
          throw new Error(errorMsg);
        }

        // Successful merge - clear guest data from localStorage
        clearGuestData();

        // Mark merge as completed in context (persists to sessionStorage)
        setMergeCompleted(true);
        setMergeStatus('success');
        setIsLoading(false);

        return response.json();
      } catch (err) {
        const userMessage =
          err.message === 'Failed to fetch'
            ? 'Network error - please check your connection and try again'
            : err.message || 'An unexpected error occurred during merge';

        setError(userMessage);
        setMergeError(userMessage);
        setMergeStatus('error');
        setIsLoading(false);

        throw err;
      }
    },
    [api, guestSessionId, setMergeStatus, setMergeError, setMergeCompleted]
  );

  return {
    confirmMerge,
    isLoading,
    error,
  };
}
