import {
  IconCertificate,
  IconClipboard,
  IconFlask,
  IconHome,
  IconQuestionMark,
} from "@tabler/icons-react";

export const EVENT_TYPE_ICONS = {
  assignment: IconClipboard,
  quiz: IconQuestionMark,
  exam: IconCertificate,
  homework: IconHome,
  lab: IconFlask,
};

export const EVENT_TYPES = [
  { value: "assignment", label: "Assignment" },
  { value: "quiz", label: "Quiz" },
  { value: "exam", label: "Exam" },
  { value: "homework", label: "Homework" },
  { value: "lab", label: "Lab" },
];

export const STATUS_COLORS = {
  incomplete: "#78716C",   // pencil - muted neutral
  in_progress: "#8B6BC0", // violet blend for both themes
  complete: "#4A9968",    // earthy green blend for both themes
};

export const STATUS_OPTIONS = [
  { value: "incomplete", label: "Incomplete" },
  { value: "in_progress", label: "In Progress" },
  { value: "complete", label: "Complete" },
];

export const PREVIEW_SIZE = { width: 280, height: 140, contentWidth: 640 };
