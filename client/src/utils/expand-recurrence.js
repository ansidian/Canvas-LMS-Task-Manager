import dayjs from "dayjs";

const DOW_MAP = {
  sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6,
  sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6,
};

// Known time-of-day keywords
const TOD_MAP = { morning: "09:00", afternoon: "12:00", evening: "19:00", night: "21:00" };

// Extract time from recurrence string: "at 8am" → "08:00", "at 14:30" → "14:30", "morning" → "09:00"
function extractTime(recurrence) {
  // "at 8am", "at 8:30pm", "8pm", "at 14:00"
  const m = recurrence.match(/\b(?:at\s+)?(\d{1,2})(?::(\d{2}))?\s*([ap]m?)?\b/i);
  if (m) {
    const hasAt = /\bat\s/i.test(recurrence.slice(Math.max(0, recurrence.indexOf(m[0]) - 3), recurrence.indexOf(m[0]) + m[0].length));
    const hasSuffix = !!m[3];
    if (hasAt || hasSuffix || m[2]) {
      let hour = parseInt(m[1], 10);
      const suffix = (m[3] || "").toLowerCase().replace(/^([ap])m?$/, "$1m");
      if (suffix === "pm" && hour < 12) hour += 12;
      if (suffix === "am" && hour === 12) hour = 0;
      const min = m[2] || "00";
      return `${String(hour).padStart(2, "0")}:${min}`;
    }
  }
  // "morning", "afternoon", "evening", "night"
  const tod = recurrence.match(/\b(morning|afternoon|evening|night)\b/i);
  if (tod) return TOD_MAP[tod[1].toLowerCase()];
  return null;
}

// Extract day-of-week numbers from a recurrence string
function extractDays(recurrence) {
  const days = [];
  const re = /\b(sun|mon|tue|wed|thu|fri|sat)\w*/gi;
  let m;
  while ((m = re.exec(recurrence))) {
    const dow = DOW_MAP[m[1].toLowerCase()];
    if (dow !== undefined && !days.includes(dow)) days.push(dow);
  }
  return days;
}

// Append time to a YYYY-MM-DD string if time is present
function withTime(dateStr, time) {
  return time ? `${dateStr}T${time}:00` : dateStr;
}

// Generate all dates in [rangeStart, rangeEnd] matching a DOW set
function datesByDow(dows, rangeStart, rangeEnd, time) {
  const dates = [];
  let d = rangeStart;
  while (d.isBefore(rangeEnd) || d.isSame(rangeEnd, "day")) {
    if (dows.includes(d.day())) dates.push(withTime(d.format("YYYY-MM-DD"), time));
    d = d.add(1, "day");
  }
  return dates;
}

// Generate every date in [rangeStart, rangeEnd]
function allDates(rangeStart, rangeEnd, time) {
  const dates = [];
  let d = rangeStart;
  while (d.isBefore(rangeEnd) || d.isSame(rangeEnd, "day")) {
    dates.push(withTime(d.format("YYYY-MM-DD"), time));
    d = d.add(1, "day");
  }
  return dates;
}

// Generate dates stepping by N days from rangeStart
function stepDates(n, rangeStart, rangeEnd, time) {
  const dates = [];
  let d = rangeStart;
  while (d.isBefore(rangeEnd) || d.isSame(rangeEnd, "day")) {
    dates.push(withTime(d.format("YYYY-MM-DD"), time));
    d = d.add(n, "day");
  }
  return dates;
}

// Generate same day-of-month in each month that overlaps the range
function monthlyDates(dom, rangeStart, rangeEnd, time) {
  const dates = [];
  let month = rangeStart.startOf("month");
  const end = rangeEnd.endOf("month");
  while (month.isBefore(end) || month.isSame(end, "month")) {
    const d = month.date(Math.min(dom, month.daysInMonth()));
    if ((d.isAfter(rangeStart) || d.isSame(rangeStart, "day")) &&
        (d.isBefore(rangeEnd) || d.isSame(rangeEnd, "day"))) {
      dates.push(withTime(d.format("YYYY-MM-DD"), time));
    }
    month = month.add(1, "month");
  }
  return dates;
}

/**
 * Expand a recurrence string into concrete date(time)s within a range.
 * Covers common patterns; exotic ones return [].
 *
 * @param {string} recurrence - e.g. "every tue and thu at 8am", "daily", "every 2 weeks"
 * @param {string} start - "YYYY-MM-DD"
 * @param {string} end   - "YYYY-MM-DD"
 * @returns {string[]} array of "YYYY-MM-DD" or "YYYY-MM-DDTHH:mm:ss" strings
 */
export function expandRecurrence(recurrence, start, end) {
  const s = recurrence.toLowerCase();
  const rangeStart = dayjs(start);
  const rangeEnd = dayjs(end);
  const time = extractTime(recurrence);

  // "daily" or "every day"
  if (/\b(daily|every\s+day)\b/.test(s)) {
    return allDates(rangeStart, rangeEnd, time);
  }

  // "every morning/afternoon/evening/night" — daily
  if (/\bevery\s+(?:morning|afternoon|evening|night)\b/.test(s)) {
    return allDates(rangeStart, rangeEnd, time);
  }

  // "every weekday" / "every workday"
  if (/\b(?:every\s+)?(?:weekday|workday)s?\b/.test(s)) {
    return datesByDow([1, 2, 3, 4, 5], rangeStart, rangeEnd, time);
  }

  // "every weekend"
  if (/\bevery\s+weekends?\b/.test(s)) {
    return datesByDow([0, 6], rangeStart, rangeEnd, time);
  }

  // "every other day" — every 2 days
  if (/\bevery\s+other\s+day\b/.test(s)) {
    return stepDates(2, rangeStart, rangeEnd, time);
  }

  // "every N days"
  const nDays = s.match(/\bevery\s+(\d+)\s+days?\b/);
  if (nDays) {
    return stepDates(parseInt(nDays[1], 10), rangeStart, rangeEnd, time);
  }

  // "biweekly" / "every 2 weeks" / "every other week"
  if (/\b(biweekly|every\s+other\s+week|every\s+2\s+weeks?)\b/.test(s)) {
    return stepDates(14, rangeStart, rangeEnd, time);
  }

  // "weekly" / "every week"
  if (/\b(weekly|every\s+week)\b/.test(s)) {
    return stepDates(7, rangeStart, rangeEnd, time);
  }

  // "every N weeks"
  const nWeeks = s.match(/\bevery\s+(\d+)\s+weeks?\b/);
  if (nWeeks) {
    return stepDates(parseInt(nWeeks[1], 10) * 7, rangeStart, rangeEnd, time);
  }

  // Specific day(s) of week: "every tue and thu", "every mon,wed,fri"
  const days = extractDays(s);
  if (days.length > 0) {
    return datesByDow(days, rangeStart, rangeEnd, time);
  }

  // "every 15th" / "every 1st" — monthly on specific date
  const monthlyDate = s.match(/\bevery\s+(\d{1,2})(?:st|nd|rd|th)?\b/);
  if (monthlyDate) {
    return monthlyDates(parseInt(monthlyDate[1], 10), rangeStart, rangeEnd, time);
  }

  // "monthly" / "every month" — use 1st of month as default
  if (/\b(monthly|every\s+month)\b/.test(s)) {
    return monthlyDates(1, rangeStart, rangeEnd, time);
  }

  // Unrecognized pattern — no ghosts
  return [];
}
