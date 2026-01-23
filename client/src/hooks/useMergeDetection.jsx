import { useMemo } from 'react';
import {
  detectDuplicateEvents,
  detectDuplicateClasses,
  findUniqueGuestItems,
} from '../utils/mergeHelpers';

/**
 * Hook for detecting duplicates and unique items between guest and authenticated data.
 *
 * Compares guest and authenticated events/classes to identify:
 * - Duplicate events (canvas_id match or title+date match)
 * - Duplicate classes (canvas_course_id match or name match)
 * - Unique guest events (not present in authenticated data)
 * - Unique guest classes (not present in authenticated data)
 *
 * @param {Array} guestEvents - Events from guest session
 * @param {Array} guestClasses - Classes from guest session
 * @param {Array} authEvents - Events from authenticated account
 * @param {Array} authClasses - Classes from authenticated account
 * @returns {Object} Merge detection results
 */
export default function useMergeDetection(
  guestEvents,
  guestClasses,
  authEvents,
  authClasses
) {
  // Detect duplicate events
  const duplicateEvents = useMemo(() => {
    // Handle loading states where arrays might be null/undefined
    if (!guestEvents || !authEvents) {
      return [];
    }
    return detectDuplicateEvents(guestEvents, authEvents);
  }, [guestEvents, authEvents]);

  // Detect duplicate classes
  const duplicateClasses = useMemo(() => {
    // Handle loading states where arrays might be null/undefined
    if (!guestClasses || !authClasses) {
      return [];
    }
    return detectDuplicateClasses(guestClasses, authClasses);
  }, [guestClasses, authClasses]);

  // Find unique guest events (not duplicated in auth data)
  const uniqueGuestEvents = useMemo(() => {
    if (!guestEvents) {
      return [];
    }
    return findUniqueGuestItems(guestEvents, duplicateEvents);
  }, [guestEvents, duplicateEvents]);

  // Find unique guest classes (not duplicated in auth data)
  const uniqueGuestClasses = useMemo(() => {
    if (!guestClasses) {
      return [];
    }
    return findUniqueGuestItems(guestClasses, duplicateClasses);
  }, [guestClasses, duplicateClasses]);

  // Compute whether any duplicates were found
  const hasDuplicates = useMemo(() => {
    return duplicateEvents.length > 0 || duplicateClasses.length > 0;
  }, [duplicateEvents.length, duplicateClasses.length]);

  return {
    duplicateEvents,
    duplicateClasses,
    uniqueGuestEvents,
    uniqueGuestClasses,
    hasDuplicates,
  };
}
