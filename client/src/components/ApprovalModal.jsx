import { useState, useEffect, useLayoutEffect, useRef, useMemo } from "react";
import {
  Stack,
  TextInput,
  Select,
  Button,
  Group,
  Text,
  Badge,
  ActionIcon,
  Box,
  Paper,
  Anchor,
  TypographyStylesProvider,
} from "@mantine/core";
import { DateTimePicker } from "@mantine/dates";
import { IconChevronLeft, IconChevronRight, IconX } from "@tabler/icons-react";
import { motion, AnimatePresence, useAnimation } from "framer-motion";
import dayjs from "dayjs";
import { parseDueDate, toUTCString } from "../utils/datetime";
import NotesTextarea from "./NotesTextarea";

const EVENT_TYPES = [
  { value: "assignment", label: "Assignment" },
  { value: "quiz", label: "Quiz" },
  { value: "exam", label: "Exam" },
  { value: "homework", label: "Homework" },
  { value: "lab", label: "Lab" },
];

const detectEventTypeFromTitle = (title) => {
  if (!title) return null;
  const normalized = title.toLowerCase();
  const rules = [
    { type: "quiz", patterns: [/\bquiz\b/, /\bqz\b/] },
    {
      type: "exam",
      patterns: [/\bexam\b/, /\bmidterm\b/, /\bfinal\b/, /\btest\b/],
    },
    {
      type: "homework",
      patterns: [/\bhomework\b/, /\bhw\b/, /\bpset\b/, /problem set/],
    },
    { type: "lab", patterns: [/\blab\b/] },
    { type: "assignment", patterns: [/\bassignment\b/, /\bassign\b/] },
  ];

  for (const rule of rules) {
    if (rule.patterns.some((pattern) => pattern.test(normalized))) {
      return rule.type;
    }
  }

  return null;
};

function Card({
  item,
  classes,
  events,
  unassignedColor,
  formData,
  setFormData,
  onUserEdit,
  onApprove,
  onReject,
  onAttemptClose,
  onDiscard,
  onOpenEvent,
  exitDirection,
  showDescriptionFullscreen,
  setShowDescriptionFullscreen,
  eventTypePulse,
  shakeSignal,
}) {
  const [showDescriptionPreview, setShowDescriptionPreview] = useState(false);
  const [previewScale, setPreviewScale] = useState(0.25);
  const previewContentRef = useRef(null);
  const descriptionLayoutId = `description-${item.canvas_id}`;
  const previewSize = { width: 280, height: 140, contentWidth: 640 };
  const shakeControls = useAnimation();
  const prevShakeSignalRef = useRef(shakeSignal);

  useLayoutEffect(() => {
    if (!showDescriptionPreview || !previewContentRef.current) return;
    const contentEl = previewContentRef.current;
    const contentWidth = contentEl.scrollWidth || previewSize.contentWidth;
    const contentHeight = contentEl.scrollHeight || previewSize.height;
    const scale = Math.min(
      previewSize.width / contentWidth,
      previewSize.height / contentHeight,
      1,
    );
    setPreviewScale(scale);
  }, [showDescriptionPreview, item.description]);

  useEffect(() => {
    // shake when shakeSignal increases (not on initial mount)
    if (shakeSignal > 0 && shakeSignal !== prevShakeSignalRef.current) {
      shakeControls.start({
        x: [0, -8, 8, -6, 6, 0],
        transition: { duration: 0.35 },
      });
    }
    prevShakeSignalRef.current = shakeSignal;
  }, [shakeSignal, shakeControls]);

  const handleSubmit = () => {
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

  return (
    <motion.div
      style={{
        position: "absolute",
        width: "100%",
        maxWidth: "500px",
      }}
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{
        x:
          exitDirection === "right" ? 500 : exitDirection === "left" ? -500 : 0,
        opacity: 0,
        rotate:
          exitDirection === "right" ? 25 : exitDirection === "left" ? -25 : 0,
        transition: { duration: 0.2 },
      }}
      transition={{ type: "spring", stiffness: 250, damping: 30 }}
    >
      <motion.div animate={shakeControls}>
        <Paper
          shadow="xl"
          p="xl"
          radius="md"
          style={{
            backgroundColor: "var(--mantine-color-body)",
            border: "1px solid var(--mantine-color-default-border)",
            position: "relative",
          }}
        >
          <ActionIcon
            variant="subtle"
            size="lg"
            onClick={onAttemptClose}
            style={{
              position: "absolute",
              top: "12px",
              right: "12px",
            }}
          >
            <IconX size={20} />
          </ActionIcon>
          <Stack gap="md">
            <Box>
              <Text fw={600} size="lg">
                {item.title}
              </Text>
              <Text size="sm" c="dimmed">
                Course: {item.course_name}
              </Text>
            </Box>

            <DateTimePicker
              label="Due Date & Time"
              placeholder="Pick date and optionally time"
              value={formData.dueDate}
              onChange={(v) => {
                // Presets pass strings, ensure we always store a Date
                const dateValue =
                  v instanceof Date ? v : v ? new Date(v) : null;
                setFormData((f) => ({ ...f, dueDate: dateValue }));
                onUserEdit();
              }}
              clearable={false}
              firstDayOfWeek={0}
              valueFormat="MMM DD, YYYY hh:mm A"
              presets={[
                {
                  value: dayjs().subtract(1, "day").format("YYYY-MM-DD"),
                  label: "Yesterday",
                },
                {
                  value: dayjs().format("YYYY-MM-DD"),
                  label: "Today",
                },
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
              timePickerProps={{
                popoverProps: { withinPortal: false },
                format: "12h",
              }}
            />

            <Select
              label="Class"
              placeholder="Select a class"
              data={classes
                .filter((c) => !c.canvas_course_id || c.is_synced)
                .map((c) => ({
                  value: String(c.id),
                  label: c.name,
                }))}
              value={formData.classId}
              onChange={(v) => {
                setFormData((f) => ({ ...f, classId: v }));
                onUserEdit();
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
                onUserEdit();
              }}
              classNames={{
                input: eventTypePulse ? "event-type-pulse" : undefined,
              }}
            />

            <TextInput
              label="URL"
              placeholder="Canvas URL"
              value={formData.url}
              onChange={(e) => {
                setFormData((f) => ({
                  ...f,
                  url: e.target.value,
                }));
                onUserEdit();
              }}
            />

            {formData.url && (
              <Anchor href={formData.url} target="_blank" size="sm">
                Open in Canvas
              </Anchor>
            )}

            {item.points_possible !== null &&
              item.points_possible !== undefined && (
                <Group gap="xs">
                  <Text size="sm" fw={500}>
                    Points
                  </Text>
                  <Badge variant="light">{item.points_possible}</Badge>
                </Group>
              )}

            {item.description && (
              <Box>
                <Group justify="space-between">
                  <Text size="sm" fw={500}>
                    Description
                  </Text>
                  <Box
                    style={{ position: "relative" }}
                    onMouseEnter={() => setShowDescriptionPreview(true)}
                    onMouseLeave={() => setShowDescriptionPreview(false)}
                  >
                    <Button
                      size="xs"
                      variant="light"
                      onClick={() => {
                        setShowDescriptionPreview(false);
                        setShowDescriptionFullscreen(true);
                      }}
                    >
                      View
                    </Button>
                    <AnimatePresence>
                      {showDescriptionPreview && !showDescriptionFullscreen && (
                        <motion.div
                          layoutId={descriptionLayoutId}
                          initial={{
                            opacity: 0,
                            y: -6,
                          }}
                          animate={{
                            opacity: 1,
                            y: 0,
                          }}
                          exit={{
                            opacity: 0,
                            y: -6,
                          }}
                          transition={{
                            duration: 0.15,
                          }}
                          style={{
                            position: "absolute",
                            right: 0,
                            top: "110%",
                            width: 280,
                            height: 140,
                            padding: 10,
                            borderRadius: 10,
                            border:
                              "1px solid var(--mantine-color-default-border)",
                            backgroundColor: "var(--mantine-color-body)",
                            boxShadow: "0 12px 28px rgba(0, 0, 0, 0.18)",
                            overflow: "hidden",
                            zIndex: 5,
                          }}
                        >
                          <TypographyStylesProvider>
                            <div
                              style={{
                                width: previewSize.contentWidth,
                                transform: `scale(${previewScale})`,
                                transformOrigin: "top left",
                                fontSize: "0.95rem",
                                lineHeight: 1.4,
                              }}
                              ref={previewContentRef}
                              dangerouslySetInnerHTML={{
                                __html: item.description,
                              }}
                            />
                          </TypographyStylesProvider>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </Box>
                </Group>
              </Box>
            )}

            <NotesTextarea
              label="Notes"
              placeholder="Add any notes..."
              value={formData.notes}
              onChange={(nextValue) => {
                setFormData((f) => ({
                  ...f,
                  notes: nextValue,
                }));
              }}
              onUserEdit={onUserEdit}
              events={events}
              classes={classes}
              unassignedColor={unassignedColor}
              onOpenEvent={onOpenEvent}
            />

            <Group justify="space-between" mt="md">
              <Button
                variant="light"
                color="red"
                onClick={() => onReject(item)}
                size="md"
              >
                Reject
              </Button>
              <Group>
                <Button variant="subtle" onClick={onDiscard} size="md">
                  Cancel
                </Button>
                <Button onClick={handleSubmit} size="md">
                  Add to Calendar
                </Button>
              </Group>
            </Group>
          </Stack>
        </Paper>
      </motion.div>
    </motion.div>
  );
}

export default function ApprovalModal({
  opened,
  onClose,
  item,
  classes,
  events,
  unassignedColor,
  onApprove,
  onReject,
  pendingCount,
  currentIndex,
  onNavigate,
  onOpenEvent,
}) {
  const [formData, setFormData] = useState({
    dueDate: null,
    classId: null,
    eventType: "assignment",
    notes: "",
    url: "",
  });
  const [exitDirection, setExitDirection] = useState(null);
  const [showDescriptionFullscreen, setShowDescriptionFullscreen] =
    useState(false);
  const [eventTypePulse, setEventTypePulse] = useState(false);
  const eventTypePulseTimeoutRef = useRef(null);
  const initialFormDataRef = useRef(null);
  const [shakeCount, setShakeCount] = useState(0);
  const [hasUserEdited, setHasUserEdited] = useState(false);

  useEffect(() => {
    if (eventTypePulseTimeoutRef.current) {
      clearTimeout(eventTypePulseTimeoutRef.current);
      eventTypePulseTimeoutRef.current = null;
    }
    setEventTypePulse(false);

    if (item) {
      // Auto-select class if course name matches
      const matchingClass = classes.find(
        (c) => c.name.toLowerCase() === item.course_name?.toLowerCase(),
      );
      const detectedType = detectEventTypeFromTitle(item.title);

      // Parse the due_date (handles both date-only and datetime)
      const { date } = parseDueDate(item.due_date);

      console.log("[ApprovalModal] Parsing due date:", {
        original: item.due_date,
        parsed: date,
        formatted: date ? dayjs(date).format("YYYY-MM-DD HH:mm:ss") : null,
      });

      const nextFormData = {
        dueDate: date,
        classId: matchingClass ? String(matchingClass.id) : null,
        eventType: detectedType || "assignment",
        notes: "",
        url: item.url || "",
      };
      setFormData(nextFormData);
      initialFormDataRef.current = nextFormData;
      setHasUserEdited(false);
      setExitDirection(null);
      setShowDescriptionFullscreen(false);

      if (detectedType && detectedType !== "assignment") {
        const rafId = requestAnimationFrame(() => {
          setEventTypePulse(true);
        });
        eventTypePulseTimeoutRef.current = setTimeout(() => {
          setEventTypePulse(false);
        }, 1200);
        return () => {
          cancelAnimationFrame(rafId);
          if (eventTypePulseTimeoutRef.current) {
            clearTimeout(eventTypePulseTimeoutRef.current);
            eventTypePulseTimeoutRef.current = null;
          }
        };
      }
    }
  }, [item, classes]);

  const isDirty = useMemo(() => {
    const initial = initialFormDataRef.current;
    if (!initial) return false;
    const sameDueDate =
      initial.dueDate === formData.dueDate ||
      (initial.dueDate &&
        formData.dueDate &&
        initial.dueDate.getTime() === formData.dueDate.getTime());
    return (
      formData.classId !== initial.classId ||
      formData.eventType !== initial.eventType ||
      formData.notes !== initial.notes ||
      formData.url !== initial.url ||
      !sameDueDate
    );
  }, [formData]);
  const shouldBlockClose = hasUserEdited && isDirty;

  const triggerDirtyShake = () => {
    setShakeCount((prev) => prev + 1);
  };

  const handleAttemptClose = () => {
    if (shouldBlockClose) {
      triggerDirtyShake();
      return;
    }
    onClose();
  };

  const handleDiscard = () => {
    onClose();
  };
  const markUserEdited = () => {
    setHasUserEdited(true);
  };

  const handleApproveClick = () => {
    setExitDirection("right");
    setTimeout(() => {
      const dueDate = formData.dueDate
        ? toUTCString(formData.dueDate)
        : item.due_date;

      onApprove(item, {
        ...formData,
        dueDate,
      });
    }, 50);
  };

  const handleRejectClick = () => {
    setExitDirection("left");
    setTimeout(() => {
      onReject(item);
    }, 50);
  };

  const handleNavigate = (direction) => {
    if (shouldBlockClose) {
      triggerDirtyShake();
      return;
    }
    setExitDirection(direction > 0 ? "right" : "left");
    setTimeout(() => {
      onNavigate(direction);
    }, 50);
  };
  const handleOpenMentionEvent = (eventItem) => {
    if (shouldBlockClose) {
      triggerDirtyShake();
      return;
    }
    onOpenEvent?.(eventItem);
  };

  const canGoPrev = currentIndex > 0;
  const canGoNext = currentIndex < pendingCount - 1;

  if (!opened) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.75)",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        zIndex: 200,
        padding: "8dvh 8vw",
        overflowY: "auto",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) handleAttemptClose();
      }}
    >
      <style>{`
				@keyframes eventTypePulse {
					0% {
						box-shadow: 0 0 0 0 rgba(34, 139, 230, 0.45);
						border-color: var(--mantine-color-blue-6);
					}
					70% {
						box-shadow: 0 0 0 8px rgba(34, 139, 230, 0);
					}
					100% {
						box-shadow: 0 0 0 0 rgba(34, 139, 230, 0);
					}
				}

				.event-type-pulse {
					animation: eventTypePulse 1.1s ease-out 1;
				}
			`}</style>
      {/* Position badge */}
      <Badge
        variant="filled"
        color="blue"
        size="lg"
        style={{
          position: "absolute",
          top: "20px",
          left: "50%",
          transform: "translateX(-50%)",
        }}
      >
        {currentIndex + 1} of {pendingCount}
      </Badge>

      <AnimatePresence>
        {item && showDescriptionFullscreen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: "fixed",
              inset: 0,
              backgroundColor: "rgba(0, 0, 0, 0.7)",
              zIndex: 250,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 24,
            }}
            onClick={() => setShowDescriptionFullscreen(false)}
          >
            <motion.div
              layoutId={`description-${item.canvas_id}`}
              transition={{
                type: "spring",
                stiffness: 260,
                damping: 22,
              }}
              style={{
                width: "70vw",
                height: "70vh",
                maxWidth: "1100px",
                maxHeight: "80vh",
                backgroundColor: "var(--mantine-color-body)",
                borderRadius: 12,
                border: "1px solid var(--mantine-color-default-border)",
                overflow: "hidden",
                boxShadow:
                  "0 30px 80px rgba(0, 0, 0, 0.35), 0 8px 24px rgba(0, 0, 0, 0.25)",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <Box
                style={{
                  padding: 16,
                  borderBottom: "1px solid var(--mantine-color-default-border)",
                }}
              >
                <Group justify="space-between">
                  <Text fw={600}>{item.title}</Text>
                  <Button
                    size="xs"
                    variant="subtle"
                    onClick={() => setShowDescriptionFullscreen(false)}
                  >
                    Close
                  </Button>
                </Group>
              </Box>
              <Box
                style={{
                  padding: 16,
                  maxHeight: "calc(90vh - 60px)",
                  overflowY: "auto",
                }}
              >
                <TypographyStylesProvider>
                  <div
                    dangerouslySetInnerHTML={{
                      __html: item.description,
                    }}
                  />
                </TypographyStylesProvider>
              </Box>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Card container */}
      <div
        style={{
          position: "relative",
          width: "100%",
          maxWidth: "600px",
          height: "600px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {/* Navigation buttons - positioned relative to card */}
        <ActionIcon
          variant="filled"
          size="xl"
          onClick={() => handleNavigate(-1)}
          disabled={!canGoPrev}
          style={{
            position: "absolute",
            left: "-25px",
            top: "50%",
            transform: "translateY(-50%)",
            zIndex: 10,
          }}
        >
          <IconChevronLeft size={24} />
        </ActionIcon>

        <ActionIcon
          variant="filled"
          size="xl"
          onClick={() => handleNavigate(1)}
          disabled={!canGoNext}
          style={{
            position: "absolute",
            right: "-25px",
            top: "50%",
            transform: "translateY(-50%)",
            zIndex: 10,
          }}
        >
          <IconChevronRight size={24} />
        </ActionIcon>

        <AnimatePresence mode="wait">
          {item && (
            <Card
              key={item.canvas_id}
              item={item}
              classes={classes}
              events={events}
              unassignedColor={unassignedColor}
              formData={formData}
              setFormData={setFormData}
              onUserEdit={markUserEdited}
              onApprove={handleApproveClick}
              onReject={handleRejectClick}
              onAttemptClose={handleAttemptClose}
              onDiscard={handleDiscard}
              onOpenEvent={handleOpenMentionEvent}
              exitDirection={exitDirection}
              eventTypePulse={eventTypePulse}
              showDescriptionFullscreen={showDescriptionFullscreen}
              setShowDescriptionFullscreen={setShowDescriptionFullscreen}
              shakeSignal={shakeCount}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
