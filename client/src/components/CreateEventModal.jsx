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
import {
  IconCalendar,
  IconFileText,
  IconLink,
  IconTag,
} from "@tabler/icons-react";
import dayjs from "dayjs";
import { toLocalDate, toUTCString } from "../utils/datetime";
import NotesTextarea from "./NotesTextarea";
import { motion, useAnimation } from "framer-motion";

const EVENT_TYPES = [
  { value: "assignment", label: "Assignment" },
  { value: "quiz", label: "Quiz" },
  { value: "exam", label: "Exam" },
  { value: "homework", label: "Homework" },
  { value: "lab", label: "Lab" },
];

// Subtle section card for visual grouping
function SectionCard({ children, accent = null }) {
  return (
    <Box
      style={{
        background: "var(--parchment)",
        borderRadius: 8,
        padding: "14px 16px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {accent && (
        <Box
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            width: 3,
            backgroundColor: accent,
            borderRadius: "8px 0 0 8px",
          }}
        />
      )}
      {children}
    </Box>
  );
}

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
      dueDate: toLocalDate(date),
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

  // Handle Mod+Enter to submit
  useEffect(() => {
    if (!opened) return;

    const handleKeyDown = (e) => {
      // Require Cmd/Ctrl + Enter
      if (e.key !== "Enter" || !(e.metaKey || e.ctrlKey)) return;

      // Only submit if title is filled
      if (!formData.title.trim()) return;

      e.preventDefault();
      handleSubmit();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [opened, formData]);

  const handleSubmit = () => {
    if (!formData.title.trim()) return;

    onCreate({
      title: formData.title.trim(),
      due_date: toUTCString(formData.dueDate),
      class_id: formData.classId || null,
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
      (initial.dueDate instanceof Date &&
        formData.dueDate instanceof Date &&
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
        <Stack gap="md">
          {/* Title - Prominent, standalone */}
          <TextInput
            ref={titleRef}
            label={
              <Text size="sm" fw={600} mb={2}>
                Title
              </Text>
            }
            placeholder="Event title"
            value={formData.title}
            onChange={(e) => {
              setFormData((f) => ({ ...f, title: e.target.value }));
              markUserEdited();
            }}
            required
            data-autofocus
            styles={{
              input: {
                fontSize: "1rem",
                fontWeight: 500,
              },
            }}
          />

          {/* Scheduling Section */}
          <SectionCard>
            <DateTimePicker
              label={
                <Group gap={6} align="center" mb={2}>
                  <IconCalendar size={14} style={{ opacity: 0.5 }} />
                  <Text size="sm" fw={600} c="dimmed">
                    Due Date & Time
                  </Text>
                </Group>
              }
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
              ].map((preset) => ({
                ...preset,
                value: (() => {
                  // Preserve current time when using presets
                  const currentTime = formData.dueDate
                    ? dayjs(formData.dueDate)
                    : dayjs().hour(23).minute(59);
                  const newDate = dayjs(preset.value)
                    .hour(currentTime.hour())
                    .minute(currentTime.minute())
                    .second(currentTime.second());
                  return newDate.toDate();
                })(),
              }))}
            />
          </SectionCard>

          {/* Classification Section */}
          <SectionCard
            accent={
              formData.classId
                ? classes.find((c) => String(c.id) === formData.classId)?.color
                : null
            }
          >
            <Stack gap="md">
              <Select
                label={
                  <Group gap={6} mb={2}>
                    <IconTag size={14} style={{ opacity: 0.5 }} />
                    <Text size="sm" fw={600} c="dimmed">
                      Class
                    </Text>
                  </Group>
                }
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
                          width: 10,
                          height: 10,
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
                        width: 10,
                        height: 10,
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
                label={
                  <Group gap={6} mb={2}>
                    <IconFileText size={14} style={{ opacity: 0.5 }} />
                    <Text size="sm" fw={600} c="dimmed">
                      Event Type
                    </Text>
                  </Group>
                }
                data={EVENT_TYPES}
                value={formData.eventType}
                onChange={(v) => {
                  setFormData((f) => ({ ...f, eventType: v }));
                  markUserEdited();
                }}
              />
            </Stack>
          </SectionCard>

          {/* URL Section */}
          <SectionCard>
            <Box>
              <Group gap={6} mb={4}>
                <IconLink size={14} style={{ opacity: 0.5 }} />
                <Text size="sm" fw={600} c="dimmed">
                  URL
                </Text>
              </Group>
              <TextInput
                placeholder="Link (optional)"
                value={formData.url}
                onChange={(e) => {
                  setFormData((f) => ({ ...f, url: e.target.value }));
                  markUserEdited();
                }}
                size="sm"
              />
            </Box>
          </SectionCard>

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

          {/* Footer */}
          <Box
            style={{
              borderTop: "1px solid var(--rule)",
              paddingTop: 16,
              marginTop: 4,
            }}
          >
            <Group justify="flex-end" gap={12}>
              <Button variant="subtle" onClick={handleDiscard} color="gray">
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={!formData.title.trim()}>
                Create Event
              </Button>
            </Group>
          </Box>
        </Stack>
      </motion.div>
    </Modal>
  );
}
