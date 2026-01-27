import { Paper, Text, Group, Stack, Box } from "@mantine/core";
import { useDraggable } from "@dnd-kit/core";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { useRef } from "react";
import {
  IconFileText,
  IconClipboardCheck,
  IconWriting,
  IconFlask,
  IconSchool,
  IconClock,
} from "@tabler/icons-react";
import { hasTimeComponent, extractTime } from "../utils/datetime";

const EVENT_ICONS = {
  assignment: IconFileText,
  quiz: IconClipboardCheck,
  homework: IconWriting,
  lab: IconFlask,
  exam: IconSchool,
};

const STATUS_COLORS = {
  incomplete: "#78716C", // pencil - muted neutral
  in_progress: "#8B6BC0", // violet blend for both themes
  complete: "#4A9968", // earthy green blend for both themes
};

// Desaturate a hex color by a given amount (0-1)
function desaturateColor(hex, amount = 0.6) {
  // Convert hex to RGB
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);

  // Convert to HSL
  const max = Math.max(r, g, b) / 255;
  const min = Math.min(r, g, b) / 255;
  const l = (max + min) / 2;

  let h = 0,
    s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    const rNorm = r / 255,
      gNorm = g / 255,
      bNorm = b / 255;
    if (max === rNorm) h = ((gNorm - bNorm) / d + (gNorm < bNorm ? 6 : 0)) / 6;
    else if (max === gNorm) h = ((bNorm - rNorm) / d + 2) / 6;
    else h = ((rNorm - gNorm) / d + 4) / 6;
  }

  // Reduce saturation
  const newS = s * (1 - amount);

  // Convert back to RGB
  const hue2rgb = (p, q, t) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };

  const q = l < 0.5 ? l * (1 + newS) : l + newS - l * newS;
  const p = 2 * l - q;
  const newR = Math.round(hue2rgb(p, q, h + 1 / 3) * 255);
  const newG = Math.round(hue2rgb(p, q, h) * 255);
  const newB = Math.round(hue2rgb(p, q, h - 1 / 3) * 255);

  return `#${newR.toString(16).padStart(2, "0")}${newG.toString(16).padStart(2, "0")}${newB.toString(16).padStart(2, "0")}`;
}

// Helper to format time from 24h to 12h format
function formatTime(time24) {
  const [hours, minutes] = time24.split(":").map(Number);
  const period = hours >= 12 ? "PM" : "AM";
  const hours12 = hours % 12 || 12;
  return `${hours12}:${minutes.toString().padStart(2, "0")} ${period}`;
}

export default function EventCard({ event, color, onClick, isDragging }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    isDragging: isBeingDragged,
  } = useDraggable({
    id: event.id,
  });

  const cardRef = useRef(null);

  // Magnetic cursor effect with 3D tilt
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const rotateX = useSpring(useTransform(mouseY, [-50, 50], [5, -5]), {
    stiffness: 400,
    damping: 25,
  });
  const rotateY = useSpring(useTransform(mouseX, [-50, 50], [-5, 5]), {
    stiffness: 400,
    damping: 25,
  });
  const translateX = useSpring(useTransform(mouseX, [-50, 50], [-8, 8]), {
    stiffness: 400,
    damping: 25,
  });
  const translateY = useSpring(useTransform(mouseY, [-50, 50], [-8, 8]), {
    stiffness: 400,
    damping: 25,
  });

  const handleMouseMove = (e) => {
    if (!cardRef.current || isDragging || isBeingDragged) return;
    const rect = cardRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    mouseX.set(e.clientX - centerX);
    mouseY.set(e.clientY - centerY);
  };

  const handleMouseLeave = () => {
    if (!isDragging && !isBeingDragged) {
      mouseX.set(0);
      mouseY.set(0);
    }
  };

  const Icon = EVENT_ICONS[event.event_type] || IconFileText;
  const statusColor = STATUS_COLORS[event.status] || STATUS_COLORS.incomplete;
  const isComplete = event.status === "complete";

  // Check if event has time information
  const showTime = hasTimeComponent(event.due_date);
  const timeString = showTime ? extractTime(event.due_date) : null;

  // Format time as 12-hour format
  const formattedTime = timeString ? formatTime(timeString) : null;

  // Compute styles based on completion status
  // Completed: nearly grayscale, faded, clearly "done"
  const cardBackground = isComplete ? desaturateColor(color, 0.9) : color;
  const cardOpacity = isComplete ? 0.5 : 1;
  const textColor = isComplete ? "rgba(255,255,255,0.85)" : "white";

  // Convert status color to rgba for glow effect
  const hexToRgba = (hex, alpha) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };
  const glowColor = hexToRgba(statusColor, 0.5);

  // Status indicator dot - only for incomplete and in_progress
  const showStatusDot = !isComplete;

  // When being dragged, hide the original (DragOverlay shows the preview)
  if (isBeingDragged) {
    return (
      <Paper
        p={4}
        radius="sm"
        style={{
          background: cardBackground,
          opacity: 0.3,
          position: "relative",
        }}
      >
        <Stack gap={2}>
          <Group gap={4} wrap="nowrap">
            <Icon size={12} color={textColor} />
            <Text size="xs" c={textColor} truncate fw={500}>
              {event.title}
            </Text>
          </Group>
          {showTime && (
            <Group gap={4} wrap="nowrap" ml={16}>
              <IconClock size={10} color={textColor} opacity={0.8} />
              <Text size="10px" c={textColor} opacity={0.8}>
                {formattedTime}
              </Text>
            </Group>
          )}
        </Stack>
      </Paper>
    );
  }

  return (
    <motion.div
      ref={cardRef}
      style={{
        rotateX,
        rotateY,
        x: translateX,
        y: translateY,
        transformStyle: "preserve-3d",
        perspective: 1000,
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <Paper
        ref={setNodeRef}
        {...listeners}
        {...attributes}
        p={4}
        radius="sm"
        style={{
          background: cardBackground,
          cursor: isDragging ? "grabbing" : "grab",
          opacity: cardOpacity,
          boxShadow: isDragging
            ? "0 4px 12px rgba(0,0,0,0.25)"
            : showStatusDot
              ? `0 0 10px 2px ${glowColor}`
              : undefined,
          transform: isDragging ? "scale(1.02)" : undefined,
          touchAction: "none",
          transition:
            "box-shadow 0.15s ease, background 0.2s ease, opacity 0.2s ease",
          position: "relative",
        }}
        onClick={(e) => {
          e.stopPropagation();
          if (onClick) onClick();
        }}
      >
        {/* Status indicator corner triangle */}
        {showStatusDot && (
          <Box
            style={{
              position: "absolute",
              top: 0,
              right: 0,
              width: 0,
              height: 0,
              borderStyle: "solid",
              borderWidth: "0 14px 14px 0",
              borderColor: `transparent ${statusColor} transparent transparent`,
            }}
          />
        )}
        <Stack gap={2}>
          <Group gap={4} wrap="nowrap">
            <Icon size={12} color={textColor} />
            <Text
              size="xs"
              c={textColor}
              truncate
              fw={500}
              style={{
                textDecoration: isComplete ? "line-through" : "none",
                textDecorationColor: "rgba(255,255,255,0.5)",
              }}
            >
              {event.title}
            </Text>
          </Group>
          {showTime && (
            <Group gap={4} wrap="nowrap" ml={16}>
              <IconClock size={10} color={textColor} opacity={0.8} />
              <Text size="10px" c={textColor} opacity={0.8}>
                {formattedTime}
              </Text>
            </Group>
          )}
        </Stack>
      </Paper>
    </motion.div>
  );
}
