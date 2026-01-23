/**
 * Merge helper utilities for detecting duplicates between guest and authenticated data.
 */

/**
 * Detect duplicate events between guest and authenticated data.
 *
 * Rule 1 (priority): If guest event has canvas_id, find auth event with matching canvas_id
 * Rule 2: If no Canvas ID match, check if title and due_date exactly match
 *
 * @param {Array} guestEvents - Events from guest session
 * @param {Array} authEvents - Events from authenticated account
 * @returns {Array} Array of duplicate pairs with structure { id, guest, auth, rule }
 */
export function detectDuplicateEvents(guestEvents, authEvents) {
  // Handle invalid inputs
  if (!Array.isArray(guestEvents) || !Array.isArray(authEvents)) {
    return [];
  }

  const duplicates = [];
  const matchedAuthIds = new Set();

  for (const guestEvent of guestEvents) {
    if (!guestEvent) continue;

    // Rule 1: Canvas ID match (highest priority)
    if (guestEvent.canvas_id) {
      const authMatch = authEvents.find(
        authEvent =>
          authEvent &&
          authEvent.canvas_id === guestEvent.canvas_id &&
          !matchedAuthIds.has(authEvent.id)
      );

      if (authMatch) {
        duplicates.push({
          id: `${guestEvent.id}-${authMatch.id}`,
          guest: guestEvent,
          auth: authMatch,
          rule: 'canvas_id'
        });
        matchedAuthIds.add(authMatch.id);
        continue; // Skip Rule 2 if Canvas ID matched
      }
    }

    // Rule 2: Title + due_date exact match
    if (guestEvent.title && guestEvent.due_date) {
      const titleMatch = authEvents.find(
        authEvent =>
          authEvent &&
          authEvent.title === guestEvent.title &&
          authEvent.due_date === guestEvent.due_date &&
          !matchedAuthIds.has(authEvent.id)
      );

      if (titleMatch) {
        duplicates.push({
          id: `${guestEvent.id}-${titleMatch.id}`,
          guest: guestEvent,
          auth: titleMatch,
          rule: 'title_date'
        });
        matchedAuthIds.add(titleMatch.id);
      }
    }
  }

  return duplicates;
}

/**
 * Detect duplicate classes between guest and authenticated data.
 *
 * Matches on canvas_course_id (if present) or exact name match.
 *
 * @param {Array} guestClasses - Classes from guest session
 * @param {Array} authClasses - Classes from authenticated account
 * @returns {Array} Array of duplicate pairs with structure { id, guest, auth, rule }
 */
export function detectDuplicateClasses(guestClasses, authClasses) {
  // Handle invalid inputs
  if (!Array.isArray(guestClasses) || !Array.isArray(authClasses)) {
    return [];
  }

  const duplicates = [];
  const matchedAuthIds = new Set();

  for (const guestClass of guestClasses) {
    if (!guestClass) continue;

    // Priority 1: Canvas course ID match
    if (guestClass.canvas_course_id) {
      const authMatch = authClasses.find(
        authClass =>
          authClass &&
          authClass.canvas_course_id === guestClass.canvas_course_id &&
          !matchedAuthIds.has(authClass.id)
      );

      if (authMatch) {
        duplicates.push({
          id: `${guestClass.id}-${authMatch.id}`,
          guest: guestClass,
          auth: authMatch,
          rule: 'canvas_course_id'
        });
        matchedAuthIds.add(authMatch.id);
        continue;
      }
    }

    // Priority 2: Exact name match
    if (guestClass.name) {
      const nameMatch = authClasses.find(
        authClass =>
          authClass &&
          authClass.name === guestClass.name &&
          !matchedAuthIds.has(authClass.id)
      );

      if (nameMatch) {
        duplicates.push({
          id: `${guestClass.id}-${nameMatch.id}`,
          guest: guestClass,
          auth: nameMatch,
          rule: 'name'
        });
        matchedAuthIds.add(nameMatch.id);
      }
    }
  }

  return duplicates;
}

/**
 * Find guest items that have no matching authenticated item (unique to guest).
 *
 * @param {Array} guestItems - All guest items (events or classes)
 * @param {Array} duplicates - Array of duplicate pairs from detectDuplicateEvents/Classes
 * @returns {Array} Guest items that are not in the duplicates array
 */
export function findUniqueGuestItems(guestItems, duplicates) {
  // Handle invalid inputs
  if (!Array.isArray(guestItems)) {
    return [];
  }

  if (!Array.isArray(duplicates)) {
    return guestItems.filter(item => item != null);
  }

  // Create set of guest item IDs that have duplicates
  const duplicateGuestIds = new Set(
    duplicates
      .filter(dup => dup && dup.guest)
      .map(dup => dup.guest.id)
  );

  // Return guest items not in the duplicates set
  return guestItems.filter(
    item => item && !duplicateGuestIds.has(item.id)
  );
}
