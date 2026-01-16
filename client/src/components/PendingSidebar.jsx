import {
  Stack,
  Title,
  Text,
  Paper,
  Group,
  Badge,
  ScrollArea,
} from "@mantine/core";
import { motion, AnimatePresence } from "framer-motion";
import dayjs from "dayjs";

export default function PendingSidebar({ items, onItemClick }) {
  if (items.length === 0) {
    return (
      <Stack p="md">
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
        <motion.div
          initial="hidden"
          animate="visible"
          variants={{
            visible: {
              transition: {
                staggerChildren: 0.05,
              },
            },
          }}
        >
          <Stack gap="sm">
            <AnimatePresence initial={false}>
              {items.map((item) => (
                <motion.div
                  key={item.canvas_id}
                  variants={{
                    hidden: { opacity: 0, x: -20 },
                    visible: { opacity: 1, x: 0 },
                  }}
                  exit={{ opacity: 0, x: 20, transition: { duration: 0.2 } }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                >
                  <Paper
                    p="sm"
                    withBorder
                    style={{ cursor: "pointer" }}
                    onClick={() => onItemClick(item)}
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
                </motion.div>
              ))}
            </AnimatePresence>
          </Stack>
        </motion.div>
      </ScrollArea>
    </Stack>
  );
}
