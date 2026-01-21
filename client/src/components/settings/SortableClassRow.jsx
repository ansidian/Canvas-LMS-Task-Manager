import { Paper } from "@mantine/core";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

export default function SortableClassRow({ id, disabled, children }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    cursor: disabled ? "default" : isDragging ? "grabbing" : "grab",
    opacity: isDragging ? 0.6 : 1,
  };

  return (
    <Paper ref={setNodeRef} p="sm" withBorder style={style} {...attributes} {...listeners}>
      {children}
    </Paper>
  );
}
