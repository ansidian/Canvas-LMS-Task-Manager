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
  TagsInput,
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
  IconFolder,
  IconHash,
} from "@tabler/icons-react";
import dayjs from "dayjs";
import { toLocalDate, toUTCString } from "../utils/datetime";
import { parseNLPInput } from "../utils/parse-nlp-date";
import { notifyError, notifySuccess } from "../utils/notify.jsx";
import NotesTextarea from "./NotesTextarea";
import BottomSheet from "./BottomSheet";
import FloatingPanel from "./FloatingPanel";
import useIsMobile from "../hooks/useIsMobile";
import { motion, AnimatePresence } from "framer-motion";
import { EVENT_TYPES, EVENT_TYPE_ICONS, PRIORITY_COLORS } from "./event-modal/constants";
import useTodoistMetadata from "../hooks/useTodoistMetadata";
import TodoistAutocomplete from "./TodoistAutocomplete";
import TodoistDescriptionEditor from "./TodoistDescriptionEditor";
import { todoistColor } from "../utils/todoist-colors";

const isInbox = (p) => p?.is_inbox || p?.name === "Inbox";

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
  initialPrefix = "",
  classes,
  events,
  unassignedColor,
  onCreate,
  onOpenEvent,
  onGhostUpdate,
  api,
  anchorRect = null,
}) {
  const titleRef = useRef(null);
  const initialFormDataRef = useRef(null);
  const [hasUserEdited, setHasUserEdited] = useState(false);
  const [todoistSubmitting, setTodoistSubmitting] = useState(false);
  const [todoistPriority, setTodoistPriority] = useState("1");
  const [todoistProjectId, setTodoistProjectId] = useState(null);
  const [todoistLabels, setTodoistLabels] = useState([]);
  const [todoistDescription, setTodoistDescription] = useState("");
  const { projects: todoistProjects, labels: todoistLabelOptions, fetchMetadata, refreshLabels } = useTodoistMetadata(api);
  const [nlpResult, setNlpResult] = useState(null);
  const [appliedNlp, setAppliedNlp] = useState(null);
  const nlpAppliedRef = useRef(false);
  const nlpDismissedRef = useRef(false);
  const nlpLabelsRef = useRef([]); // tracks labels currently present as @tokens in the title
  const nlpProjectRef = useRef(null); // tracks project name from #token in the title
  const [formData, setFormData] = useState({
    title: "",
    dueDate: null,
    classId: null,
    eventType: "assignment",
    notes: "",
    url: "",
  });

  const isTodoistMode = formData.title.startsWith("!");

  const wasOpenRef = useRef(false);
  const initialDateRef = useRef(null);
  const titleRef2 = useRef("");

  // Keep a ref to current title for the reschedule effect
  useEffect(() => {
    titleRef2.current = formData.title;
  }, [formData.title]);

  // Reset form when modal first opens
  useEffect(() => {
    if (!opened) {
      wasOpenRef.current = false;
      initialDateRef.current = null;
      return;
    }
    if (!wasOpenRef.current) {
      // First open — full reset
      wasOpenRef.current = true;
      initialDateRef.current = date;
      const nextFormData = {
        title: initialPrefix || "",
        dueDate: toLocalDate(date),
        classId: null,
        eventType: "assignment",
        notes: "",
        url: "",
      };
      setFormData(nextFormData);
      initialFormDataRef.current = nextFormData;
      setHasUserEdited(false);
    }
  }, [opened, initialPrefix]);

  // Update only dueDate when date changes while panel is open (click-to-reschedule)
  // Skip on initial open. If title is blank, close instead.
  useEffect(() => {
    if (!opened || !wasOpenRef.current || !date) return;
    if (date === initialDateRef.current) return; // skip initial
    initialDateRef.current = date; // update so subsequent changes work
    const raw = titleRef2.current.trim();
    const effectiveTitle = raw.startsWith("!") ? raw.slice(1).trim() : raw;
    if (!effectiveTitle) {
      onClose();
      return;
    }
    setFormData((f) => ({ ...f, dueDate: toLocalDate(date) }));
  }, [date]);

  // Focus title input when modal opens
  useEffect(() => {
    if (opened && titleRef.current) {
      setTimeout(() => {
        titleRef.current?.focus();
      }, 100);
    }
  }, [opened]);

  // Fetch Todoist projects/labels when entering Todoist mode
  useEffect(() => {
    if (isTodoistMode && api) fetchMetadata();
  }, [isTodoistMode, api, fetchMetadata]);

  // Default to Inbox project once metadata loads
  useEffect(() => {
    if (todoistProjects.length && !todoistProjectId) {
      const inbox = todoistProjects.find(isInbox);
      if (inbox) setTodoistProjectId(inbox.id);
    }
  }, [todoistProjects, todoistProjectId]);

  // NLP parsing for both Todoist mode and normal mode
  useEffect(() => {
    if (!formData.title.trim()) {
      setNlpResult(null);
      return;
    }
    const timer = setTimeout(() => {
      const result = parseNLPInput(formData.title, formData.dueDate || new Date());
      setNlpResult(result);

      // Sync NLP-parsed Todoist tokens to GUI controls
      if (isTodoistMode) {
        // Sync #project token ↔ project dropdown
        const prevProj = nlpProjectRef.current;
        const currProj = result.project || null;
        nlpProjectRef.current = currProj;
        if (currProj) {
          const match = todoistProjects.find(
            (p) => p.name.toLowerCase() === currProj.toLowerCase(),
          );
          if (match) setTodoistProjectId(match.id);
        } else if (prevProj && !currProj) {
          // #project was removed from title — fall back to Inbox
          const inbox = todoistProjects.find(isInbox);
          setTodoistProjectId(inbox ? inbox.id : null);
        }
        // Sync NLP-parsed @labels: add new ones, remove backspaced ones
        // Labels added via the TagsInput GUI are never in nlpLabelsRef, so they persist
        const prevNlp = nlpLabelsRef.current;
        const currNlp = result.labels || [];
        nlpLabelsRef.current = currNlp;
        const added = currNlp.filter((l) => !prevNlp.includes(l));
        const removed = prevNlp.filter((l) => !currNlp.includes(l));
        if (added.length || removed.length) {
          setTodoistLabels((prev) => {
            let next = [...prev];
            for (const label of added) {
              if (!next.includes(label)) next.push(label);
            }
            if (removed.length) {
              const removedSet = new Set(removed);
              next = next.filter((l) => !removedSet.has(l));
            }
            return next;
          });
        }
        if (result.priority) {
          // Convert user-facing p1-p4 to API value (p1→4, p2→3, p3→2, p4→1)
          setTodoistPriority(String(5 - result.priority));
        }
      }

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
      setTodoistProjectId(null);
      setTodoistLabels([]);
      setTodoistDescription("");
      setTodoistSubmitting(false);
      setNlpResult(null);
      setAppliedNlp(null);
      nlpAppliedRef.current = false;
      nlpDismissedRef.current = false;
      nlpLabelsRef.current = [];
      nlpProjectRef.current = null;
    }
  }, [opened]);

  // Sync ghost event to calendar preview
  useEffect(() => {
    if (!onGhostUpdate || !opened) return;

    if (isTodoistMode) {
      // Todoist ghost: use NLP-parsed title/date, Todoist class
      const resolvedDate = nlpResult?.date || formData.dueDate;
      const todoistClass = classes.find((c) => c.canvas_course_id === "todoist");
      const rawTitle = (nlpResult?.title || formData.title.slice(1)).trim();
      const baseGhost = {
        id: "__ghost__",
        title: rawTitle || "New task",
        status: "incomplete",
        event_type: "assignment",
        class_id: todoistClass?.id || null,
        class_name: todoistClass?.name || null,
        class_color: todoistClass?.color || null,
        isGhost: true,
      };

      if (nlpResult?.recurrence) {
        // Recurring: pass recurrence string, Calendar will expand into multiple ghosts
        onGhostUpdate({ ...baseGhost, due_date: null, recurrence: nlpResult.recurrence });
      } else if (resolvedDate) {
        onGhostUpdate({
          ...baseGhost,
          due_date: nlpResult?.hasTime
            ? dayjs(resolvedDate).format("YYYY-MM-DDTHH:mm:ss")
            : toUTCString(resolvedDate),
        });
      } else {
        onGhostUpdate(null);
      }
    } else {
      const cls = classes.find((c) => String(c.id) === formData.classId);
      const rawTitle = (appliedNlp ? nlpResult?.title || formData.title : formData.title).trim();
      onGhostUpdate({
        id: "__ghost__",
        title: rawTitle || "New event",
        due_date: toUTCString(formData.dueDate),
        status: "incomplete",
        event_type: formData.eventType,
        class_id: formData.classId || null,
        class_name: cls?.name || null,
        class_color: cls?.color || null,
        isGhost: true,
      });
    }
  }, [opened, formData.title, formData.dueDate, formData.classId, formData.eventType, isTodoistMode, nlpResult]);

  const handleSubmitRef = useRef(null);

  // Handle Mod+Enter to submit — use ref to avoid stale closures
  useEffect(() => {
    if (!opened) return;

    const handleKeyDown = (e) => {
      // Require Cmd/Ctrl + Enter
      if (e.key !== "Enter" || !(e.metaKey || e.ctrlKey)) return;

      // Only submit if title is filled
      if (!formData.title.trim()) return;

      e.preventDefault();
      handleSubmitRef.current?.();
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

    // Use NLP-cleaned title if a date was applied, otherwise raw title
    const cleanTitle = appliedNlp ? (nlpResult?.title || formData.title).trim() : formData.title.trim();

    onCreate({
      title: cleanTitle,
      due_date: toUTCString(formData.dueDate),
      class_id: formData.classId || null,
      event_type: formData.eventType,
      notes: formData.notes,
      url: formData.url,
    });
  };

  handleSubmitRef.current = handleSubmit;

  const handleTodoistSubmit = async () => {
    if (!formData.title.trim()) return;
    if (!api) return;

    // Parse fresh from current title to avoid stale debounced nlpResult
    const freshParse = parseNLPInput(formData.title, formData.dueDate || new Date());

    setTodoistSubmitting(true);
    try {
      // Resolve the due date: NLP-parsed date > calendar date
      const resolvedDate = freshParse.date || formData.dueDate;
      const hasTime = freshParse.hasTime;
      const isRecurring = !!freshParse.recurrence;

      // Build Todoist due fields
      const todoistDue = {};
      if (isRecurring) {
        // Recurring tasks: send the natural language string so Todoist
        // handles "every tuesday and thursday at 8am" natively
        todoistDue.due_string = freshParse.recurrence;
      } else if (resolvedDate) {
        // One-off tasks: send resolved date directly
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
          content: freshParse.title,
          ...todoistDue,
          priority: parseInt(todoistPriority, 10),
          project_id: todoistProjectId || undefined,
          labels: todoistLabels.length ? todoistLabels : undefined,
          description: todoistDescription.trim() || undefined,
        }),
      });

      // Refresh labels so newly created personal labels appear in autocomplete
      if (todoistLabels.length) refreshLabels();

      // Find the Todoist class for local event
      const todoistClass = classes.find(
        (c) => c.canvas_course_id === "todoist",
      );

      // Use Todoist's resolved date for recurring tasks, local date for one-off
      const dueDate = isRecurring
        ? todoistTask.due?.date || toUTCString(date)
        : resolvedDate
          ? (hasTime ? dayjs(resolvedDate).format("YYYY-MM-DDTHH:mm:ss") : dayjs(resolvedDate).format("YYYY-MM-DD"))
          : todoistTask.due?.date || toUTCString(date);

      // Create local event linked to Todoist
      onCreate({
        title: freshParse.title,
        due_date: dueDate,
        class_id: todoistClass?.id || null,
        event_type: "assignment",
        todoist_id: String(todoistTask.id),
        url: `https://app.todoist.com/app/task/${todoistTask.id}`,
      });

      notifySuccess(`Todoist task "${freshParse.title}" created`);
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

  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const pendingActionRef = useRef(null);

  const handleAttemptClose = () => {
    if (shouldBlockClose) {
      pendingActionRef.current = () => onClose();
      setShowDiscardConfirm(true);
      return;
    }
    onClose();
  };
  const handleOpenMentionEvent = (eventItem) => {
    if (shouldBlockClose) {
      pendingActionRef.current = () => onOpenEvent?.(eventItem);
      setShowDiscardConfirm(true);
      return;
    }
    onOpenEvent?.(eventItem);
  };

  const handleConfirmDiscard = () => {
    setShowDiscardConfirm(false);
    pendingActionRef.current?.();
    pendingActionRef.current = null;
  };

  const handleCancelDiscard = () => {
    setShowDiscardConfirm(false);
    pendingActionRef.current = null;
  };

  const handleDiscard = () => {
    if (shouldBlockClose) {
      pendingActionRef.current = () => onClose();
      setShowDiscardConfirm(true);
      return;
    }
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
    isTodoistMode && (!formData.title.trim() || todoistSubmitting);

  const isMobile = useIsMobile();
  const modalTitle = isTodoistMode ? "Create Todoist Task" : "Create Event";

  const Container = isMobile ? BottomSheet : FloatingPanel;
  const containerProps = isMobile
    ? { opened, onClose: handleAttemptClose, title: modalTitle, size: "md" }
    : { opened, onClose: handleAttemptClose, title: modalTitle, anchorRect, closeOnEscape: true };

  // Reset discard state when modal closes
  useEffect(() => {
    if (!opened) {
      setShowDiscardConfirm(false);
      pendingActionRef.current = null;
    }
  }, [opened]);

  return (
    <Container {...containerProps}>
      {/* Discard confirmation overlay */}
      <AnimatePresence>
        {showDiscardConfirm && (
          <motion.div
            key="discard-confirm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 10,
              background: "var(--card)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 16,
              padding: 24,
              borderRadius: "inherit",
            }}
          >
            <Text fw={600} size="md" ta="center" style={{ color: "var(--ink)" }}>
              Discard unsaved changes?
            </Text>
            <Group gap={12}>
              <Button color="red" variant="light" onClick={handleConfirmDiscard}>
                Discard
              </Button>
              <Button onClick={handleCancelDiscard}>
                Keep editing
              </Button>
            </Group>
          </motion.div>
        )}
      </AnimatePresence>

      <Stack gap="md">
          {/* Title - always visible */}
          <Box style={{ position: "relative" }}>
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
                  ? "!buy groceries tomorrow 5pm #Work @errands !!1"
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
            <TodoistAutocomplete
              inputRef={titleRef}
              value={formData.title}
              onValueChange={(newValue) => {
                nlpDismissedRef.current = false;
                nlpAppliedRef.current = false;
                setAppliedNlp(null);
                setFormData((f) => ({ ...f, title: newValue }));
                markUserEdited();
              }}
              projects={todoistProjects}
              labels={todoistLabelOptions}
              active={isTodoistMode}
            />
          </Box>

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
                  {/* Parsed Result — reflects merged NLP + GUI state */}
                  <SectionCard accent="#e44332">
                    <Stack gap={6}>
                      <Text size="xs" fw={600} c="dimmed" tt="uppercase">
                        Parsed Result
                      </Text>
                      <Group gap="xs" align="baseline">
                        <Text size="sm" c="dimmed" w={50}>Title</Text>
                        <Text size="sm" fw={500}>
                          {nlpResult?.title || (
                            <Text span c="dimmed" fs="italic">
                              Type a task...
                            </Text>
                          )}
                        </Text>
                      </Group>
                      <Group gap="xs" align="baseline">
                        <Text size="sm" c="dimmed" w={50}>Due</Text>
                        {nlpResult?.recurrence ? (
                          <Text size="sm" fw={500} c="orange">
                            {nlpResult.dateText}
                          </Text>
                        ) : nlpResult?.date ? (
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
                      {/* Project — from GUI dropdown or NLP #token */}
                      <Group gap="xs" align="baseline">
                        <Text size="sm" c="dimmed" w={50}>Project</Text>
                        {(() => {
                          const proj = todoistProjectId
                            ? todoistProjects.find((p) => p.id === todoistProjectId)
                            : null;
                          if (!proj) return <Text size="sm" c="dimmed" fs="italic">Inbox</Text>;
                          const hex = todoistColor(proj.color) || "#9a9a9a";
                          return (
                            <Group gap={6} wrap="nowrap">
                              <Box
                                style={{
                                  width: 8,
                                  height: 8,
                                  backgroundColor: hex,
                                  borderRadius: 2,
                                  flexShrink: 0,
                                }}
                              />
                              <Text size="sm" fw={500} style={{ color: hex }}>
                                {proj.name}
                              </Text>
                            </Group>
                          );
                        })()}
                      </Group>
                      {/* Labels — from GUI TagsInput or NLP @tokens */}
                      <Group gap="xs" align="baseline">
                        <Text size="sm" c="dimmed" w={50}>Labels</Text>
                        {todoistLabels.length > 0 ? (
                          <Group gap={4}>
                            {todoistLabels.map((l) => (
                              <Badge key={l} size="xs" variant="light">{l}</Badge>
                            ))}
                          </Group>
                        ) : (
                          <Text size="sm" c="dimmed" fs="italic">None</Text>
                        )}
                      </Group>
                      {/* Priority — from GUI segmented control or NLP !!token */}
                      <Group gap="xs" align="baseline">
                        <Text size="sm" c="dimmed" w={50}>Priority</Text>
                        <Text size="sm" fw={600} style={{ color: PRIORITY_COLORS[5 - parseInt(todoistPriority, 10)] }}>
                          P{5 - parseInt(todoistPriority, 10)}
                        </Text>
                      </Group>
                    </Stack>
                  </SectionCard>

                  {/* Task Details — Priority, Project, Labels */}
                  <SectionCard
                    accent={(() => {
                      const proj = todoistProjects.find((p) => p.id === todoistProjectId);
                      if (proj) return todoistColor(proj.color) || "#9a9a9a";
                      // Fallback to Inbox color when project not yet loaded
                      const inbox = todoistProjects.find(isInbox);
                      return todoistColor(inbox?.color) || "#9a9a9a";
                    })()}
                  >
                    <Stack gap="md">
                      <Select
                        label={
                          <Group gap={6} mb={2}>
                            <IconFolder size={14} style={{ opacity: 0.5 }} />
                            <Text size="sm" fw={600} c="dimmed">
                              Project
                            </Text>
                          </Group>
                        }
                        data={todoistProjects.map((p) => ({
                          value: p.id,
                          label: p.name,
                        }))}
                        value={todoistProjectId}
                        onChange={(newId) => {
                          setTodoistProjectId(newId);
                          const proj = todoistProjects.find((p) => p.id === newId);
                          // 2-way sync: update #project token in title
                          const PROJECT_TOKEN = /#(?:"[^"]+"|[^\s]+)\s?/;
                          setFormData((f) => {
                            let title = f.title;
                            if (proj && !isInbox(proj)) {
                              const token = proj.name.includes(" ")
                                ? `#"${proj.name}" `
                                : `#${proj.name} `;
                              if (PROJECT_TOKEN.test(title)) {
                                title = title.replace(PROJECT_TOKEN, token);
                              } else {
                                title = title.trimEnd() + " " + token;
                              }
                            } else {
                              // Inbox or unknown — remove #project token from title
                              title = title.replace(PROJECT_TOKEN, "").replace(/\s{2,}/g, " ").trim();
                            }
                            return { ...f, title };
                          });
                          nlpProjectRef.current = (proj && !isInbox(proj)) ? proj.name : null;
                          markUserEdited();
                        }}
                        searchable
                        allowDeselect={false}
                        selectFirstOptionOnChange
                        size="xs"
                        renderOption={({ option }) => {
                          const proj = todoistProjects.find((p) => p.id === option.value);
                          return (
                            <Group gap="xs" wrap="nowrap">
                              <Box
                                style={{
                                  width: 10,
                                  height: 10,
                                  backgroundColor: todoistColor(proj?.color) || "#9a9a9a",
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
                              backgroundColor: todoistColor(todoistProjects.find((p) => p.id === todoistProjectId)?.color) || "#9a9a9a",
                              borderRadius: 2,
                              flexShrink: 0,
                            }}
                          />
                        }
                      />

                      <TagsInput
                        label={
                          <Group gap={6} mb={2}>
                            <IconHash size={14} style={{ opacity: 0.5 }} />
                            <Text size="sm" fw={600} c="dimmed">
                              Labels
                            </Text>
                          </Group>
                        }
                        placeholder="Add labels..."
                        data={todoistLabelOptions.map((l) => l.name)}
                        value={todoistLabels}
                        onChange={(values) => {
                          setTodoistLabels(values.map((v) => v.replace(/^@/, "")));
                        }}
                        size="xs"
                      />

                      <Box>
                        <Group gap={6} mb={6}>
                          <IconFlag size={14} style={{ opacity: 0.5 }} />
                          <Text size="sm" fw={600} c="dimmed">
                            Priority
                          </Text>
                        </Group>
                        <SegmentedControl
                          value={todoistPriority}
                          onChange={setTodoistPriority}
                          data={TODOIST_PRIORITIES}
                          color={PRIORITY_COLORS[5 - parseInt(todoistPriority, 10)]}
                          autoContrast
                          size="xs"
                          fullWidth
                          styles={{
                            root: {
                              backgroundColor: "var(--card)",
                              border: "1px solid var(--rule)",
                              padding: 3,
                            },
                            indicator: {
                              boxShadow: "var(--shadow-sm)",
                            },
                          }}
                        />
                      </Box>

                      <Box>
                        <Group gap={6} mb={4}>
                          <IconFileText size={14} style={{ opacity: 0.5 }} />
                          <Text size="sm" fw={600} c="dimmed">
                            Description
                          </Text>
                        </Group>
                        <TodoistDescriptionEditor
                          value={todoistDescription}
                          onChange={setTodoistDescription}
                          placeholder="Add a description..."
                        />
                      </Box>
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
    </Container>
  );
}
