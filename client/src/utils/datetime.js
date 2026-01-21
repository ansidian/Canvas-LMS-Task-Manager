import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

/**
 * Parse a due_date value from the database.
 * Handles both date-only strings (YYYY-MM-DD) and full ISO 8601 timestamps.
 *
 * @param {string} dueDateString - The due_date from database (could be "YYYY-MM-DD" or ISO 8601)
 * @returns {Object} { date: Date object, hasTime: boolean }
 */
export function parseDueDate(dueDateString) {
  if (!dueDateString) {
    return { date: null, hasTime: false };
  }

  // Check if the string contains time information
  const hasTime = dueDateString.includes('T') || dueDateString.includes(':');

  if (hasTime) {
    // Parse as UTC timestamp and convert to local time
    const date = dayjs.utc(dueDateString).local().toDate();
    return { date, hasTime: true };
  } else {
    // Date-only string - parse at midnight local time to prevent timezone shifts
    const date = new Date(dueDateString + 'T00:00:00');
    return { date, hasTime: false };
  }
}

/**
 * Format a due date for display in the UI.
 *
 * @param {string} dueDateString - The due_date from database
 * @param {Object} options - Formatting options
 * @param {boolean} options.includeTime - Whether to include time if available
 * @param {string} options.dateFormat - dayjs format string for date
 * @param {string} options.timeFormat - dayjs format string for time
 * @returns {string} Formatted date/time string
 */
export function formatDueDate(dueDateString, options = {}) {
  const {
    includeTime = true,
    dateFormat = 'MMM D, YYYY',
    timeFormat = 'h:mm A',
  } = options;

  const { date, hasTime } = parseDueDate(dueDateString);

  if (!date) return '';

  const dayjsDate = dayjs(date);

  if (hasTime && includeTime) {
    return `${dayjsDate.format(dateFormat)} at ${dayjsDate.format(timeFormat)}`;
  }

  return dayjsDate.format(dateFormat);
}

/**
 * Convert a date (with optional time) to UTC ISO 8601 string for storage.
 * Always preserves the full datetime to avoid timezone-related bugs.
 *
 * @param {Date} date - The date object (may include time)
 * @param {string|null} time - Optional time string in "HH:mm" format (legacy support)
 * @returns {string} ISO 8601 UTC string (e.g., "2025-12-11T22:00:00Z")
 */
export function toUTCString(date, time = null) {
  if (!date) return null;

  let dayjsDate = dayjs(date);

  // Legacy support: if time string is provided separately
  if (time) {
    const [hours, minutes] = time.split(':').map(Number);
    dayjsDate = dayjsDate.hour(hours).minute(minutes).second(0).millisecond(0);
  }

  // Always convert to UTC and return full ISO 8601 timestamp
  // This prevents timezone-related date shifting bugs
  return dayjsDate.utc().format();
}

/**
 * Extract time string from a datetime value for time picker input.
 *
 * @param {string} dueDateString - The due_date from database
 * @returns {string|null} Time in "HH:mm" format or null if no time
 */
export function extractTime(dueDateString) {
  const { date, hasTime } = parseDueDate(dueDateString);

  if (!hasTime || !date) return null;

  return dayjs(date).format('HH:mm');
}

/**
 * Check if a due_date string has time information.
 *
 * @param {string} dueDateString - The due_date from database
 * @returns {boolean} True if time is included
 */
export function hasTimeComponent(dueDateString) {
  if (!dueDateString) return false;
  return dueDateString.includes('T') || dueDateString.includes(':');
}

/**
 * Coerce a value into a local Date object.
 *
 * @param {Date|string|null} value
 * @returns {Date|null}
 */
export function toLocalDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  const parsed = dayjs(value);
  if (!parsed.isValid()) return null;
  return parsed.toDate();
}

/**
 * Combine a date string and time string into a local Date.
 *
 * @param {string} dateString - "YYYY-MM-DD"
 * @param {string} timeString - "HH:mm"
 * @returns {Date|null}
 */
export function combineLocalDateAndTime(dateString, timeString) {
  if (!dateString || !timeString) return null;
  const [hours, minutes] = timeString.split(':').map(Number);
  return dayjs(dateString)
    .hour(hours || 0)
    .minute(minutes || 0)
    .second(0)
    .millisecond(0)
    .toDate();
}
