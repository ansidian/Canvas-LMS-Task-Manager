import { useState, useEffect, useRef, useMemo } from "react";
import {
  Modal,
  Stack,
  TextInput,
  Select,
  Button,
  Group,
  Box,
  Text,
} from "@mantine/core";
import { DateTimePicker } from "@mantine/dates";
import dayjs from "dayjs";
import { toUTCString } from "../utils/datetime";
import NotesTextarea from "./NotesTextarea";
import { motion, useAnimation } from "framer-motion";

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
  events,
  unassignedColor,
  onCreate,
  onOpenEvent,
}) {
  const titleRef = useRef(null);
  const shakeControls = useAnimation();
  const initialFormDataRef = useRef(null);
  const [hasUserEdited, setHasUserEdited] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    dueDate: null,
    classId: null,
    eventType: "assignment",
    notes: "",
    url: "",
  });

  useEffect(() => {
    if (!opened) return;
    const nextFormData = {
      title: "",
      dueDate: date ? new Date(date + "T00:00:00") : null,
      classId: null,
      eventType: "assignment",
      notes: "",
      url: "",
    };
    setFormData(nextFormData);
    initialFormDataRef.current = nextFormData;
    setHasUserEdited(false);
  }, [date, opened]);

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

  const isDirty = useMemo(() => {
    const initial = initialFormDataRef.current;
    if (!initial) return false;
    const sameDueDate =
      initial.dueDate === formData.dueDate ||
      (initial.dueDate &&
        formData.dueDate &&
        initial.dueDate.getTime() === formData.dueDate.getTime());
    return (
      formData.title !== initial.title ||
      !sameDueDate ||
      formData.classId !== initial.classId ||
      formData.eventType !== initial.eventType ||
      formData.notes !== initial.notes ||
      formData.url !== initial.url
    );
  }, [formData]);
  const shouldBlockClose = hasUserEdited && isDirty;

  const triggerDirtyShake = () => {
    shakeControls.start({
      x: [0, -8, 8, -6, 6, 0],
      transition: { duration: 0.35 },
    });
  };

  const handleAttemptClose = () => {
    if (shouldBlockClose) {
      triggerDirtyShake();
      return;
    }
    onClose();
  };
  const handleOpenMentionEvent = (eventItem) => {
    if (shouldBlockClose) {
      triggerDirtyShake();
      return;
    }
    onOpenEvent?.(eventItem);
  };

  const handleDiscard = () => {
    onClose();
  };
  const markUserEdited = () => {
    setHasUserEdited(true);
  };

  return (
    <Modal
      opened={opened}
      onClose={handleAttemptClose}
      title="Create Event"
      size="md"
    >
      <motion.div animate={shakeControls}>
        <Stack>
        <TextInput
          ref={titleRef}
          label="Title"
          placeholder="Event title"
          value={formData.title}
          onChange={(e) => {
            setFormData((f) => ({ ...f, title: e.target.value }));
            markUserEdited();
          }}
          required
          data-autofocus
        />

        <DateTimePicker
          label="Due Date & Time"
          placeholder="Pick date and optionally time"
          value={formData.dueDate}
          onChange={(v) => {
            setFormData((f) => ({ ...f, dueDate: v }));
            markUserEdited();
          }}
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
          onChange={(v) => {
            setFormData((f) => ({ ...f, classId: v }));
            markUserEdited();
          }}
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
          onChange={(v) => {
            setFormData((f) => ({ ...f, eventType: v }));
            markUserEdited();
          }}
        />

        <TextInput
          label="URL"
          placeholder="Link (optional)"
          value={formData.url}
          onChange={(e) => {
            setFormData((f) => ({ ...f, url: e.target.value }));
            markUserEdited();
          }}
        />

        <NotesTextarea
          label="Notes"
          placeholder="Add any notes..."
          value={formData.notes}
          onChange={(nextValue) => {
            setFormData((f) => ({ ...f, notes: nextValue }));
          }}
          onUserEdit={markUserEdited}
          events={events}
          classes={classes}
          unassignedColor={unassignedColor}
          onOpenEvent={handleOpenMentionEvent}
        />

        <Group justify="flex-end">
          <Button variant="subtle" onClick={handleDiscard}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!formData.title.trim()}>
            Create Event
          </Button>
        </Group>
        </Stack>
      </motion.div>
    </Modal>
  );
}
