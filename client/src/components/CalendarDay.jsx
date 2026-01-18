import { Paper, Text, Stack, Popover } from "@mantine/core";
import { useDroppable } from "@dnd-kit/core";
import { useState, useRef, useEffect, useLayoutEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import EventCard from "./EventCard";

const EVENT_GAP = 2;
const MORE_TEXT_HEIGHT = 14; // Mantine xs text (~12px font + line-height)

export default function CalendarDay({
  date,
  dateKey,
  isCurrentMonth,
  isToday,
  events,
  classes,
  onEventClick,
  onDoubleClick,
  unassignedColor = "#a78b71",
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: dateKey,
  });
  const [popoverOpened, setPopoverOpened] = useState(false);
  const [maxVisible, setMaxVisible] = useState(events.length);
  const containerRef = useRef(null);
  const measureRef = useRef(null);

  const getClassColor = (classId) => {
    const cls = classes.find((c) => c.id === classId);
    return cls?.color || unassignedColor;
  };

  // Measure actual rendered event heights and calculate how many fit
  const calculateMaxVisible = useCallback(() => {
    if (!containerRef.current || !measureRef.current || events.length === 0) {
      setMaxVisible(events.length);
      return;
    }

    const containerHeight = containerRef.current.clientHeight;
    if (containerHeight === 0) return;

    const eventElements = measureRef.current.children;
    let totalHeight = 0;
    let count = 0;

    for (let i = 0; i < eventElements.length; i++) {
      const el = eventElements[i];
      const eventHeight = el.getBoundingClientRect().height;
      const hasMoreAfterThis = i < events.length - 1;
      const wouldNeedMore = hasMoreAfterThis && count + 1 < events.length;
      const reservedHeight = wouldNeedMore ? MORE_TEXT_HEIGHT : 0;

      if (totalHeight + eventHeight + reservedHeight <= containerHeight) {
        totalHeight += eventHeight + EVENT_GAP;
        count++;
      } else {
        break;
      }
    }

    setMaxVisible(Math.max(1, count));
  }, [events]);

  // Measure after render
  useLayoutEffect(() => {
    calculateMaxVisible();
  }, [calculateMaxVisible]);

  // Close popover when events change (e.g., after drag-drop)
  useEffect(() => {
    setPopoverOpened(false);
  }, [events]);

  // Recalculate on resize
  useEffect(() => {
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
            position: "relative",
            overflow: "hidden",
            flex: 1,
            minHeight: 0,
            display: "flex",
            flexDirection: "column",
            gap: "2px",
          }}
        >
          {/* Hidden measurement layer - always rendered to measure heights */}
          {events.length > 0 && (
            <div
              ref={measureRef}
              style={{
                visibility: "hidden",
                position: "absolute",
                left: 0,
                right: 0,
                display: "flex",
                flexDirection: "column",
                gap: "2px",
                pointerEvents: "none",
              }}
              aria-hidden="true"
            >
              {events.map((event) => (
                <div key={event.id}>
                  <EventCard
                    event={event}
                    color={getClassColor(event.class_id)}
                  />
                </div>
              ))}
            </div>
          )}
          {/* Visible events */}
          <AnimatePresence initial={false}>
            {visibleEvents.map((event) => (
              <motion.div
                key={event.id}
                layoutId={`event-${event.id}`}
                layout
                initial={{ opacity: 0, scale: 0.8, y: -10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8, x: -20 }}
                transition={{
                  layout: {
                    type: "spring",
                    stiffness: 350,
                    damping: 30,
                  },
                  opacity: { duration: 0.2 },
                  scale: { duration: 0.2 },
                }}
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
                        layout
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }}
                        transition={{
                          layout: {
                            type: "spring",
                            stiffness: 350,
                            damping: 30,
                          },
                          opacity: { duration: 0.15 },
                        }}
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
