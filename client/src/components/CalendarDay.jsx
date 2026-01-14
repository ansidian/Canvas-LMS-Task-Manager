import { Paper, Text, Stack, Badge } from '@mantine/core';
import { useDroppable } from '@dnd-kit/core';
import EventCard from './EventCard';

const MAX_VISIBLE_EVENTS = 3;

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

  const getClassColor = (classId) => {
    const cls = classes.find((c) => c.id === classId);
    return cls?.color || '#868e96';
  };

  const visibleEvents = events.slice(0, MAX_VISIBLE_EVENTS);
  const hiddenCount = events.length - MAX_VISIBLE_EVENTS;

  return (
    <Paper
      ref={setNodeRef}
      p="xs"
      h={120}
      withBorder
      onDoubleClick={onDoubleClick}
      style={{
        opacity: isCurrentMonth ? 1 : 0.4,
        backgroundColor: isOver ? 'var(--mantine-color-blue-light)' : undefined,
        borderColor: isToday ? 'var(--mantine-color-blue-filled)' : undefined,
        borderWidth: isToday ? 2 : 1,
        overflow: 'hidden',
        cursor: 'default',
        transition: 'background-color 150ms ease',
      }}
    >
      <Stack gap={4}>
        <Text
          size="sm"
          fw={isToday ? 700 : 400}
          c={isToday ? 'blue' : undefined}
        >
          {date.date()}
        </Text>
        <Stack gap={2} style={{ overflow: 'hidden', maxHeight: 80 }}>
          {visibleEvents.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              color={getClassColor(event.class_id)}
              onClick={() => onEventClick(event)}
            />
          ))}
          {hiddenCount > 0 && (
            <Text size="xs" c="dimmed" ta="center" style={{ cursor: 'pointer' }}>
              +{hiddenCount} more
            </Text>
          )}
        </Stack>
      </Stack>
    </Paper>
  );
}
