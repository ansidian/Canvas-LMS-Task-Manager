import { useState, useEffect, useRef, useMemo } from "react";
import {
  Stack,
  TextInput,
  Select,
  Button,
  Group,
  Box,
  Text,
  SegmentedControl,
  Badge,
} from "@mantine/core";
import { DateTimePicker } from "@mantine/dates";
import {
  IconCalendar,
  IconFileText,
  IconLink,
  IconTag,
  IconChecklist,
  IconFlag,
  IconSparkles,
  IconX,
} from "@tabler/icons-react";
import dayjs from "dayjs";
import { toLocalDate, toUTCString } from "../utils/datetime";
import { parseNLPInput } from "../utils/parse-nlp-date";
import { notifyError, notifySuccess } from "../utils/notify.jsx";
import NotesTextarea from "./NotesTextarea";
import BottomSheet from "./BottomSheet";
import { motion, useAnimation, AnimatePresence } from "framer-motion";
import { EVENT_TYPES, EVENT_TYPE_ICONS } from "./event-modal/constants";

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

const TODOIST_PRIORITIES = [
  { value: "1", label: "P4" },
  { value: "2", label: "P3" },
  { value: "3", label: "P2" },
  { value: "4", label: "P1" },
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
  api,
}) {
  const titleRef = useRef(null);
  const shakeControls = useAnimation();
  const initialFormDataRef = useRef(null);
  const [hasUserEdited, setHasUserEdited] = useState(false);
  const [todoistSubmitting, setTodoistSubmitting] = useState(false);
  const [todoistPriority, setTodoistPriority] = useState("1");
  const [nlpResult, setNlpResult] = useState(null);
  const [appliedNlp, setAppliedNlp] = useState(null);
  const nlpAppliedRef = useRef(false);
  const nlpDismissedRef = useRef(false);
  const [formData, setFormData] = useState({
    title: "",
    dueDate: null,
    classId: null,
    eventType: "assignment",
    notes: "",
    url: "",
  });

  const isTodoistMode = formData.title.startsWith("!");

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

  // NLP parsing for both Todoist mode and normal mode
  useEffect(() => {
    if (!formData.title.trim()) {
      setNlpResult(null);
      return;
    }
    const timer = setTimeout(() => {
      const result = parseNLPInput(formData.title, formData.dueDate || new Date());
      setNlpResult(result);

      // Auto-apply in normal mode (skip if already applied or dismissed)
      if (!isTodoistMode && result.date && result.dateText && !nlpDismissedRef.current && !nlpAppliedRef.current) {
        nlpAppliedRef.current = true;
        setAppliedNlp({
          originalDueDate: formData.dueDate,
          dateText: result.dateText,
          appliedDate: result.date,
          hasTime: result.hasTime,
        });
        setFormData((f) => ({
          ...f,
          dueDate: result.date,
        }));
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [formData.title, formData.dueDate, isTodoistMode]);

  // Reset state when modal closes
  useEffect(() => {
    if (!opened) {
      setTodoistPriority("1");
      setTodoistSubmitting(false);
      setNlpResult(null);
      setAppliedNlp(null);
      nlpAppliedRef.current = false;
      nlpDismissedRef.current = false;
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

  const handleSubmit = async () => {
    if (!formData.title.trim()) return;

    if (isTodoistMode) {
      await handleTodoistSubmit();
      return;
    }

    onCreate({
      title: formData.title.trim(),
      due_date: toUTCString(formData.dueDate),
      class_id: formData.classId || null,
      event_type: formData.eventType,
      notes: formData.notes,
      url: formData.url,
    });
  };

  const handleTodoistSubmit = async () => {
    if (!nlpResult?.title) return;
    if (!api) return;

    setTodoistSubmitting(true);
    try {
      // Resolve the due date: NLP-parsed date > calendar date
      const resolvedDate = nlpResult.date || formData.dueDate;
      const hasTime = nlpResult.hasTime;

      // Build Todoist due fields — send resolved date directly
      // instead of due_string to avoid Todoist re-interpreting relative dates
      const todoistDue = {};
      if (resolvedDate) {
        if (hasTime) {
          todoistDue.due_datetime = dayjs(resolvedDate).format("YYYY-MM-DDTHH:mm:ss");
        } else {
          todoistDue.due_date = dayjs(resolvedDate).format("YYYY-MM-DD");
        }
      }

      // Create task in Todoist
      const todoistTask = await api("/todoist/tasks", {
        method: "POST",
        body: JSON.stringify({
          content: nlpResult.title,
          ...todoistDue,
          priority: parseInt(todoistPriority, 10),
        }),
      });

      // Find the Todoist class for local event
      const todoistClass = classes.find(
        (c) => c.canvas_course_id === "todoist",
      );

      // Use resolved date for local event, fall back to Todoist response
      const dueDate = resolvedDate
        ? (hasTime ? dayjs(resolvedDate).format("YYYY-MM-DDTHH:mm:ss") : dayjs(resolvedDate).format("YYYY-MM-DD"))
        : todoistTask.due?.date || toUTCString(date);

      // Create local event linked to Todoist
      onCreate({
        title: nlpResult.title,
        due_date: dueDate,
        class_id: todoistClass?.id || null,
        event_type: "assignment",
        todoist_id: String(todoistTask.id),
        url: `https://app.todoist.com/app/task/${todoistTask.id}`,
      });

      notifySuccess(`Todoist task "${nlpResult.title}" created`);
    } catch (err) {
      console.error("Failed to create Todoist task:", err);
      notifyError(err.message || "Failed to create Todoist task.");
    } finally {
      setTodoistSubmitting(false);
    }
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

  const handleDismissNlpDate = () => {
    if (!appliedNlp) return;
    setFormData((f) => ({
      ...f,
      dueDate: appliedNlp.originalDueDate,
    }));
    nlpDismissedRef.current = true;
    setAppliedNlp(null);
  };

  const todoistSubmitDisabled =
    isTodoistMode && (!nlpResult?.title || todoistSubmitting);

  return (
    <BottomSheet
      opened={opened}
      onClose={handleAttemptClose}
      title={isTodoistMode ? "Create Todoist Task" : "Create Event"}
      size="md"
    >
      <motion.div animate={shakeControls}>
        <Stack gap="md">
          {/* Title - always visible */}
          <TextInput
            ref={titleRef}
            label={
              <Group gap={6} mb={2}>
                {isTodoistMode && (
                  <IconChecklist size={14} color="#e44332" />
                )}
                <Text size="sm" fw={600}>
                  {isTodoistMode ? "Quick Add" : "Title"}
                </Text>
                {isTodoistMode && (
                  <Badge size="xs" color="red" variant="light">Todoist</Badge>
                )}
              </Group>
            }
            placeholder={
              isTodoistMode
                ? "!buy groceries tomorrow 5pm"
                : "Event title"
            }
            value={formData.title}
            onChange={(e) => {
              nlpDismissedRef.current = false;
              nlpAppliedRef.current = false;
              setAppliedNlp(null);
              setFormData((f) => ({ ...f, title: e.target.value }));
              markUserEdited();
            }}
            required
            data-autofocus
            styles={{
              input: {
                fontSize: "1rem",
                fontWeight: 500,
                ...(isTodoistMode && {
                  borderColor: "var(--mantine-color-red-4)",
                }),
              },
            }}
          />

          <AnimatePresence mode="wait">
            {isTodoistMode ? (
              <motion.div
                key="todoist-mode"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
              >
                <Stack gap="md">
                  {/* NLP Preview */}
                  <SectionCard accent="#e44332">
                    <Stack gap={6}>
                      <Text size="xs" fw={600} c="dimmed" tt="uppercase">
                        Parsed Result
                      </Text>
                      <Group gap="xs" align="baseline">
                        <Text size="sm" c="dimmed" w={40}>Title</Text>
                        <Text size="sm" fw={500}>
                          {nlpResult?.title || (
                            <Text span c="dimmed" fs="italic">
                              Type a task...
                            </Text>
                          )}
                        </Text>
                      </Group>
                      <Group gap="xs" align="baseline">
                        <Text size="sm" c="dimmed" w={40}>Due</Text>
                        {nlpResult?.date ? (
                          <Text size="sm" fw={500} c="green">
                            {dayjs(nlpResult.date).format(
                              nlpResult.hasTime
                                ? "ddd, MMM D, YYYY [at] h:mm A"
                                : "ddd, MMM D, YYYY",
                            )}
                          </Text>
                        ) : (
                          <Text size="sm" c="dimmed" fs="italic">
                            No date detected
                          </Text>
                        )}
                      </Group>
                    </Stack>
                  </SectionCard>

                  {/* Priority */}
                  <SectionCard>
                    <Stack gap={6}>
                      <Group gap={6} mb={2}>
                        <IconFlag size={14} style={{ opacity: 0.5 }} />
                        <Text size="sm" fw={600} c="dimmed">
                          Priority
                        </Text>
                      </Group>
                      <SegmentedControl
                        value={todoistPriority}
                        onChange={setTodoistPriority}
                        data={TODOIST_PRIORITIES}
                        size="xs"
                      />
                    </Stack>
                  </SectionCard>
                </Stack>
              </motion.div>
            ) : (
              <motion.div
                key="normal-mode"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
              >
                <Stack gap="md">
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
                    <AnimatePresence>
                      {appliedNlp && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.15 }}
                        >
                          <Group
                            gap={6}
                            mt={8}
                            style={{ cursor: "pointer" }}
                            onClick={handleDismissNlpDate}
                          >
                            <IconSparkles size={14} color="var(--mantine-color-violet-5)" />
                            <Text size="xs" c="dimmed">
                              <Text span c="violet" fw={500}>
                                &ldquo;{appliedNlp.dateText}&rdquo;
                              </Text>
                              {" → "}
                              <Text span fw={500}>
                                {dayjs(appliedNlp.appliedDate).format(
                                  appliedNlp.hasTime
                                    ? "ddd, MMM D [at] h:mm A"
                                    : "ddd, MMM D, YYYY",
                                )}
                              </Text>
                            </Text>
                            <IconX size={14} color="var(--mantine-color-dimmed)" />
                          </Group>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </SectionCard>

                  {/* Classification Section */}
                  <SectionCard
                    accent={
                      formData.classId
                        ? classes.find((c) => String(c.id) === formData.classId)?.color
                        : unassignedColor
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
                        placeholder="Select a class"
                        data={[
                          { value: "", label: "Unassigned" },
                          ...classes
                            .filter((c) => !c.canvas_course_id || c.is_synced)
                            .map((c) => ({ value: String(c.id), label: c.name })),
                        ]}
                        value={formData.classId || ""}
                        onChange={(v) => {
                          setFormData((f) => ({ ...f, classId: v || null }));
                          markUserEdited();
                        }}
                        searchable
                        allowDeselect={false}
                        selectFirstOptionOnChange
                        renderOption={({ option }) => {
                          const cls = classes.find(
                            (c) => String(c.id) === option.value,
                          );
                          return (
                            <Group gap="xs" wrap="nowrap">
                              <Box
                                style={{
                                  width: 10,
                                  height: 10,
                                  backgroundColor: cls?.color || unassignedColor,
                                  borderRadius: 2,
                                  flexShrink: 0,
                                }}
                              />
                              <Text size="sm">{option.label}</Text>
                            </Group>
                          );
                        }}
                        leftSection={
                          <Box
                            style={{
                              width: 10,
                              height: 10,
                              backgroundColor: formData.classId
                                ? classes.find((c) => String(c.id) === formData.classId)
                                    ?.color
                                : unassignedColor,
                              borderRadius: 2,
                              flexShrink: 0,
                            }}
                          />
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
                        searchable
                        selectFirstOptionOnChange
                        allowDeselect={false}
                        renderOption={({ option }) => {
                          const Icon = EVENT_TYPE_ICONS[option.value] || IconFileText;
                          return (
                            <Group gap="xs" wrap="nowrap">
                              <Icon size={16} style={{ opacity: 0.7, flexShrink: 0 }} />
                              <Text size="sm">{option.label}</Text>
                            </Group>
                          );
                        }}
                        leftSection={(() => {
                          const Icon =
                            EVENT_TYPE_ICONS[formData.eventType] || IconFileText;
                          return <Icon size={16} style={{ opacity: 0.7 }} />;
                        })()}
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
                </Stack>
              </motion.div>
            )}
          </AnimatePresence>

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
              <Button
                onClick={handleSubmit}
                disabled={
                  isTodoistMode
                    ? todoistSubmitDisabled
                    : !formData.title.trim()
                }
                loading={todoistSubmitting}
                color={isTodoistMode ? "red" : undefined}
                leftSection={isTodoistMode ? <IconChecklist size={16} /> : undefined}
              >
                {isTodoistMode ? "Create Todoist Task" : "Create Event"}
              </Button>
            </Group>
          </Box>
        </Stack>
      </motion.div>
    </BottomSheet>
  );
}
