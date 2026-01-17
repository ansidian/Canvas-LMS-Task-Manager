import { useState } from 'react';
import { Stack, Text, Divider, Group, Box } from '@mantine/core';
import { DndContext, PointerSensor, closestCenter, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { reorderSubset } from '../utils/reorder';

const STATUS_COLORS = {
  incomplete: '#94a3b8',
  in_progress: '#7950f2',
  complete: '#40c057',
};

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
    cursor: isDragging ? 'grabbing' : 'grab',
    opacity: isDragging ? 0.6 : 1,
  };

  return (
    <Group
      ref={setNodeRef}
      gap="xs"
      wrap="nowrap"
      style={style}
      {...attributes}
      {...listeners}
      onClick={onToggle}
    >
      <Box
        style={{
          width: 12,
          height: 12,
          backgroundColor: isChecked ? color : 'transparent',
          border: `2px solid ${color}`,
          borderRadius: 2,
          flexShrink: 0,
        }}
      />
      <Text size="sm">{label}</Text>
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
    <Stack gap="md" p="md">
      {/* Status Filters */}
      <Stack gap="xs">
        <Text size="sm" fw={600}>
          Status
        </Text>
        <Stack gap="xs">
          {[
            { value: 'incomplete', label: 'Incomplete', color: STATUS_COLORS.incomplete },
            { value: 'in_progress', label: 'In Progress', color: STATUS_COLORS.in_progress },
            { value: 'complete', label: 'Complete', color: STATUS_COLORS.complete },
          ].map((option) => {
            const isChecked = statusFilters.includes(option.value);
            return (
              <Group
                key={option.value}
                gap="xs"
                wrap="nowrap"
                style={{ cursor: 'pointer' }}
                onClick={() => {
                  const newFilters = isChecked
                    ? statusFilters.filter((v) => v !== option.value)
                    : [...statusFilters, option.value];
                  handleStatusChange(newFilters);
                }}
              >
                <Box
                  style={{
                    width: 12,
                    height: 12,
                    backgroundColor: isChecked ? option.color : 'transparent',
                    border: `2px solid ${option.color}`,
                    borderRadius: '50%',
                    flexShrink: 0,
                  }}
                />
                <Text size="sm">{option.label}</Text>
              </Group>
            );
          })}
        </Stack>
        {statusError && (
          <Text size="xs" c="red" style={{ marginTop: -4 }}>
            At least one status must be selected
          </Text>
        )}
      </Stack>

      <Divider />

      {/* Class Filters */}
      <Stack gap="xs">
        <Text size="sm" fw={600}>
          Classes
        </Text>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={orderedItems} strategy={verticalListSortingStrategy}>
            <Stack gap="xs">
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
      </Stack>
    </Stack>
  );
}
