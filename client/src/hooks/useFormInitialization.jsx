import { useEffect, useRef } from "react";
import { parseDueDate } from "../utils/datetime";

/**
 * Detects event type from assignment title using pattern matching.
 * Returns the detected type or null if no match found.
 */
function detectEventTypeFromTitle(title) {
  if (!title) return null;
  const normalized = title.toLowerCase();
  const rules = [
    { type: "quiz", patterns: [/\bquiz\b/, /\bqz\b/] },
    {
      type: "exam",
      patterns: [
        /\bexam\b/,
        /\bmidterm\b/,
        /\bfinal\b/,
        /\bcheckpoint\b/,
        /\btest\b/,
      ],
    },
    {
      type: "homework",
      patterns: [/\bhomework\b/, /\bhw\b/, /\bpset\b/, /problem set/],
    },
    { type: "lab", patterns: [/\blab\b/] },
    { type: "assignment", patterns: [/\bassignment\b/, /\bassign\b/] },
  ];

  for (const rule of rules) {
    if (rule.patterns.some((pattern) => pattern.test(normalized))) {
      return rule.type;
    }
  }

  return null;
}

/**
 * Hook that handles form initialization when an item changes.
 *
 * Responsibilities:
 * - Detects event type from title
 * - Matches course to class
 * - Initializes form data
 * - Triggers pulse animation for auto-detected event types
 * - Resets UI state (exit direction, description overlay)
 */
export default function useFormInitialization({
  item,
  classes,
  initializeFormData,
  setEventTypePulse,
  setExitDirection,
  setShowDescriptionFullscreen,
}) {
  const eventTypePulseTimeoutRef = useRef(null);

  useEffect(() => {
    // Clear any pending pulse timeout
    if (eventTypePulseTimeoutRef.current) {
      clearTimeout(eventTypePulseTimeoutRef.current);
      eventTypePulseTimeoutRef.current = null;
    }
    setEventTypePulse(false);

    if (!item) return;

    // Find matching class by course name
    const matchingClass = classes.find(
      (c) => c.name.toLowerCase() === item.course_name?.toLowerCase(),
    );

    // Auto-detect event type from title
    const detectedType = detectEventTypeFromTitle(item.title);
    const { date } = parseDueDate(item.due_date);

    // Initialize form with detected/default values
    initializeFormData({
      dueDate: date,
      classId: matchingClass ? String(matchingClass.id) : null,
      eventType: detectedType || "assignment",
      notes: "",
      url: item.url || "",
      canvas_due_date_override: 0,
    });

    // Reset UI state
    setExitDirection(null);
    setShowDescriptionFullscreen(false);

    // Pulse animation for auto-detected event types
    if (detectedType) {
      const rafId = requestAnimationFrame(() => {
        setEventTypePulse(true);
      });
      eventTypePulseTimeoutRef.current = setTimeout(() => {
        setEventTypePulse(false);
      }, 1200);

      return () => {
        cancelAnimationFrame(rafId);
        if (eventTypePulseTimeoutRef.current) {
          clearTimeout(eventTypePulseTimeoutRef.current);
          eventTypePulseTimeoutRef.current = null;
        }
      };
    }
  }, [
    item,
    classes,
    initializeFormData,
    setEventTypePulse,
    setExitDirection,
    setShowDescriptionFullscreen,
  ]);
}
