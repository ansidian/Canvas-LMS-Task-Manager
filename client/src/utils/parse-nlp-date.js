import * as chrono from "chrono-node";

/**
 * Parse natural language date/time from an input string.
 * Strips the "!" prefix if present, finds a date expression,
 * and returns the clean title (with date portion removed) plus the parsed date.
 *
 * @param {string} rawInput - The raw input string (may start with "!")
 * @param {Date} anchorDate - The calendar date to use for time-only expressions
 *   (e.g. "at 3pm" anchors to this date). Relative date expressions like
 *   "tomorrow" are always relative to today.
 */
export function parseNLPInput(rawInput, anchorDate = new Date()) {
  const text = rawInput.startsWith("!") ? rawInput.slice(1).trim() : rawInput;
  if (!text) return { title: "", date: null, dateText: "", hasTime: false };

  // Always parse relative to today so "tomorrow" means actual tomorrow
  const results = chrono.parse(text, new Date());
  if (results.length === 0) {
    return { title: text, date: null, dateText: "", hasTime: false };
  }

  const result = results[0];
  const before = text.slice(0, result.index).trim();
  const after = text.slice(result.index + result.text.length).trim();
  const title = [before, after].filter(Boolean).join(" ");

  const hasTime = result.start.isCertain("hour");
  const hasExplicitDate =
    result.start.isCertain("day") || result.start.isCertain("month");

  let date = result.start.date();

  // Time-only expression (e.g. "at 3pm") — anchor to the calendar date
  if (hasTime && !hasExplicitDate && anchorDate) {
    date = new Date(anchorDate);
    date.setHours(
      result.start.get("hour"),
      result.start.get("minute") || 0,
      0,
      0,
    );
  }

  return {
    title: title || text,
    date,
    dateText: result.text,
    hasTime,
  };
}
