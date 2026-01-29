import { memo, useLayoutEffect, useRef, useState } from "react";
import {
  ActionIcon,
  Anchor,
  Badge,
  Box,
  Button,
  Group,
  HoverCard,
  Select,
  Stack,
  Text,
  TextInput,
  Tooltip,
  TypographyStylesProvider,
} from "@mantine/core";
import { DateTimePicker } from "@mantine/dates";
import { AnimatePresence, motion } from "framer-motion";
import {
  IconCalendar,
  IconFileText,
  IconLink,
  IconLock,
  IconLockOpen,
  IconTag,
  IconX,
} from "@tabler/icons-react";
import dayjs from "dayjs";
import NotesTextarea from "../NotesTextarea";
import { formatRelativeTime, toLocalDate } from "../../utils/datetime";

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
          {item.course_name}
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
    <SectionCard>
      <DateTimePicker
        label={
          <Group gap={6} align="center" mb={2}>
            <IconCalendar size={14} style={{ opacity: 0.5 }} />
            <Text size="sm" fw={600} c="dimmed">
              Due Date & Time
            </Text>
            {isCanvasLinked ? (
              <HoverCard width={240} shadow="md" position="top" withArrow>
                <HoverCard.Target>
                  <ActionIcon
                    variant="subtle"
                    size="xs"
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
                        <IconLock size={12} color="var(--accent-hover)" />
                      ) : (
                        <IconLockOpen size={12} color="var(--accent-hover)" />
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
    </SectionCard>
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

  const currentClassColor = formData.classId
    ? classes.find((c) => String(c.id) === formData.classId)?.color
    : null;

  return (
    <SectionCard accent={currentClassColor}>
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
                backgroundColor: currentClassColor || "#a78b71",
                borderRadius: 2,
                flexShrink: 0,
              }}
            />
          ) : null
        }
      />
    </SectionCard>
  );
}

export function ApprovalEventTypeSelect({
  formData,
  setFormData,
  onUserEdit,
  eventTypePulse,
}) {
  return (
    <SectionCard>
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
          onUserEdit();
        }}
        classNames={{
          input: eventTypePulse ? "event-type-pulse" : undefined,
        }}
      />
    </SectionCard>
  );
}

export function ApprovalUrlField({ formData, setFormData, onUserEdit }) {
  return (
    <SectionCard>
      <Stack gap="xs">
        <TextInput
          label={
            <Group gap={6} mb={2}>
              <IconLink size={14} style={{ opacity: 0.5 }} />
              <Text size="sm" fw={600} c="dimmed">
                URL
              </Text>
            </Group>
          }
          placeholder="Canvas URL"
          value={formData.url}
          onChange={(e) => {
            setFormData((f) => ({
              ...f,
              url: e.target.value,
            }));
            onUserEdit();
          }}
          size="sm"
        />
        {formData.url && (
          <Anchor
            href={formData.url}
            target="_blank"
            size="xs"
            style={{ display: "inline-block" }}
          >
            Open in Canvas
          </Anchor>
        )}
      </Stack>
    </SectionCard>
  );
}

export function ApprovalPointsBadge({ item }) {
  if (item.points_possible === null || item.points_possible === undefined) {
    return null;
  }

  return (
    <SectionCard>
      <Group gap="xs">
        <Text size="sm" fw={600} c="dimmed">
          Points
        </Text>
        <Badge variant="light" size="sm" styles={{ root: { fontWeight: 600 } }}>
          {item.points_possible}
        </Badge>
      </Group>
    </SectionCard>
  );
}

export function ApprovalLockStatus({ item }) {
  if (!item.locked_for_user) {
    return null;
  }

  const unlockInFuture =
    item.unlock_at && dayjs(item.unlock_at).isAfter(dayjs());

  return (
    <SectionCard>
      <Group gap="xs" wrap="nowrap">
        <IconLock size={14} color="var(--overdue)" style={{ flexShrink: 0 }} />
        <Text size="sm" c="red">
          {unlockInFuture ? (
            <Tooltip label={formatRelativeTime(item.unlock_at)} withArrow>
              <span style={{ cursor: "help" }}>
                {"Assignment locked "}
                until {dayjs(item.unlock_at).format("MMM D, YYYY h:mm A")}
              </span>
            </Tooltip>
          ) : (
            "Canvas has locked the assignment (past due)."
          )}
        </Text>
      </Group>
    </SectionCard>
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
        <Text size="sm" fw={600} c="dimmed">
          Description
        </Text>
        <Box
          style={{ position: "relative" }}
          onMouseEnter={() => setShowDescriptionPreview(true)}
          onMouseLeave={() => setShowDescriptionPreview(false)}
        >
          <Button
            size="xs"
            variant="subtle"
            styles={{
              root: {
                padding: "4px 10px",
                background: "var(--parchment)",
              },
              label: {
                fontWeight: 500,
                fontSize: "0.8125rem",
              },
            }}
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

export function ApprovalActionButtons({
  item,
  onReject,
  onDiscard,
  onApprove,
}) {
  return (
    <Group justify="space-between" className="modal-footer">
      <Button variant="light" color="red" onClick={() => onReject(item)}>
        Reject
      </Button>
      <Group gap={12}>
        <Button variant="subtle" onClick={onDiscard}>
          Cancel
        </Button>
        <Button onClick={onApprove}>Add to Calendar</Button>
      </Group>
    </Group>
  );
}

/**
 * Ultra-lightweight skeleton preview for background cards.
 * Uses actual SectionCard structure to match real card heights accurately.
 * Memoized to prevent re-renders during shuffle.
 *
 * Edge-based peek zones: allows for +1 or +2 card peaking on either side independently.
 */
export const ApprovalCardPreview = memo(function ApprovalCardPreview({
  item,
  classes,
  onClick,
  style,
  position = 0,
  onPeekStart,
  onPeekEnd,
}) {
  const matchingClass = classes?.find(
    (c) => c.name.toLowerCase() === item.course_name?.toLowerCase(),
  );
  const classColor = matchingClass?.color || null;

  // Determine which edge should trigger peek based on card position
  // Left cards (position < 0) have peek zone on right edge (toward center)
  // Right cards (position > 0) have peek zone on left edge (toward center)
  const peekEdge = position < 0 ? "left" : position > 0 ? "right" : null;
  const [isEdgeHovered, setIsEdgeHovered] = useState(false);

  const handleEdgeEnter = () => {
    setIsEdgeHovered(true);
    onPeekStart?.();
  };

  const handleEdgeLeave = () => {
    setIsEdgeHovered(false);
    onPeekEnd?.();
  };

  return (
    <div
      onClick={onClick}
      className="modal-card card-preview-skeleton"
      style={{
        padding: "20px 24px",
        cursor: onClick ? "pointer" : "default",
        userSelect: "none",
        position: "relative",
        overflow: "hidden",
        ...style,
      }}
    >
      {/* Edge-based peek hover zones - only on the inward-facing edge */}
      {peekEdge === "left" && (
        <div
          onMouseEnter={handleEdgeEnter}
          onMouseLeave={handleEdgeLeave}
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            width: "20%",
            zIndex: 20,
            cursor: "pointer",
          }}
        />
      )}
      {peekEdge === "right" && (
        <div
          onMouseEnter={handleEdgeEnter}
          onMouseLeave={handleEdgeLeave}
          style={{
            position: "absolute",
            right: 0,
            top: 0,
            bottom: 0,
            width: "20%",
            zIndex: 20,
            cursor: "pointer",
          }}
        />
      )}

      {/* Class color accent bar */}
      {classColor && (
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            width: 4,
            backgroundColor: classColor,
            borderRadius: "12px 0 0 12px",
          }}
        />
      )}

      {/* Overlay to dim - fades out when edge is hovered */}
      <div
        className="card-dim-overlay"
        style={{
          position: "absolute",
          inset: 0,
          backgroundColor: "var(--card)",
          opacity: isEdgeHovered ? 0 : 0.5,
          zIndex: 10,
          borderRadius: 12,
          pointerEvents: "none",
          transition: "opacity 0.15s ease-out",
        }}
      />

      {/* Content skeleton - uses real SectionCard structure */}
      <Stack gap={16}>
        {/* Header - render actual title */}
        <Box>
          <Text fw={600} size="lg">
            {item.title}
          </Text>
          <Text size="sm" c="dimmed">
            {item.course_name}
          </Text>
        </Box>

        {/* Skeleton sections - actual SectionCard components with minimal placeholders */}
        <SectionCard>
          <div style={{ height: 58 }} /> {/* Due date field */}
        </SectionCard>

        <SectionCard>
          <div style={{ height: 58 }} /> {/* Class select */}
        </SectionCard>

        <SectionCard>
          <div style={{ height: 58 }} /> {/* Event type select */}
        </SectionCard>

        <SectionCard>
          <div style={{ height: 58 }} /> {/* URL field */}
        </SectionCard>

        {item.points_possible !== null &&
          item.points_possible !== undefined && (
            <SectionCard>
              <div style={{ height: 24 }} /> {/* Points badge */}
            </SectionCard>
          )}

        {item.locked_for_user && (
          <SectionCard>
            <div style={{ height: 20 }} /> {/* Lock status */}
          </SectionCard>
        )}

        {item.description && (
          <Box>
            <div style={{ height: 28 }} /> {/* Description preview button */}
          </Box>
        )}

        <SectionCard>
          <div style={{ height: 80 }} /> {/* Notes textarea */}
        </SectionCard>

        <Group justify="space-between" className="modal-footer">
          <div style={{ height: 36, width: 80 }} /> {/* Reject button */}
          <Group gap={12}>
            <div style={{ height: 36, width: 80 }} /> {/* Cancel button */}
            <div style={{ height: 36, width: 130 }} /> {/* Approve button */}
          </Group>
        </Group>
      </Stack>
    </div>
  );
});
