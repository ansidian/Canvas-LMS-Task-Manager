import { useState } from 'react';
import { Stack, Text, Group, Box } from '@mantine/core';
import { IconFilter, IconGripVertical } from '@tabler/icons-react';
import { DndContext, PointerSensor, closestCenter, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { reorderSubset } from '../utils/reorder';

const STATUS_COLORS = {
  incomplete: '#78716C',   // pencil - muted neutral
  in_progress: '#8B6BC0', // violet blend
  complete: '#4A9968',    // earthy green blend
};

function FilterCheckbox({ color, isChecked, isCircle = false }) {
  return (
    <Box
      style={{
        width: 14,
        height: 14,
        backgroundColor: isChecked ? color : 'transparent',
        border: `2px solid ${color}`,
        borderRadius: isCircle ? '50%' : 3,
        flexShrink: 0,
        transition: 'background-color 150ms ease, transform 150ms ease',
        transform: isChecked ? 'scale(1)' : 'scale(0.9)',
      }}
    />
  );
}

function SortableFilterRow({ id, label, color, isChecked, onToggle }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };

  return (
    <Group
      ref={setNodeRef}
      gap={0}
      wrap="nowrap"
      style={{
        ...style,
        padding: '6px 8px',
        borderRadius: 6,
        cursor: 'pointer',
        background: isDragging ? 'var(--parchment)' : 'transparent',
        transition: 'background-color 150ms ease',
      }}
      className="filter-row"
      onClick={onToggle}
    >
      <Box
        {...attributes}
        {...listeners}
        style={{
          cursor: isDragging ? 'grabbing' : 'grab',
          padding: '2px 6px 2px 0',
          opacity: 0.3,
        }}
      >
        <IconGripVertical size={12} />
      </Box>
      <FilterCheckbox color={color} isChecked={isChecked} />
      <Text
        size="sm"
        ml={8}
        style={{
          opacity: isChecked ? 1 : 0.6,
          transition: 'opacity 150ms ease',
        }}
      >
        {label}
      </Text>
    </Group>
  );
}

export default function FilterPanel({
  statusFilters,
  onStatusFiltersChange,
  classFilters,
  onClassFiltersChange,
  classes,
  unassignedColor = "#a78b71",
  unassignedIndex,
  onUnassignedIndexChange,
  onClassesReorder,
}) {
  const [statusError, setStatusError] = useState(false);
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    })
  );

  const handleStatusChange = (values) => {
    // Require at least one status to be selected
    if (values.length > 0) {
      onStatusFiltersChange(values);
      setStatusError(false);
    } else {
      setStatusError(true);
      setTimeout(() => setStatusError(false), 2000);
    }
  };

  const handleClassChange = (values) => {
    onClassFiltersChange(values);
  };

  // Build class options including "Unassigned"
  // Hide classes that are linked to Canvas but have sync disabled
  const syncedClasses = classes.filter(
    (cls) => !cls.canvas_course_id || cls.is_synced
  );
  const syncedClassIds = syncedClasses.map((cls) => String(cls.id));
  const clampedUnassignedIndex = Number.isInteger(unassignedIndex)
    ? Math.max(0, Math.min(syncedClassIds.length, unassignedIndex))
    : syncedClassIds.length;
  const orderedItems = [...syncedClassIds];
  orderedItems.splice(clampedUnassignedIndex, 0, 'unassigned');

  const classById = new Map(
    syncedClasses.map((cls) => [String(cls.id), cls])
  );
  const classOptions = orderedItems.map((id) => {
    if (id === 'unassigned') {
      return {
        value: 'unassigned',
        label: 'Unassigned',
        color: unassignedColor,
      };
    }
    const cls = classById.get(id);
    return {
      value: id,
      label: cls?.name || 'Untitled',
      color: cls?.color || '#cbd5f5',
    };
  });

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = orderedItems.indexOf(active.id);
    const newIndex = orderedItems.indexOf(over.id);
    const reordered = arrayMove(orderedItems, oldIndex, newIndex);

    const nextUnassignedIndex = reordered.indexOf('unassigned');
    if (Number.isInteger(nextUnassignedIndex) && onUnassignedIndexChange) {
      onUnassignedIndexChange(nextUnassignedIndex);
    }

    const nextSyncedIds = reordered.filter((id) => id !== 'unassigned');
    const fullIds = classes.map((cls) => String(cls.id));
    const nextOrder = reorderSubset(fullIds, nextSyncedIds);
    const isSameOrder =
      nextSyncedIds.length === syncedClassIds.length &&
      nextSyncedIds.every((id, index) => id === syncedClassIds[index]);
    if (onClassesReorder && !isSameOrder) {
      onClassesReorder(nextOrder);
    }
  };

  return (
    <Stack gap={0} style={{ height: '100%' }}>
      <style>{`
        .filter-row:hover {
          background: var(--parchment);
        }
      `}</style>

      {/* Header */}
      <Box
        style={{
          padding: '14px 16px 12px',
          borderBottom: '1px solid var(--rule-soft)',
        }}
      >
        <Group gap={8}>
          <IconFilter size={14} style={{ opacity: 0.5 }} />
          <Text size="sm" fw={600}>
            Filters
          </Text>
        </Group>
      </Box>

      <Box style={{ padding: '12px 8px', flex: 1, overflowY: 'auto' }}>
        {/* Status Filters */}
        <Box mb="md">
          <Text size="xs" fw={600} c="dimmed" mb={6} ml={8}>
            STATUS
          </Text>
          <Stack gap={2}>
            {[
              { value: 'incomplete', label: 'Incomplete', color: STATUS_COLORS.incomplete },
              { value: 'in_progress', label: 'In Progress', color: STATUS_COLORS.in_progress },
              { value: 'complete', label: 'Complete', color: STATUS_COLORS.complete },
            ].map((option) => {
              const isChecked = statusFilters.includes(option.value);
              return (
                <Group
                  key={option.value}
                  gap={0}
                  wrap="nowrap"
                  className="filter-row"
                  style={{
                    cursor: 'pointer',
                    padding: '6px 8px',
                    borderRadius: 6,
                  }}
                  onClick={() => {
                    const newFilters = isChecked
                      ? statusFilters.filter((v) => v !== option.value)
                      : [...statusFilters, option.value];
                    handleStatusChange(newFilters);
                  }}
                >
                  <Box style={{ width: 18 }} /> {/* Spacer to align with draggable rows */}
                  <FilterCheckbox color={option.color} isChecked={isChecked} isCircle />
                  <Text
                    size="sm"
                    ml={8}
                    style={{
                      opacity: isChecked ? 1 : 0.6,
                      transition: 'opacity 150ms ease',
                    }}
                  >
                    {option.label}
                  </Text>
                </Group>
              );
            })}
          </Stack>
          {statusError && (
            <Text size="xs" c="red" mt={4} ml={8}>
              At least one status required
            </Text>
          )}
        </Box>

        {/* Class Filters */}
        <Box>
          <Text size="xs" fw={600} c="dimmed" mb={6} ml={8}>
            CLASSES
          </Text>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={orderedItems} strategy={verticalListSortingStrategy}>
              <Stack gap={2}>
                {classOptions.map((option) => {
                  const isChecked = classFilters.includes(option.value);
                  return (
                    <SortableFilterRow
                      key={option.value}
                      id={option.value}
                      label={option.label}
                      color={option.color}
                      isChecked={isChecked}
                      onToggle={() => {
                        const newFilters = isChecked
                          ? classFilters.filter((v) => v !== option.value)
                          : [...classFilters, option.value];
                        handleClassChange(newFilters);
                      }}
                    />
                  );
                })}
              </Stack>
            </SortableContext>
          </DndContext>
        </Box>
      </Box>
    </Stack>
  );
}
