import { useMemo, useRef, useEffect, useCallback } from "react";
import { Box, Text, Stack, Group, Paper } from "@mantine/core";
import { motion } from "framer-motion";
import {
  IconFileText,
  IconClipboardCheck,
  IconWriting,
  IconFlask,
  IconSchool,
  IconClock,
  IconCircleCheckFilled,
  IconProgressCheck,
  IconCircleDot,
  IconPlus,
  IconCalendarOff,
} from "@tabler/icons-react";
import dayjs from "dayjs";
import { hasTimeComponent, extractTime } from "../../utils/datetime";

const EVENT_ICONS = {
  assignment: IconFileText,
  quiz: IconClipboardCheck,
  homework: IconWriting,
  lab: IconFlask,
  exam: IconSchool,
};

const SWIPE_THRESHOLD = 50;

function formatTime12(time24) {
  const [hours, minutes] = time24.split(":").map(Number);
  const period = hours >= 12 ? "PM" : "AM";
  const hours12 = hours % 12 || 12;
  return `${hours12}:${minutes.toString().padStart(2, "0")} ${period}`;
}

function getDayLabel(dateStr) {
  const d = dayjs(dateStr);
  const today = dayjs().startOf("day");
  const diff = d.startOf("day").diff(today, "day");

  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff === -1) return "Yesterday";
  return d.format("dddd");
}

function MobileEventRow({ event, color, onEventClick }) {
  const Icon = EVENT_ICONS[event.event_type] || IconFileText;
  const isComplete = event.status === "complete";
  const isInProgress = event.status === "in_progress";

  const timeString = hasTimeComponent(event.due_date)
    ? extractTime(event.due_date)
    : null;
  const isMidnight = timeString === "00:00";
  const showTime = timeString && !isMidnight;
  const formattedTime = showTime ? formatTime12(timeString) : "All day";

  return (
    <motion.div whileTap={{ scale: 0.97 }} transition={{ type: "spring", stiffness: 500, damping: 30 }}>
      <Paper
        p="sm"
        radius="md"
        style={{
          background: "var(--card)",
          border: "1px solid var(--rule-soft)",
          cursor: "pointer",
          opacity: isComplete ? 0.6 : 1,
          WebkitTapHighlightColor: "transparent",
        }}
        onClick={() => onEventClick(event)}
      >
        <Group gap="sm" wrap="nowrap" align="flex-start">
          {/* Color stripe */}
          <Box
            style={{
              width: 4,
              minHeight: 36,
              borderRadius: 2,
              backgroundColor: color,
              flexShrink: 0,
              alignSelf: "stretch",
            }}
          />

          {/* Content */}
          <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
            <Group gap="xs" wrap="nowrap">
              <Icon size={16} style={{ color: "var(--graphite)", flexShrink: 0 }} />
              <Text
                size="sm"
                fw={500}
                truncate
                style={{
                  color: "var(--ink)",
                  textDecoration: isComplete ? "line-through" : "none",
                  textDecorationColor: "var(--pencil)",
                }}
              >
                {event.title}
              </Text>
            </Group>
            <Group gap="xs" wrap="nowrap" ml={24}>
              <IconClock size={12} style={{ color: "var(--pencil)", flexShrink: 0 }} />
              <Text size="xs" c="var(--graphite)">
                {formattedTime}
              </Text>
              {event.class_name && (
                <>
                  <Text size="xs" c="var(--pencil)">·</Text>
                  <Text size="xs" c="var(--graphite)" truncate>
                    {event.class_name}
                  </Text>
                </>
              )}
            </Group>
          </Stack>

          {/* Status indicator */}
          <Box style={{ flexShrink: 0, paddingTop: 2 }}>
            {isComplete ? (
              <IconCircleCheckFilled size={18} style={{ color: "var(--complete)" }} />
            ) : isInProgress ? (
              <IconProgressCheck size={18} style={{ color: "var(--in-progress)" }} />
            ) : (
              <IconCircleDot size={18} style={{ color: "var(--pencil)" }} />
            )}
          </Box>
        </Group>
      </Paper>
    </motion.div>
  );
}

export default function MobileAgendaView({
  currentDate,
  events,
  classes,
  onEventClick,
  onDayAdd,
  unassignedColor = "#a78b71",
  onSwipeLeft,
  onSwipeRight,
}) {
  const todayRef = useRef(null);
  const touchStartRef = useRef(null);

  const getClassColor = (classId) => {
    const cls = classes.find((c) => c.id === classId);
    return cls?.color || unassignedColor;
  };

  const getClassName = (classId) => {
    const cls = classes.find((c) => c.id === classId);
    return cls?.name || null;
  };

  // Touch swipe handlers for month navigation
  const handleTouchStart = useCallback((e) => {
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  }, []);

  const handleTouchEnd = useCallback((e) => {
    if (!touchStartRef.current) return;
    const touch = e.changedTouches[0];
    const dx = touch.clientX - touchStartRef.current.x;
    const dy = touch.clientY - touchStartRef.current.y;

    // Only trigger if horizontal swipe is dominant and exceeds threshold
    if (Math.abs(dx) > SWIPE_THRESHOLD && Math.abs(dx) > Math.abs(dy) * 1.5) {
      if (dx < 0) {
        onSwipeLeft?.();  // swipe left = next month
      } else {
        onSwipeRight?.(); // swipe right = prev month
      }
    }
    touchStartRef.current = null;
  }, [onSwipeLeft, onSwipeRight]);

  // Group events by date, sorted chronologically
  const groupedEvents = useMemo(() => {
    const map = {};
    events.forEach((event) => {
      const dateKey = dayjs(event.due_date).format("YYYY-MM-DD");
      if (!map[dateKey]) map[dateKey] = [];
      map[dateKey].push(event);
    });

    // Sort events within each day by time
    Object.values(map).forEach((dayEvents) => {
      dayEvents.sort((a, b) => {
        const timeA = dayjs(a.due_date);
        const timeB = dayjs(b.due_date);
        const isMidnightA = timeA.hour() === 0 && timeA.minute() === 0;
        const isMidnightB = timeB.hour() === 0 && timeB.minute() === 0;
        if (isMidnightA && !isMidnightB) return 1;
        if (!isMidnightA && isMidnightB) return -1;
        return timeA.valueOf() - timeB.valueOf();
      });
    });

    // Filter to current month's range and sort by date
    const startOfMonth = currentDate.startOf("month").format("YYYY-MM-DD");
    const endOfMonth = currentDate.endOf("month").format("YYYY-MM-DD");

    return Object.entries(map)
      .filter(([date]) => date >= startOfMonth && date <= endOfMonth)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, dayEvents]) => ({
        date,
        label: getDayLabel(date),
        formatted: dayjs(date).format("ddd, MMM D"),
        events: dayEvents,
      }));
  }, [events, currentDate]);

  // Scroll to today's section on mount/month change
  useEffect(() => {
    if (todayRef.current) {
      todayRef.current.scrollIntoView({ block: "start", behavior: "smooth" });
    }
  }, [currentDate]);

  const todayStr = dayjs().format("YYYY-MM-DD");

  return (
    <Box
      style={{ position: "relative", height: "100%" }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <Box
        style={{
          height: "100%",
          overflowY: "auto",
          padding: "8px 12px",
          paddingBottom: 80,
          WebkitOverflowScrolling: "touch",
        }}
      >
        {groupedEvents.length === 0 ? (
          <Stack align="center" justify="center" gap="sm" style={{ paddingTop: 80 }}>
            <IconCalendarOff size={48} style={{ color: "var(--pencil)", opacity: 0.4 }} />
            <Text size="lg" fw={500} c="var(--graphite)">
              No events this month
            </Text>
            <Text size="sm" c="var(--pencil)" ta="center">
              Tap + to add an event, or navigate to another month.
            </Text>
          </Stack>
        ) : (
          <Stack gap="md">
            {groupedEvents.map(({ date, label, formatted, events: dayEvents }) => {
              const isToday = date === todayStr;
              return (
                <Box key={date} ref={isToday ? todayRef : undefined}>
                  {/* Day header */}
                  <Group gap="xs" mb={6} ml={2}>
                    <Text
                      size="sm"
                      fw={isToday ? 700 : 600}
                      c={isToday ? "var(--ink-blue)" : "var(--ink)"}
                    >
                      {label}
                    </Text>
                    <Text size="sm" c="var(--graphite)">
                      {formatted}
                    </Text>
                  </Group>

                  {/* Events list */}
                  <Stack gap={6}>
                    {dayEvents.map((event) => (
                      <MobileEventRow
                        key={event.id}
                        event={{ ...event, class_name: getClassName(event.class_id) }}
                        color={getClassColor(event.class_id)}
                        onEventClick={onEventClick}
                      />
                    ))}
                  </Stack>
                </Box>
              );
            })}
          </Stack>
        )}
      </Box>

      {/* FAB for adding new event — positioned above bottom nav */}
      <motion.button
        whileTap={{ scale: 0.85 }}
        whileHover={{ scale: 1.05 }}
        transition={{ type: "spring", stiffness: 500, damping: 20 }}
        onClick={() => onDayAdd(dayjs().format("YYYY-MM-DD"))}
        style={{
          position: "fixed",
          bottom: 72,
          right: 16,
          width: 48,
          height: 48,
          borderRadius: "50%",
          background: "var(--ink-blue)",
          color: "white",
          border: "none",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "var(--shadow-lg)",
          zIndex: 101,
          cursor: "pointer",
          WebkitTapHighlightColor: "transparent",
        }}
      >
        <IconPlus size={24} />
      </motion.button>
    </Box>
  );
}
