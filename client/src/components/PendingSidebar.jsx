import { Stack, Text, Box, Group, ScrollArea } from "@mantine/core";
import { IconInbox, IconCalendarDue } from "@tabler/icons-react";
import { motion, AnimatePresence } from "framer-motion";
import dayjs from "dayjs";

// Fallback color for unmatched courses
const FALLBACK_COLOR = "#a78b71";

function PendingItemCard({ item, onClick, classes }) {
  // Find matching class by course name (case-insensitive)
  const matchingClass = classes?.find(
    (c) => c.name.toLowerCase() === item.course_name?.toLowerCase()
  );
  const courseColor = matchingClass?.color || FALLBACK_COLOR;
  const dueDate = dayjs(item.due_date);
  const isOverdue = dueDate.isBefore(dayjs(), "day");
  const isToday = dueDate.isSame(dayjs(), "day");
  const isTomorrow = dueDate.isSame(dayjs().add(1, "day"), "day");

  let dateLabel = dueDate.format("MMM D");
  if (isToday) dateLabel = "Today";
  else if (isTomorrow) dateLabel = "Tomorrow";

  return (
    <Box
      className="pending-item"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onClick();
        }
      }}
      style={{
        cursor: "pointer",
        background: "var(--card)",
        borderRadius: 8,
        border: "1px solid var(--rule)",
        position: "relative",
        overflow: "hidden",
        transition: "transform 150ms ease, box-shadow 150ms ease, border-color 150ms ease",
      }}
    >
      {/* Course color tab */}
      <Box
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width: 4,
          backgroundColor: courseColor,
        }}
      />

      <Box style={{ padding: "12px 14px 12px 16px" }}>
        <Text
          size="sm"
          fw={500}
          lineClamp={2}
          style={{ lineHeight: 1.4 }}
        >
          {item.title}
        </Text>

        <Group justify="space-between" mt={8} gap="xs">
          <Text
            size="xs"
            c="dimmed"
            style={{
              maxWidth: "60%",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {item.course_name}
          </Text>
          <Group gap={4}>
            <IconCalendarDue
              size={12}
              style={{
                opacity: 0.5,
                color: isOverdue ? "var(--overdue)" : undefined,
              }}
            />
            <Text
              size="xs"
              fw={isToday || isTomorrow ? 600 : 400}
              c={isOverdue ? "red" : isToday ? "blue" : "dimmed"}
            >
              {dateLabel}
            </Text>
          </Group>
        </Group>
      </Box>
    </Box>
  );
}

export default function PendingSidebar({ items, onItemClick, classes }) {
  if (items.length === 0) {
    return (
      <Stack p="md" align="center" justify="center" style={{ height: "100%" }}>
        <Box
          style={{
            padding: 16,
            background: "var(--parchment)",
            borderRadius: 12,
            textAlign: "center",
          }}
        >
          <IconInbox size={32} style={{ opacity: 0.3, marginBottom: 8 }} />
          <Text size="sm" fw={500} mb={4}>
            All Caught Up
          </Text>
          <Text size="xs" c="dimmed">
            No pending items to review
          </Text>
        </Box>
      </Stack>
    );
  }

  return (
    <Stack style={{ height: "100%", overflow: "hidden" }} gap={0}>
      <style>{`
        .pending-item:hover,
        .pending-item:focus-visible {
          transform: translateY(-2px);
          border-color: var(--mantine-color-blue-5);
          box-shadow: 0 10px 20px rgba(34, 139, 230, 0.15);
        }
        .pending-item:active {
          transform: translateY(0);
        }
      `}</style>

      {/* Header */}
      <Box
        style={{
          padding: "14px 16px 12px",
          borderBottom: "1px solid var(--rule-soft)",
        }}
      >
        <Group justify="space-between" align="center">
          <Text size="sm" fw={600}>
            Pending
          </Text>
          <Text
            size="xs"
            fw={500}
            style={{
              background: "var(--ink-blue-light)",
              color: "var(--ink-blue)",
              padding: "2px 8px",
              borderRadius: 10,
            }}
          >
            {items.length}
          </Text>
        </Group>
      </Box>

      {/* Items List */}
      <ScrollArea
        style={{ flex: 1 }}
        viewportProps={{ style: { padding: "12px 12px" } }}
      >
        <Stack gap={8}>
          <AnimatePresence initial={false}>
            {items.map((item) => (
              <motion.div
                key={item._pendingKey || item.canvas_id}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{
                  opacity: 0,
                  x: 16,
                  transition: { duration: 0.15 },
                }}
                transition={{
                  duration: 0.2,
                  ease: "easeOut",
                }}
              >
                <PendingItemCard
                  item={item}
                  onClick={() => onItemClick(item)}
                  classes={classes}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </Stack>
      </ScrollArea>
    </Stack>
  );
}
