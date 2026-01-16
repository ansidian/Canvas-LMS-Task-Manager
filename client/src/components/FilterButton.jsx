import { useState } from 'react';
import {
  ActionIcon,
  Popover,
  Stack,
  Text,
  Checkbox,
  Divider,
  Group,
  Box,
  Tooltip,
} from '@mantine/core';
import { IconFilter } from '@tabler/icons-react';

const STATUS_COLORS = {
  incomplete: '#94a3b8',
  in_progress: '#7950f2',
  complete: '#40c057',
};

export default function FilterButton({
  statusFilters,
  onStatusFiltersChange,
  classFilters,
  onClassFiltersChange,
  classes,
}) {
  const [opened, setOpened] = useState(false);
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
      color: '#a78b71',
    },
  ];

  return (
    <Popover position="bottom" shadow="md" opened={opened} onChange={setOpened}>
      <Popover.Target>
        <Tooltip label="Filter events">
          <ActionIcon
            variant="subtle"
            onClick={() => setOpened((o) => !o)}
            size="lg"
          >
            <IconFilter size={20} />
          </ActionIcon>
        </Tooltip>
      </Popover.Target>

      <Popover.Dropdown>
        <Stack gap="md" style={{ minWidth: 220 }}>
          {/* Status Filters */}
          <Stack gap="xs">
            <Text size="sm" fw={600}>
              Status
            </Text>
            <Checkbox.Group value={statusFilters} onChange={handleStatusChange}>
              <Stack gap="xs">
                <Checkbox
                  value="incomplete"
                  label="Incomplete"
                  styles={{
                    label: { cursor: 'pointer' },
                  }}
                />
                <Checkbox
                  value="in_progress"
                  label="In Progress"
                  styles={{
                    label: { cursor: 'pointer' },
                  }}
                />
                <Checkbox
                  value="complete"
                  label="Complete"
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
      </Popover.Dropdown>
    </Popover>
  );
}
