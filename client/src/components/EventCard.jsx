import { Paper, Text, Group } from '@mantine/core';
import { useDraggable } from '@dnd-kit/core';
import {
  IconFileText,
  IconClipboardCheck,
  IconWriting,
  IconFlask,
  IconSchool,
} from '@tabler/icons-react';

const EVENT_ICONS = {
  assignment: IconFileText,
  quiz: IconClipboardCheck,
  homework: IconWriting,
  lab: IconFlask,
  exam: IconSchool,
};

export default function EventCard({ event, color, onClick, isDragging }) {
  const { attributes, listeners, setNodeRef, isDragging: isBeingDragged } = useDraggable({
    id: event.id,
  });

  const Icon = EVENT_ICONS[event.event_type] || IconFileText;

  // When being dragged, hide the original (DragOverlay shows the preview)
  if (isBeingDragged) {
    return (
      <Paper
        p={4}
        style={{
          backgroundColor: color,
          opacity: 0.3,
        }}
      >
        <Group gap={4} wrap="nowrap">
          <Icon size={12} color="white" />
          <Text size="xs" c="white" truncate fw={500}>
            {event.title}
          </Text>
        </Group>
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
        backgroundColor: color,
        cursor: isDragging ? 'grabbing' : 'grab',
        opacity: isDragging ? 1 : 1,
        boxShadow: isDragging ? '0 4px 12px rgba(0,0,0,0.25)' : undefined,
        transform: isDragging ? 'scale(1.02)' : undefined,
        touchAction: 'none',
      }}
      onClick={(e) => {
        e.stopPropagation();
        if (onClick) onClick();
      }}
    >
      <Group gap={4} wrap="nowrap">
        <Icon size={12} color="white" />
        <Text size="xs" c="white" truncate fw={500}>
          {event.title}
        </Text>
      </Group>
    </Paper>
  );
}
