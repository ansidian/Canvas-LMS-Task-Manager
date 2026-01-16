import { useState } from 'react';
import { Stack, Text, Divider, Group, Box } from '@mantine/core';

const STATUS_COLORS = {
  incomplete: '#94a3b8',
  in_progress: '#7950f2',
  complete: '#40c057',
};

export default function FilterPanel({
  statusFilters,
  onStatusFiltersChange,
  classFilters,
  onClassFiltersChange,
  classes,
}) {
  const [statusError, setStatusError] = useState(false);
  const [classError, setClassError] = useState(false);

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
    // Require at least one class to be selected
    if (values.length > 0) {
      onClassFiltersChange(values);
      setClassError(false);
    } else {
      setClassError(true);
      setTimeout(() => setClassError(false), 2000);
    }
  };

  // Build class options including "Unassigned"
  // Hide classes that are linked to Canvas but have sync disabled
  const syncedClasses = classes.filter(
    (cls) => !cls.canvas_course_id || cls.is_synced
  );
  const classOptions = [
    ...syncedClasses.map((cls) => ({
      value: String(cls.id),
      label: cls.name,
      color: cls.color,
    })),
    {
      value: 'unassigned',
      label: 'Unassigned',
      color: '#a78b71',
    },
  ];

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
        <Stack gap="xs">
          {classOptions.map((option) => {
            const isChecked = classFilters.includes(option.value);
            return (
              <Group
                key={option.value}
                gap="xs"
                wrap="nowrap"
                style={{ cursor: 'pointer' }}
                onClick={() => {
                  const newFilters = isChecked
                    ? classFilters.filter((v) => v !== option.value)
                    : [...classFilters, option.value];
                  handleClassChange(newFilters);
                }}
              >
                <Box
                  style={{
                    width: 12,
                    height: 12,
                    backgroundColor: isChecked ? option.color : 'transparent',
                    border: `2px solid ${option.color}`,
                    borderRadius: 2,
                    flexShrink: 0,
                  }}
                />
                <Text size="sm">{option.label}</Text>
              </Group>
            );
          })}
        </Stack>
        {classError && (
          <Text size="xs" c="red" style={{ marginTop: -4 }}>
            At least one class must be selected
          </Text>
        )}
      </Stack>
    </Stack>
  );
}
