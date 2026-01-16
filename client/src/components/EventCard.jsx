import { Paper, Text, Group, Stack } from '@mantine/core';
import { useDraggable } from '@dnd-kit/core';
import {
  IconFileText,
  IconClipboardCheck,
  IconWriting,
  IconFlask,
  IconSchool,
  IconClock,
} from '@tabler/icons-react';
import { hasTimeComponent, extractTime } from '../utils/datetime';

const EVENT_ICONS = {
  assignment: IconFileText,
  quiz: IconClipboardCheck,
  homework: IconWriting,
  lab: IconFlask,
  exam: IconSchool,
};

const STATUS_COLORS = {
  incomplete: '#94a3b8',
  in_progress: '#7950f2',
  complete: '#40c057',
};

// Helper to format time from 24h to 12h format
function formatTime(time24) {
  const [hours, minutes] = time24.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const hours12 = hours % 12 || 12;
  return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
}

export default function EventCard({ event, color, onClick, isDragging }) {
  const { attributes, listeners, setNodeRef, isDragging: isBeingDragged } = useDraggable({
    id: event.id,
  });

  const Icon = EVENT_ICONS[event.event_type] || IconFileText;
  const statusColor = STATUS_COLORS[event.status] || STATUS_COLORS.incomplete;
  const gradientBackground = `linear-gradient(90deg, ${statusColor} 10%, ${color} 10%)`;

  // Check if event has time information
  const showTime = hasTimeComponent(event.due_date);
  const timeString = showTime ? extractTime(event.due_date) : null;

  // Format time as 12-hour format
  const formattedTime = timeString ? formatTime(timeString) : null;

  // When being dragged, hide the original (DragOverlay shows the preview)
  if (isBeingDragged) {
    return (
      <Paper
        p={4}
        style={{
          background: gradientBackground,
          opacity: 0.3,
        }}
      >
        <Stack gap={2}>
          <Group gap={4} wrap="nowrap">
            <Icon size={12} color="white" />
            <Text size="xs" c="white" truncate fw={500}>
              {event.title}
            </Text>
          </Group>
          {showTime && (
            <Group gap={4} wrap="nowrap" ml={16}>
              <IconClock size={10} color="white" opacity={0.8} />
              <Text size="10px" c="white" opacity={0.8}>
                {formattedTime}
              </Text>
            </Group>
          )}
        </Stack>
      </Paper>
    );
  }

  return (
    <Paper
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      p={4}
      style={{
        background: gradientBackground,
        cursor: isDragging ? 'grabbing' : 'grab',
        opacity: isDragging ? 1 : 1,
        boxShadow: isDragging ? '0 4px 12px rgba(0,0,0,0.25)' : undefined,
        transform: isDragging ? 'scale(1.02)' : undefined,
        touchAction: 'none',
        transition: 'transform 0.15s ease, box-shadow 0.15s ease',
      }}
      onMouseEnter={(e) => {
        if (!isDragging) {
          e.currentTarget.style.transform = 'scale(1.01)';
          e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
        }
      }}
      onMouseLeave={(e) => {
        if (!isDragging) {
          e.currentTarget.style.transform = 'scale(1)';
          e.currentTarget.style.boxShadow = 'none';
        }
      }}
      onClick={(e) => {
        e.stopPropagation();
        if (onClick) onClick();
      }}
    >
      <Stack gap={2}>
        <Group gap={4} wrap="nowrap">
          <Icon size={12} color="white" />
          <Text size="xs" c="white" truncate fw={500}>
            {event.title}
          </Text>
        </Group>
        {showTime && (
          <Group gap={4} wrap="nowrap" ml={16}>
            <IconClock size={10} color="white" opacity={0.8} />
            <Text size="10px" c="white" opacity={0.8}>
              {formattedTime}
            </Text>
          </Group>
        )}
      </Stack>
    </Paper>
  );
}
