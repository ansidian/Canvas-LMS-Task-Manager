import { useMemo, useState, useEffect, useRef, useLayoutEffect } from "react";
import { SimpleGrid, Text, Stack, Box } from "@mantine/core";
import {
  DndContext,
  DragOverlay,
  useSensor,
  useSensors,
  PointerSensor,
  closestCenter,
} from "@dnd-kit/core";
import { LayoutGroup, motion, AnimatePresence } from "framer-motion";
import dayjs from "dayjs";
import CalendarDay from "./CalendarDay";
import EventCard from "./EventCard";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function Calendar({
  currentDate,
  events,
  classes,
  onEventClick,
  onEventDrop,
  onDayDoubleClick,
  unassignedColor = "#a78b71",
}) {
  const [activeEvent, setActiveEvent] = useState(null);
  const [slideDirection, setSlideDirection] = useState("");
  const [prevDate, setPrevDate] = useState(currentDate);
  const [ghostAnimation, setGhostAnimation] = useState(null);
  const sourceRectRef = useRef(null);

  // Detect month change direction for slide animation
  useEffect(() => {
    if (!prevDate.isSame(currentDate, "month")) {
      if (currentDate.isAfter(prevDate, "month")) {
        setSlideDirection("calendar-slide-right");
      } else {
        setSlideDirection("calendar-slide-left");
      }
      setPrevDate(currentDate);

      // Clear animation class after animation completes
      const timer = setTimeout(() => setSlideDirection(""), 300);
      return () => clearTimeout(timer);
    }
  }, [currentDate, prevDate]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 10,
      },
    }),
  );

  const calendarDays = useMemo(() => {
    const startOfMonth = currentDate.startOf("month");
    const endOfMonth = currentDate.endOf("month");
    const startDay = startOfMonth.day();
    const daysInMonth = endOfMonth.date();

    const days = [];

    // Previous month's trailing days
    for (let i = 0; i < startDay; i++) {
      const date = startOfMonth.subtract(startDay - i, "day");
      days.push({ date, isCurrentMonth: false });
    }

    // Current month's days
    for (let i = 1; i <= daysInMonth; i++) {
      const date = startOfMonth.date(i);
      days.push({ date, isCurrentMonth: true });
    }

    // Next month's leading days to complete the grid
    const remaining = 42 - days.length; // 6 rows * 7 days
    for (let i = 1; i <= remaining; i++) {
      const date = endOfMonth.add(i, "day");
      days.push({ date, isCurrentMonth: false });
    }

    return days;
  }, [currentDate]);

  const eventsByDate = useMemo(() => {
    const map = {};
    events.forEach((event) => {
      const dateKey = dayjs(event.due_date).format("YYYY-MM-DD");
      if (!map[dateKey]) map[dateKey] = [];
      map[dateKey].push(event);
    });
    return map;
  }, [events]);

  const handleDragStart = (event) => {
    const eventData = events.find((e) => e.id === event.active.id);
    setActiveEvent(eventData);

    // Capture source position for ghost animation
    const element = document.querySelector(
      `[data-event-id="${event.active.id}"]`,
    );
    if (element) {
      sourceRectRef.current = element.getBoundingClientRect();
    }
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;

    if (over && active.id !== over.id && sourceRectRef.current) {
      const eventData = events.find((e) => e.id === active.id);
      const newDate = over.id;

      // Start ghost animation
      setGhostAnimation({
        sourceRect: sourceRectRef.current,
        event: eventData,
        color: getClassColor(eventData?.class_id),
        targetDate: newDate,
        destinationRect: null,
      });

      // Trigger the actual state update
      onEventDrop(active.id, newDate);
    }

    setActiveEvent(null);
    sourceRectRef.current = null;
  };

  const handleDragCancel = () => {
    setActiveEvent(null);
    sourceRectRef.current = null;
  };

  // Capture destination rect after the event moves to new position
  useLayoutEffect(() => {
    if (ghostAnimation && !ghostAnimation.destinationRect) {
      // Wait a frame for the new card to render in its new position
      requestAnimationFrame(() => {
        const element = document.querySelector(
          `[data-event-id="${ghostAnimation.event?.id}"]`,
        );
        if (element) {
          const destRect = element.getBoundingClientRect();
          setGhostAnimation((prev) => ({
            ...prev,
            destinationRect: destRect,
          }));
        } else {
          // Card not visible (e.g., moved to different month), skip animation
          setGhostAnimation(null);
        }
      });
    }
  }, [ghostAnimation, events]);

  const handleGhostAnimationComplete = () => {
    setGhostAnimation(null);
  };

  const getClassColor = (classId) => {
    const cls = classes.find((c) => c.id === classId);
    return cls?.color || unassignedColor;
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <LayoutGroup>
        <Box
          style={{
            height: "100%",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          <Stack gap="xs" style={{ flex: 1, minHeight: 0 }}>
            <SimpleGrid cols={7} spacing={0}>
              {WEEKDAYS.map((day) => (
                <Box key={day} p="xs" ta="center">
                  <Text size="sm" fw={600} c="dimmed">
                    {day}
                  </Text>
                </Box>
              ))}
            </SimpleGrid>
            <Box
              style={{
                flex: 1,
                minHeight: 0,
                display: "grid",
                gridTemplateColumns: "repeat(7, 1fr)",
                gridTemplateRows: "repeat(6, 1fr)",
                gap: "3px",
              }}
              className={slideDirection}
            >
              {calendarDays.map(({ date, isCurrentMonth }) => {
                const dateKey = date.format("YYYY-MM-DD");
                const dayEvents = eventsByDate[dateKey] || [];
                const isToday = date.isSame(dayjs(), "day");

                return (
                  <CalendarDay
                    key={dateKey}
                    date={date}
                    dateKey={dateKey}
                    isCurrentMonth={isCurrentMonth}
                    isToday={isToday}
                    events={dayEvents}
                    classes={classes}
                    onEventClick={onEventClick}
                    onDoubleClick={() => onDayDoubleClick(dateKey)}
                    unassignedColor={unassignedColor}
                  />
                );
              })}
            </Box>
          </Stack>
        </Box>
      </LayoutGroup>

      <DragOverlay dropAnimation={null}>
        {activeEvent && (
          <EventCard
            event={activeEvent}
            color={getClassColor(activeEvent.class_id)}
            isDragging
          />
        )}
      </DragOverlay>

      {/* Ghost trail animation for rescheduling */}
      <AnimatePresence>
        {ghostAnimation?.destinationRect && (
          <motion.div
            key="ghost-card"
            initial={{
              left: ghostAnimation.sourceRect.left,
              top: ghostAnimation.sourceRect.top,
              width: ghostAnimation.sourceRect.width,
              height: ghostAnimation.sourceRect.height,
              opacity: 1,
              scale: 1.05,
            }}
            animate={{
              left: ghostAnimation.destinationRect.left,
              top: ghostAnimation.destinationRect.top,
              width: ghostAnimation.destinationRect.width,
              height: ghostAnimation.destinationRect.height,
              opacity: [1, 1, 0],
              scale: [1.05, 1.02, 1],
            }}
            transition={{
              duration: 0.35,
              ease: [0.25, 0.1, 0.25, 1],
              opacity: { times: [0, 0.7, 1] },
              scale: { times: [0, 0.7, 1] },
            }}
            onAnimationComplete={handleGhostAnimationComplete}
            style={{
              position: "fixed",
              zIndex: 1000,
              pointerEvents: "none",
              filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.3))",
            }}
          >
            <EventCard
              event={ghostAnimation.event}
              color={ghostAnimation.color}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </DndContext>
  );
}
