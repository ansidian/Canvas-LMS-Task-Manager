import {
  Stack,
  Title,
  Text,
  Paper,
  Group,
  Badge,
  ScrollArea,
} from "@mantine/core";
import dayjs from "dayjs";

export default function PendingSidebar({ items, onItemClick, removingId }) {
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
    <Stack style={{ height: '100%', overflow: 'hidden' }} gap="xs" p="md">
      <Title order={5}>Pending Items ({items.length})</Title>
      <ScrollArea style={{ flex: 1 }}>
        <Stack gap="sm">
          {items.map((item) => (
            <Paper
              key={item.canvas_id}
              p="sm"
              withBorder
              style={{ cursor: "pointer" }}
              onClick={() => onItemClick(item)}
              className={`pending-item-card ${
                removingId === item.canvas_id ? "fade-out-item" : ""
              }`}
            >
              <Stack gap="xs">
                <Text size="sm" fw={500} lineClamp={2}>
                  {item.title}
                </Text>
                <Group justify="space-between">
                  <Badge size="sm" variant="light">
                    {item.course_name}
                  </Badge>
                  <Text size="xs" c="dimmed">
                    {dayjs(item.due_date).format("MMM D")}
                  </Text>
                </Group>
              </Stack>
            </Paper>
          ))}
        </Stack>
      </ScrollArea>
    </Stack>
  );
}
