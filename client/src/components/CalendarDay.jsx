import { Paper, Text, Stack, Popover } from "@mantine/core";
import { useDroppable } from "@dnd-kit/core";
import { useState } from "react";
import EventCard from "./EventCard";

const MAX_VISIBLE_EVENTS = 4;

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

  const getClassColor = (classId) => {
    const cls = classes.find((c) => c.id === classId);
    return cls?.color || "#868e96";
  };

  // If 5+ events, show 3 events + "N more". Otherwise show up to 4.
  const shouldShowMore = events.length >= 5;
  const displayCount = shouldShowMore ? 3 : MAX_VISIBLE_EVENTS;
  const visibleEvents = events.slice(0, displayCount);
  const hiddenCount = events.length - displayCount;
  const hiddenEvents = events.slice(displayCount);

  return (
    <Paper
      ref={setNodeRef}
      p="xs"
      h={160}
      withBorder
      onDoubleClick={onDoubleClick}
      style={{
        opacity: isCurrentMonth ? 1 : 0.4,
        backgroundColor: isOver ? "var(--mantine-color-blue-light)" : undefined,
        borderColor: isToday ? "var(--mantine-color-blue-filled)" : undefined,
        borderWidth: isToday ? 2 : 1,
        overflow: "hidden",
        cursor: "default",
        transition: "background-color 150ms ease",
      }}
    >
      <Stack gap={4}>
        <Text
          size="sm"
          fw={isToday ? 700 : 400}
          c={isToday ? "blue" : undefined}
        >
          {date.date()}
        </Text>
        <Stack gap={2} style={{ overflow: "hidden", maxHeight: 110 }}>
          {visibleEvents.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              color={getClassColor(event.class_id)}
              onClick={() => onEventClick(event)}
            />
          ))}
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
                  style={{ cursor: "pointer" }}
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
                  {hiddenEvents.map((event) => (
                    <EventCard
                      key={event.id}
                      event={event}
                      color={getClassColor(event.class_id)}
                      onClick={() => {
                        setPopoverOpened(false);
                        onEventClick(event);
                      }}
                    />
                  ))}
                </Stack>
              </Popover.Dropdown>
            </Popover>
          )}
        </Stack>
      </Stack>
    </Paper>
  );
}
