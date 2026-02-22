import * as chrono from "chrono-node";

// Day names — full and abbreviated forms Todoist accepts
const DAY = "(?:mon(?:day)?|tue(?:s(?:day)?)?|wed(?:nesday)?|thu(?:r(?:s(?:day)?)?)?|fri(?:day)?|sat(?:urday)?|sun(?:day)?)";
// Month names
const MONTH = "(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)";
// Ordinal suffixes
const ORD = "(?:st|nd|rd|th)";
// Time expression — requires "at" prefix, am/pm suffix, or colon (bare numbers like " 8" don't match)
// Matches: "at 8am", "9:30pm", "at 8", "at 14:00", "8p", "8 PM", "8:30"
const TIME = `(?:\\s+(?:at\\s+\\d{1,2}(?::\\d{2})?\\s*(?:am?|pm?)?|\\d{1,2}(?::\\d{2})\\s*(?:am?|pm?)?|\\d{1,2}\\s*(?:am?|pm?)))`;
// "starting <date>", "from <date>", "ending <date>", "until <date>", "for N months/weeks"
const BOUNDS = `(?:\\s+(?:(?:starting|from|ending|until|before|after)\\s+\\S+(?:\\s+\\S+){0,3}|for\\s+\\d+\\s+(?:day|week|month|year)s?))`;
// Date anchor preceding "every" — "on feb 25", "on the 1st", "jan 15", "the 3rd"
const DATE_ANCHOR = `(?:(?:on\\s+(?:the\\s+)?)?(?:${MONTH}\\s+)?\\d{1,2}${ORD}?\\s+|(?:on\\s+(?:the\\s+)?)?${MONTH}\\s+\\d{1,2}${ORD}?\\s+)`;

// "every ..." patterns — covers the full Todoist recurring syntax:
//   every day/week/month/quarter/year, every N days/weeks/months/years,
//   every other day/week/month/year/Mon, every morning/afternoon/evening/night,
//   every weekend/workday, every Mon,Wed,Fri, every Nth weekday,
//   every last/first day/workday/Mon, every Jan 15, every 2,15,27,
//   + optional time + optional start/end bounds
// Optional date anchor before "every" — captures "on feb 25 every year",
// "on the 1st every month", "jan 15 every year" as a single recurrence string.
const EVERY_RE = new RegExp(
  `(?:${DATE_ANCHOR})?` +
  `\\bevery\\s+` +
  `(?:` +
    // "every other day/weekday/week/month/year/Mon"
    `other\\s+(?:day|weekday|workday|week|month|year|${DAY})` +
    // "every N days/weeks/months/years/hours/weekdays/workdays"
    `|\\d+\\s+(?:day|weekday|workday|week|month|year|hour)s?` +
    // "every Nth weekday" / "every 2nd monday" / "every 3rd friday jan"
    `|\\d+${ORD}?\\s+${DAY}(?:\\s+${MONTH})?` +
    // "every last/first day/workday/Mon"
    `|(?:last|first)\\s+(?:day|weekday|workday|${DAY})` +
    // "every morning/afternoon/evening/night"
    `|(?:morning|afternoon|evening|night)` +
    // "every weekend/weekday/workday"
    `|(?:weekend|weekday|workday)s?` +
    // "every day/weekday/week/month/quarter/year" — must match before weekday names
    // since "mon" in DAY would greedily match the start of "month".
    // Word boundary ensures partial matches are avoided.
    `|(?:day|weekday|workday|week|month|quarter|year)\\b` +
    // "every Mon, Wed and Fri" / "every tuesday and thursday"
    `|${DAY}(?:(?:\\s*(?:,|and)\\s*${DAY})*)` +
    // "every N hours starting at Xpm"
    `|\\d+\\s+hours?` +
    // "every jan 27th" / "every 2, 15, 27" (specific dates of month)
    `|${MONTH}\\s+\\d{1,2}${ORD}?` +
    `|\\d{1,2}${ORD}?(?:(?:\\s*,\\s*\\d{1,2}${ORD}?)*)` +
  `)` +
  // optional time
  `${TIME}?` +
  // optional start/end bounds (greedy, up to 2)
  `(?:${BOUNDS}){0,2}`,
  "i",
);

// Shorthand keywords Todoist treats as recurrence: "daily", "weekly", etc.
// These standalone words (+ optional time) are recurring.
const SHORTHAND_RE = new RegExp(
  `\\b(daily|weekly|biweekly|monthly|quarterly|yearly|annually)${TIME}?` +
  `(?:${BOUNDS}){0,2}`,
  "i",
);

// Expand abbreviated day/month names to full forms for display
const DAY_EXPAND = {
  mon: "Monday", tue: "Tuesday", tues: "Tuesday", wed: "Wednesday",
  thu: "Thursday", thur: "Thursday", thurs: "Thursday", fri: "Friday", sat: "Saturday", sun: "Sunday",
  monday: "Monday", tuesday: "Tuesday", wednesday: "Wednesday",
  thursday: "Thursday", friday: "Friday", saturday: "Saturday", sunday: "Sunday",
};
const MONTH_EXPAND = {
  jan: "January", feb: "February", mar: "March", apr: "April",
  may: "May", jun: "June", june: "June", jul: "July", july: "July",
  aug: "August", sep: "September", oct: "October", nov: "November", dec: "December",
  january: "January", february: "February", march: "March", april: "April",
  august: "August", september: "September", october: "October",
  november: "November", december: "December",
};
// Normalize any time expression to consistent "h:mm AM/PM" or "h AM/PM" format.
// Handles: "8", "8p", "8pm", "8 PM", "8:30pm", "14", "14:30", etc.
function normalizeTime(h, m, suffix) {
  let hour = parseInt(h, 10);
  const s = (suffix || "").toLowerCase().replace(/^(a|p)m?$/, "$1m");
  if (s === "pm" && hour < 12) hour += 12;
  if (s === "am" && hour === 12) hour = 0;
  const isPM = hour >= 12;
  const h12 = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  const label = isPM ? "PM" : "AM";
  return m ? `${h12}:${m} ${label}` : `${h12} ${label}`;
}

function normalizeRecurrence(raw) {
  // Expand abbreviated day/month names
  let out = raw.replace(/\b[a-z]+/gi, (word) => {
    const lower = word.toLowerCase();
    return DAY_EXPAND[lower] || MONTH_EXPAND[lower] || lower;
  });
  // Normalize all time expressions to consistent "at h AM/PM" or "at h:mm AM/PM"
  // Matches: "at 8am", "8p", "at 8", "at 14:30", "8:30pm", etc.
  out = out.replace(/\b(?:at\s+)?(\d{1,2})(?::(\d{2}))?\s*([ap]m?)?\b/gi, (match, h, m, s) => {
    // Only transform if it looks like a time (has "at", has suffix, or hour > 0)
    const hasAt = /^at\s/i.test(match);
    const hasSuffix = !!s;
    if (!hasAt && !hasSuffix) return match; // bare number like "2" in "every 2 weeks"
    return `at ${normalizeTime(h, m, s)}`;
  });
  return out;
}

/**
 * Parse natural language date/time from an input string.
 * Strips the "!" prefix if present, finds a date expression,
 * and returns the clean title (with date portion removed) plus the parsed date.
 *
 * Also detects recurrence patterns (e.g. "every tuesday and thursday at 8am")
 * and returns them as `recurrence` — the raw string to pass to Todoist's
 * `due_string` for native recurring task support.
 *
 * @param {string} rawInput - The raw input string (may start with "!")
 * @param {Date} anchorDate - The calendar date to use for time-only expressions
 *   (e.g. "at 3pm" anchors to this date). Relative date expressions like
 *   "tomorrow" are always relative to today.
 */
export function parseNLPInput(rawInput, anchorDate = new Date()) {
  const text = rawInput.startsWith("!") ? rawInput.slice(1).trim() : rawInput;
  if (!text) return { title: "", date: null, dateText: "", hasTime: false, recurrence: null };

  // Check for recurrence patterns — "every X" and shorthand keywords
  const recurrenceMatch = text.match(EVERY_RE) || text.match(SHORTHAND_RE);
  if (recurrenceMatch) {
    let recurrenceText = recurrenceMatch[0];
    let before = text.slice(0, recurrenceMatch.index).trim();
    const after = text.slice(recurrenceMatch.index + recurrenceText.length).trim();

    // Absorb leading time into the recurrence if it doesn't already have one:
    // "Check-in at 8a every tue" → before="Check-in", recurrenceText="at 8a every tue"
    const recurrenceHasTime = /\bat\s+\d{1,2}/i.test(recurrenceText)
      || /\d{1,2}(?::\d{2})?\s*[ap]m?/i.test(recurrenceText)
      || /\b(?:morning|afternoon|evening|night)\b/i.test(recurrenceText);
    if (!recurrenceHasTime) {
      const leadingTime = before.match(/\s+(?:at\s+)?\d{1,2}(?::\d{2})?\s*(?:am?|pm?)?\s*$/i);
      if (leadingTime) {
        recurrenceText = before.slice(leadingTime.index).trim() + " " + recurrenceText;
        before = before.slice(0, leadingTime.index).trim();
      }
    }

    const title = [before, after].filter(Boolean).join(" ");

    // Extract time from the recurrence if present (e.g. "at 8am", "at 8", "8p")
    const hasTime = /\bat\s+\d{1,2}/i.test(recurrenceText)
      || /\d{1,2}(?::\d{2})?\s*[ap]m?/i.test(recurrenceText)
      || /\b(?:morning|afternoon|evening|night)\b/i.test(recurrenceText);

    // Fix shorthand times Todoist can't parse: 8a→8am, 8p→8pm
    const recurrence = recurrenceText.replace(/\b(\d{1,2}(?::\d{2})?)\s*([ap])\b/gi, "$1$2m");

    return {
      title: title || text,
      date: null,
      dateText: normalizeRecurrence(recurrenceText),
      hasTime,
      recurrence,
    };
  }

  // Expand shorthand "8a"→"8am", "8p"→"8pm" so chrono can parse them
  const chronoText = text.replace(/\b(\d{1,2}(?::\d{2})?)\s*([ap])\b/gi, "$1$2m");

  // Always parse relative to today so "tomorrow" means actual tomorrow
  const results = chrono.parse(chronoText, new Date());
  if (results.length === 0) {
    return { title: text, date: null, dateText: "", hasTime: false, recurrence: null };
  }

  const result = results[0];
  const before = chronoText.slice(0, result.index).trim();
  const after = chronoText.slice(result.index + result.text.length).trim();
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
    recurrence: null,
  };
}
