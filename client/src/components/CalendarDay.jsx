import { Paper, Text, Stack, Popover } from "@mantine/core";
import { useDroppable } from "@dnd-kit/core";
import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import EventCard from "./EventCard";
import { hasTimeComponent } from "../utils/datetime";

// Estimated heights for calculating how many events fit
const EVENT_HEIGHT_BASIC = 22; // Event without time (padding 4*2 + line ~14)
const EVENT_HEIGHT_WITH_TIME = 34; // Event with time shown (adds ~12 for time row)
const EVENT_GAP = 2;
const MORE_TEXT_HEIGHT = 16;

export default function CalendarDay({
  date,
  dateKey,
  isCurrentMonth,
  isToday,
  events,
  classes,
  onEventClick,
  onDoubleClick,
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: dateKey,
  });
  const [popoverOpened, setPopoverOpened] = useState(false);
  const [maxVisible, setMaxVisible] = useState(3);
  const containerRef = useRef(null);

  const getClassColor = (classId) => {
    const cls = classes.find((c) => c.id === classId);
    return cls?.color || "#868e96";
  };

  // Calculate how many events can fit based on container height
  const calculateMaxVisible = useCallback(() => {
    if (!containerRef.current || events.length === 0) return;

    const containerHeight = containerRef.current.clientHeight;

    if (containerHeight === 0) return;

    let totalHeight = 0;
    let count = 0;

    for (let i = 0; i < events.length; i++) {
      const event = events[i];
      const eventHeight = hasTimeComponent(event.due_date)
        ? EVENT_HEIGHT_WITH_TIME
        : EVENT_HEIGHT_BASIC;

      const hasMoreAfterThis = i < events.length - 1;

      // Only reserve space for "+N more" if we're not showing all events
      const wouldNeedMore = hasMoreAfterThis && count + 1 < events.length;
      const reservedHeight = wouldNeedMore ? MORE_TEXT_HEIGHT : 0;

      if (totalHeight + eventHeight + reservedHeight <= containerHeight) {
        totalHeight += eventHeight + EVENT_GAP;
        count++;
      } else {
        break;
      }
    }

    // Ensure at least 1 event shows if there are events
    setMaxVisible(Math.max(1, count));
  }, [events]);

  // Recalculate on mount, resize, and when events change
  useEffect(() => {
    calculateMaxVisible();

    const resizeObserver = new ResizeObserver(() => {
      calculateMaxVisible();
    });

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => resizeObserver.disconnect();
  }, [calculateMaxVisible]);

  // Determine visible events based on calculated max
  const visibleEvents = events.slice(0, maxVisible);
  const hiddenCount = events.length - maxVisible;
  const hiddenEvents = events.slice(maxVisible);

  return (
    <Paper
      ref={setNodeRef}
      p="xs"
      withBorder
      onDoubleClick={onDoubleClick}
      className="calendar-day"
      style={{
        opacity: isCurrentMonth ? 1 : 0.4,
        backgroundColor: isOver ? "var(--mantine-color-blue-light)" : undefined,
        borderColor: isToday ? "var(--mantine-color-blue-filled)" : undefined,
        borderWidth: isToday ? 2 : 1,
        overflow: "hidden",
        cursor: "default",
        height: "100%",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Stack gap={4} style={{ height: "100%", minHeight: 0 }}>
        <Text
          size="sm"
          fw={isToday ? 700 : 400}
          c={isToday ? "blue" : undefined}
          style={{ flexShrink: 0 }}
        >
          {date.date()}
        </Text>
        <div
          ref={containerRef}
          style={{
            overflow: "hidden",
            flex: 1,
            minHeight: 0,
            display: "flex",
            flexDirection: "column",
            gap: "2px",
          }}
        >
          <AnimatePresence initial={false}>
            {visibleEvents.map((event) => (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, scale: 0.8, y: -10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8, x: -20 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
              >
                <EventCard
                  event={event}
                  color={getClassColor(event.class_id)}
                  onClick={() => onEventClick(event)}
                />
              </motion.div>
            ))}
          </AnimatePresence>
          {hiddenCount > 0 && (
            <Popover
              opened={popoverOpened}
              onChange={setPopoverOpened}
              position="bottom"
              withArrow
              shadow="md"
              width={250}
            >
              <Popover.Target>
                <Text
                  size="xs"
                  c="dimmed"
                  ta="center"
                  style={{ cursor: "pointer", flexShrink: 0 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setPopoverOpened((o) => !o);
                  }}
                >
                  +{hiddenCount} more
                </Text>
              </Popover.Target>
              <Popover.Dropdown>
                <Stack gap={4}>
                  <AnimatePresence initial={false}>
                    {hiddenEvents.map((event) => (
                      <motion.div
                        key={event.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }}
                        transition={{ duration: 0.15 }}
                      >
                        <EventCard
                          event={event}
                          color={getClassColor(event.class_id)}
                          onClick={() => {
                            setPopoverOpened(false);
                            onEventClick(event);
                          }}
                        />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </Stack>
              </Popover.Dropdown>
            </Popover>
          )}
        </div>
      </Stack>
    </Paper>
  );
}
