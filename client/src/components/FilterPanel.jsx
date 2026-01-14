import { useState } from 'react';
import {
  Stack,
  Text,
  Checkbox,
  Divider,
  Group,
  Box,
} from '@mantine/core';

const STATUS_COLORS = {
  incomplete: '#868e96',
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
  const classOptions = [
    ...classes.map((cls) => ({
      value: String(cls.id),
      label: cls.name,
      color: cls.color,
    })),
    {
      value: 'unassigned',
      label: 'Unassigned',
      color: '#868e96',
    },
  ];

  return (
    <Stack gap="md" p="md">
      {/* Status Filters */}
      <Stack gap="xs">
        <Text size="sm" fw={600}>
          Status
        </Text>
        <Checkbox.Group value={statusFilters} onChange={handleStatusChange}>
          <Stack gap="xs">
            <Checkbox
              value="incomplete"
              label={
                <Group gap="xs" wrap="nowrap">
                  <Box
                    style={{
                      width: 12,
                      height: 12,
                      backgroundColor: STATUS_COLORS.incomplete,
                      borderRadius: '50%',
                      flexShrink: 0,
                    }}
                  />
                  <Text size="sm">Incomplete</Text>
                </Group>
              }
              styles={{
                label: { cursor: 'pointer' },
              }}
            />
            <Checkbox
              value="in_progress"
              label={
                <Group gap="xs" wrap="nowrap">
                  <Box
                    style={{
                      width: 12,
                      height: 12,
                      backgroundColor: STATUS_COLORS.in_progress,
                      borderRadius: '50%',
                      flexShrink: 0,
                    }}
                  />
                  <Text size="sm">In Progress</Text>
                </Group>
              }
              styles={{
                label: { cursor: 'pointer' },
              }}
            />
            <Checkbox
              value="complete"
              label={
                <Group gap="xs" wrap="nowrap">
                  <Box
                    style={{
                      width: 12,
                      height: 12,
                      backgroundColor: STATUS_COLORS.complete,
                      borderRadius: '50%',
                      flexShrink: 0,
                    }}
                  />
                  <Text size="sm">Complete</Text>
                </Group>
              }
              styles={{
                label: { cursor: 'pointer' },
              }}
            />
          </Stack>
        </Checkbox.Group>
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
        <Checkbox.Group value={classFilters} onChange={handleClassChange}>
          <Stack gap="xs">
            {classOptions.map((option) => (
              <Checkbox
                key={option.value}
                value={option.value}
                label={
                  <Group gap="xs" wrap="nowrap">
                    <Box
                      style={{
                        width: 12,
                        height: 12,
                        backgroundColor: option.color,
                        borderRadius: 2,
                        flexShrink: 0,
                      }}
                    />
                    <Text size="sm">{option.label}</Text>
                  </Group>
                }
                styles={{
                  input: {
                    borderRadius: 2,
                    cursor: 'pointer',
                  },
                  label: {
                    cursor: 'pointer',
                  },
                }}
              />
            ))}
          </Stack>
        </Checkbox.Group>
        {classError && (
          <Text size="xs" c="red" style={{ marginTop: -4 }}>
            At least one class must be selected
          </Text>
        )}
      </Stack>
    </Stack>
  );
}
