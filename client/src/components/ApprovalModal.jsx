import { useState, useEffect } from "react";
import {
  Modal,
  Stack,
  TextInput,
  Select,
  Textarea,
  Button,
  Group,
  Text,
  Badge,
  ActionIcon,
  Box,
} from "@mantine/core";
import { DateTimePicker } from "@mantine/dates";
import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";
import dayjs from "dayjs";
import { parseDueDate, toUTCString } from "../utils/datetime";

const EVENT_TYPES = [
  { value: "assignment", label: "Assignment" },
  { value: "quiz", label: "Quiz" },
  { value: "exam", label: "Exam" },
  { value: "homework", label: "Homework" },
  { value: "lab", label: "Lab" },
];

export default function ApprovalModal({
  opened,
  onClose,
  item,
  classes,
  onApprove,
  onReject,
  pendingCount,
  currentIndex,
  onNavigate,
}) {
  const [formData, setFormData] = useState({
    dueDate: null,
    classId: null,
    eventType: "assignment",
    notes: "",
    url: "",
  });

  useEffect(() => {
    if (item) {
      // Auto-select class if course name matches
      const matchingClass = classes.find(
        (c) => c.name.toLowerCase() === item.course_name?.toLowerCase()
      );

      // Parse the due_date (handles both date-only and datetime)
      const { date } = parseDueDate(item.due_date);

      console.log("[ApprovalModal] Parsing due date:", {
        original: item.due_date,
        parsed: date,
        formatted: date ? dayjs(date).format("YYYY-MM-DD HH:mm:ss") : null,
      });

      setFormData({
        dueDate: date,
        classId: matchingClass ? String(matchingClass.id) : null,
        eventType: "assignment",
        notes: "",
        url: item.url || "",
      });
    }
  }, [item, classes]);

  const handleSubmit = () => {
    // Convert to UTC ISO string (handles both date-only and datetime)
    const dueDate = formData.dueDate
      ? toUTCString(formData.dueDate)
      : item.due_date;

    console.log("[ApprovalModal] Submitting:", {
      formDataDate: formData.dueDate,
      formattedLocal: formData.dueDate
        ? dayjs(formData.dueDate).format("YYYY-MM-DD HH:mm:ss")
        : null,
      convertedUTC: dueDate,
    });

    onApprove(item, {
      ...formData,
      dueDate,
    });
  };

  const canGoPrev = currentIndex > 0;
  const canGoNext = currentIndex < pendingCount - 1;

  if (!item) return null;

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Approve Assignment"
      size="md"
    >
      <Group justify="space-between" align="center" mb="md">
        <ActionIcon
          variant="subtle"
          size="lg"
          onClick={() => onNavigate(-1)}
          disabled={!canGoPrev}
        >
          <IconChevronLeft size={20} />
        </ActionIcon>

        <Badge variant="light" color="blue">
          {currentIndex + 1} of {pendingCount}
        </Badge>

        <ActionIcon
          variant="subtle"
          size="lg"
          onClick={() => onNavigate(1)}
          disabled={!canGoNext}
        >
          <IconChevronRight size={20} />
        </ActionIcon>
      </Group>

      <Stack>
        <Box>
          <Text fw={500}>{item.title}</Text>
          <Text size="sm" c="dimmed">
            Course: {item.course_name}
          </Text>
        </Box>

        <DateTimePicker
          label="Due Date & Time"
          placeholder="Pick date and optionally time"
          value={formData.dueDate}
          onChange={(v) => setFormData((f) => ({ ...f, dueDate: v }))}
          clearable={false}
          firstDayOfWeek={0}
          valueFormat="MMM DD, YYYY hh:mm A"
          presets={[
            {
              value: dayjs().subtract(1, "day").format("YYYY-MM-DD"),
              label: "Yesterday",
            },
            { value: dayjs().format("YYYY-MM-DD"), label: "Today" },
            {
              value: dayjs().add(1, "day").format("YYYY-MM-DD"),
              label: "Tomorrow",
            },
            {
              value: dayjs().add(1, "month").format("YYYY-MM-DD"),
              label: "Next month",
            },
            {
              value: dayjs().add(1, "year").format("YYYY-MM-DD"),
              label: "Next year",
            },
            {
              value: dayjs().subtract(1, "month").format("YYYY-MM-DD"),
              label: "Last month",
            },
          ]}
          timePickerProps={{
            popoverProps: { withinPortal: false },
            format: "12h",
          }}
        />

        <Select
          label="Class"
          placeholder="Select a class"
          data={classes.map((c) => ({ value: String(c.id), label: c.name }))}
          value={formData.classId}
          onChange={(v) => setFormData((f) => ({ ...f, classId: v }))}
          clearable
        />

        <Select
          label="Event Type"
          data={EVENT_TYPES}
          value={formData.eventType}
          onChange={(v) => setFormData((f) => ({ ...f, eventType: v }))}
        />

        <TextInput
          label="URL"
          placeholder="Canvas URL"
          value={formData.url}
          onChange={(e) => setFormData((f) => ({ ...f, url: e.target.value }))}
        />

        <Textarea
          label="Notes"
          placeholder="Add any notes..."
          minRows={3}
          value={formData.notes}
          onChange={(e) =>
            setFormData((f) => ({ ...f, notes: e.target.value }))
          }
        />

        <Group justify="space-between">
          <Button variant="light" color="red" onClick={() => onReject(item)}>
            Reject
          </Button>
          <Group>
            <Button variant="subtle" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSubmit}>Add to Calendar</Button>
          </Group>
        </Group>
      </Stack>
    </Modal>
  );
}
