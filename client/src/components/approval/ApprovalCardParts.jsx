import { useLayoutEffect, useRef, useState } from "react";
import {
  ActionIcon,
  Anchor,
  Badge,
  Box,
  Button,
  Group,
  HoverCard,
  Select,
  Text,
  TextInput,
  TypographyStylesProvider,
} from "@mantine/core";
import { DateTimePicker } from "@mantine/dates";
import { AnimatePresence, motion } from "framer-motion";
import { IconLock, IconLockOpen, IconX } from "@tabler/icons-react";
import dayjs from "dayjs";
import NotesTextarea from "../NotesTextarea";
import { toLocalDate } from "../../utils/datetime";

const EVENT_TYPES = [
  { value: "assignment", label: "Assignment" },
  { value: "quiz", label: "Quiz" },
  { value: "exam", label: "Exam" },
  { value: "homework", label: "Homework" },
  { value: "lab", label: "Lab" },
];

export function ApprovalCardHeader({ item, onAttemptClose }) {
  return (
    <>
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
      <Box>
        <Text fw={600} size="lg">
          {item.title}
        </Text>
        <Text size="sm" c="dimmed">
          Course: {item.course_name}
        </Text>
      </Box>
    </>
  );
}

export function ApprovalDueDateField({
  formData,
  setFormData,
  onUserEdit,
  isCanvasLinked,
  isSyncLocked,
}) {
  const toggleSyncLock = () => {
    const nextValue = isSyncLocked ? 1 : 0;
    setFormData((f) => ({
      ...f,
      canvas_due_date_override: nextValue,
    }));
    onUserEdit();
  };

  return (
    <Box>
      <DateTimePicker
        label={
          <Group gap={6} align="center">
            <Text size="sm" fw={500}>
              Due Date & Time
            </Text>
            {isCanvasLinked ? (
              <HoverCard
                width={240}
                shadow="md"
                position="top"
                withArrow
              >
                <HoverCard.Target>
                  <ActionIcon
                    variant="subtle"
                    size="sm"
                    aria-label={
                      isSyncLocked
                        ? "Canvas sync enabled"
                        : "Canvas sync disabled"
                    }
                    onClick={toggleSyncLock}
                  >
                    <motion.span
                      key={isSyncLocked ? "locked" : "unlocked"}
                      initial={{ rotate: 0, y: 0, scale: 1, opacity: 1 }}
                      animate={{
                        rotate: isSyncLocked ? [0, 20, 0] : [0, -25, 0],
                        y: isSyncLocked ? [0, 1, 0] : [0, -3, -1],
                        scale: [1, 1.08, 1],
                      }}
                      transition={{ duration: 0.35, ease: "easeOut" }}
                      style={{ display: "inline-flex" }}
                    >
                      {isSyncLocked ? (
                        <IconLock size={14} color="var(--accent-hover)" />
                      ) : (
                        <IconLockOpen size={14} color="var(--accent-hover)" />
                      )}
                    </motion.span>
                  </ActionIcon>
                </HoverCard.Target>
                <HoverCard.Dropdown>
                  <Text size="xs">
                    {isSyncLocked
                      ? "Date will update from Canvas on fetch."
                      : "Sync disabled. This date will stay as you set it."}
                  </Text>
                </HoverCard.Dropdown>
              </HoverCard>
            ) : null}
          </Group>
        }
      placeholder="Pick date and optionally time"
      value={formData.dueDate}
      onChange={(v) => {
        // Presets pass strings, normalize to local Date
        setFormData((f) => ({ ...f, dueDate: toLocalDate(v) }));
        onUserEdit();
      }}
      disabled={isSyncLocked}
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
    </Box>
  );
}

export function ApprovalClassSelect({
  classes,
  formData,
  setFormData,
  onUserEdit,
}) {
  const classOptions = classes
    .filter((c) => !c.canvas_course_id || c.is_synced)
    .map((c) => ({
      value: String(c.id),
      label: c.name,
    }));

  return (
    <Select
      label="Class"
      placeholder="Select a class"
      data={classOptions}
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
                classes.find((c) => String(c.id) === formData.classId)?.color ||
                "#a78b71",
              borderRadius: 2,
              flexShrink: 0,
            }}
          />
        ) : null
      }
    />
  );
}

export function ApprovalEventTypeSelect({
  formData,
  setFormData,
  onUserEdit,
  eventTypePulse,
}) {
  return (
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
  );
}

export function ApprovalUrlField({ formData, setFormData, onUserEdit }) {
  return (
    <>
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
    </>
  );
}

export function ApprovalPointsBadge({ item }) {
  if (item.points_possible === null || item.points_possible === undefined) {
    return null;
  }

  return (
    <Group gap="xs">
      <Text size="sm" fw={500}>
        Points
      </Text>
      <Badge variant="light">{item.points_possible}</Badge>
    </Group>
  );
}

export function ApprovalDescriptionPreview({
  item,
  showDescriptionFullscreen,
  setShowDescriptionFullscreen,
}) {
  const [showDescriptionPreview, setShowDescriptionPreview] = useState(false);
  const [previewScale, setPreviewScale] = useState(0.25);
  const previewContentRef = useRef(null);
  const descriptionLayoutId = `description-${item.canvas_id}`;
  const previewSize = { width: 280, height: 140, contentWidth: 640 };

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

  if (!item.description) return null;

  return (
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
                  borderRadius: 8,
                  border: "1px solid var(--rule)",
                  backgroundColor: "var(--card)",
                  boxShadow: "var(--shadow-lg)",
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
  );
}

export function ApprovalNotesField({
  formData,
  setFormData,
  onUserEdit,
  events,
  classes,
  unassignedColor,
  onOpenEvent,
}) {
  return (
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
  );
}

export function ApprovalActionButtons({ item, onReject, onDiscard, onApprove }) {
  return (
    <Group justify="space-between" className="modal-footer">
      <Button variant="light" color="red" onClick={() => onReject(item)}>
        Reject
      </Button>
      <Group gap={12}>
        <Button variant="subtle" onClick={onDiscard}>
          Cancel
        </Button>
        <Button onClick={onApprove}>
          Add to Calendar
        </Button>
      </Group>
    </Group>
  );
}
