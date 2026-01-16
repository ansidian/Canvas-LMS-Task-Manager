import { useState, useEffect, useRef } from "react";
import {
  Modal,
  Stack,
  TextInput,
  Select,
  Textarea,
  Button,
  Group,
  Box,
  Text,
} from "@mantine/core";
import { DateTimePicker } from "@mantine/dates";
import dayjs from "dayjs";
import { toUTCString } from "../utils/datetime";

const EVENT_TYPES = [
  { value: "assignment", label: "Assignment" },
  { value: "quiz", label: "Quiz" },
  { value: "exam", label: "Exam" },
  { value: "homework", label: "Homework" },
  { value: "lab", label: "Lab" },
];

export default function CreateEventModal({
  opened,
  onClose,
  date,
  classes,
  onCreate,
}) {
  const titleRef = useRef(null);
  const [formData, setFormData] = useState({
    title: "",
    dueDate: null,
    classId: null,
    eventType: "assignment",
    notes: "",
    url: "",
  });

  useEffect(() => {
    if (date) {
      setFormData({
        title: "",
        dueDate: new Date(date + "T00:00:00"),
        classId: null,
        eventType: "assignment",
        notes: "",
        url: "",
      });
    }
  }, [date]);

  // Focus title input when modal opens
  useEffect(() => {
    if (opened && titleRef.current) {
      setTimeout(() => {
        titleRef.current?.focus();
      }, 100);
    }
  }, [opened]);

  const handleSubmit = () => {
    if (!formData.title.trim()) return;

    onCreate({
      title: formData.title.trim(),
      due_date: toUTCString(formData.dueDate),
      class_id: formData.classId ? parseInt(formData.classId) : null,
      event_type: formData.eventType,
      notes: formData.notes,
      url: formData.url,
    });
  };

  return (
    <Modal opened={opened} onClose={onClose} title="Create Event" size="md">
      <Stack>
        <TextInput
          ref={titleRef}
          label="Title"
          placeholder="Event title"
          value={formData.title}
          onChange={(e) =>
            setFormData((f) => ({ ...f, title: e.target.value }))
          }
          required
          data-autofocus
        />

        <DateTimePicker
          label="Due Date & Time"
          placeholder="Pick date and optionally time"
          value={formData.dueDate}
          onChange={(v) => setFormData((f) => ({ ...f, dueDate: v }))}
          clearable={false}
          firstDayOfWeek={0}
          valueFormat="MMM DD, YYYY hh:mm A"
          timePickerProps={{
            popoverProps: { withinPortal: false },
            format: "12h",
          }}
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
        />

        <Select
          label="Class"
          placeholder="Select a class (optional)"
          data={classes
            .filter((c) => !c.canvas_course_id || c.is_synced)
            .map((c) => ({ value: String(c.id), label: c.name }))}
          value={formData.classId}
          onChange={(v) => setFormData((f) => ({ ...f, classId: v }))}
          clearable
          renderOption={({ option }) => {
            const cls = classes.find((c) => String(c.id) === option.value);
            return (
              <Group gap="xs" wrap="nowrap">
                <Box
                  style={{
                    width: 12,
                    height: 12,
                    backgroundColor: cls?.color || "#a78b71",
                    borderRadius: 2,
                    flexShrink: 0,
                  }}
                />
                <Text size="sm">{option.label}</Text>
              </Group>
            );
          }}
          leftSection={
            formData.classId ? (
              <Box
                style={{
                  width: 12,
                  height: 12,
                  backgroundColor:
                    classes.find((c) => String(c.id) === formData.classId)
                      ?.color || "#a78b71",
                  borderRadius: 2,
                  flexShrink: 0,
                }}
              />
            ) : null
          }
        />

        <Select
          label="Event Type"
          data={EVENT_TYPES}
          value={formData.eventType}
          onChange={(v) => setFormData((f) => ({ ...f, eventType: v }))}
        />

        <TextInput
          label="URL"
          placeholder="Link (optional)"
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

        <Group justify="flex-end">
          <Button variant="subtle" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!formData.title.trim()}>
            Create Event
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
