import { Stack, Title, Text, Paper, Group, ActionIcon, Badge, ScrollArea } from '@mantine/core';
import { IconCheck, IconX } from '@tabler/icons-react';
import dayjs from 'dayjs';

export default function PendingSidebar({ items, onApprove, onReject }) {
  if (items.length === 0) {
    return (
      <Stack>
        <Title order={5}>Pending Items</Title>
        <Text c="dimmed" size="sm">
          No pending assignments. Click the refresh button to fetch from Canvas.
        </Text>
      </Stack>
    );
  }

  return (
    <Stack>
      <Title order={5}>Pending Items ({items.length})</Title>
      <ScrollArea h="calc(100vh - 140px)">
        <Stack gap="sm">
          {items.map((item) => (
            <Paper key={item.canvas_id} p="sm" withBorder>
              <Stack gap="xs">
                <Text size="sm" fw={500} lineClamp={2}>
                  {item.title}
                </Text>
                <Group justify="space-between">
                  <Badge size="sm" variant="light">
                    {item.course_name}
                  </Badge>
                  <Text size="xs" c="dimmed">
                    {dayjs(item.due_date).format('MMM D')}
                  </Text>
                </Group>
                <Group justify="flex-end" gap="xs">
                  <ActionIcon
                    variant="light"
                    color="red"
                    onClick={() => onReject(item)}
                    title="Reject"
                  >
                    <IconX size={16} />
                  </ActionIcon>
                  <ActionIcon
                    variant="filled"
                    color="green"
                    onClick={() => onApprove(item)}
                    title="Approve"
                  >
                    <IconCheck size={16} />
                  </ActionIcon>
                </Group>
              </Stack>
            </Paper>
          ))}
        </Stack>
      </ScrollArea>
    </Stack>
  );
}
