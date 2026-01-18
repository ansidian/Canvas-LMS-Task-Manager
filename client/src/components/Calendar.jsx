import { useMemo, useState, useEffect } from "react";
import { SimpleGrid, Text, Stack, Box } from "@mantine/core";
import {
  DndContext,
  DragOverlay,
  useSensor,
  useSensors,
  PointerSensor,
  closestCenter,
} from "@dnd-kit/core";
import { LayoutGroup } from "framer-motion";
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
    })
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
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    setActiveEvent(null);

    if (over && active.id !== over.id) {
      const newDate = over.id; // over.id is the date string
      onEventDrop(active.id, newDate);
    }
  };

  const handleDragCancel = () => {
    setActiveEvent(null);
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
    </DndContext>
  );
}
