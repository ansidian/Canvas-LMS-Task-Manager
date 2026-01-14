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

const STATUS_COLORS = {
  incomplete: '#868e96',
  in_progress: '#7950f2',
  complete: '#40c057',
};

export default function EventCard({ event, color, onClick, isDragging }) {
  const { attributes, listeners, setNodeRef, isDragging: isBeingDragged } = useDraggable({
    id: event.id,
  });

  const Icon = EVENT_ICONS[event.event_type] || IconFileText;
  const statusColor = STATUS_COLORS[event.status] || STATUS_COLORS.incomplete;
  const gradientBackground = `linear-gradient(135deg, ${statusColor} 50%, ${color} 50%)`;

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
      <Group gap={4} wrap="nowrap">
        <Icon size={12} color="white" />
        <Text size="xs" c="white" truncate fw={500}>
          {event.title}
        </Text>
      </Group>
    </Paper>
  );
}
