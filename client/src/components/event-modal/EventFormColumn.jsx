import {
  Anchor,
  ActionIcon,
  Badge,
  Box,
  Button,
  Group,
  HoverCard,
  Select,
  Skeleton,
  Stack,
  Text,
  Textarea,
  TextInput,
  TypographyStylesProvider,
  SegmentedControl,
} from "@mantine/core";
import { DateTimePicker } from "@mantine/dates";
import dayjs from "dayjs";
import { AnimatePresence, motion } from "framer-motion";
import { IconLock, IconLockOpen, IconCalendar, IconLink, IconTag } from "@tabler/icons-react";
import { EVENT_TYPES, PREVIEW_SIZE, STATUS_COLORS, STATUS_OPTIONS } from "./constants";

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

export default function EventFormColumn({
  formData,
  setFormData,
  classes,
  event,
  unassignedColor,
  colorScheme,
  showSegmented,
  hasDescription,
  descriptionHtml,
  showDescriptionPreview,
  setShowDescriptionPreview,
  setShowDescriptionFullscreen,
  showDescriptionFullscreen,
  previewScale,
  previewContentRef,
  descriptionLayoutId,
  markUserEdited,
}) {
  const isCanvasLinked = Boolean(event?.canvas_id);
  const isSyncLocked = isCanvasLinked && !formData.canvas_due_date_override;
  const toggleSyncLock = () => {
    const nextValue = isSyncLocked ? 1 : 0;
    setFormData((prev) => ({
      ...prev,
      canvas_due_date_override: nextValue,
    }));
    markUserEdited();
  };

  // Get current class color for accent
  const currentClassColor = formData.class_id
    ? classes.find((cls) => String(cls.id) === formData.class_id)?.color
    : null;

  return (
    <Box
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Stack gap="lg">
        {/* Title - Prominent, standalone */}
        <Textarea
          label={
            <Text size="sm" fw={600} mb={2}>
              Title
            </Text>
          }
          value={formData.title}
          onChange={(e) => {
            setFormData((prev) => ({
              ...prev,
              title: e.target.value,
            }));
            markUserEdited();
          }}
          autosize
          minRows={1}
          maxRows={3}
          styles={{
            input: {
              fontSize: "1rem",
              fontWeight: 500,
            },
          }}
        />

        {hasDescription && (
          <Box
            style={{ position: "relative" }}
            onMouseEnter={() => setShowDescriptionPreview(true)}
            onMouseLeave={() => setShowDescriptionPreview(false)}
          >
            <Button
              size="xs"
              variant="subtle"
              fullWidth
              styles={{
                root: {
                  justifyContent: "space-between",
                  padding: "8px 12px",
                  height: "auto",
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
              <span>View Description</span>
              <Text size="xs" c="dimmed">→</Text>
            </Button>
            <AnimatePresence>
              {showDescriptionPreview && !showDescriptionFullscreen && (
                <motion.div
                  layoutId={descriptionLayoutId}
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.15 }}
                  style={{
                    position: "absolute",
                    right: 0,
                    top: "110%",
                    width: PREVIEW_SIZE.width,
                    height: PREVIEW_SIZE.height,
                    padding: 12,
                    borderRadius: 10,
                    border: "1px solid var(--rule)",
                    backgroundColor: "var(--card)",
                    boxShadow: "var(--shadow-lg)",
                    overflow: "hidden",
                    zIndex: 5,
                    cursor: "pointer",
                  }}
                  onClick={() => {
                    setShowDescriptionPreview(false);
                    setShowDescriptionFullscreen(true);
                  }}
                >
                  <TypographyStylesProvider>
                    <div
                      style={{
                        width: PREVIEW_SIZE.contentWidth,
                        transform: `scale(${previewScale})`,
                        transformOrigin: "top left",
                        fontSize: "0.95rem",
                        lineHeight: 1.4,
                      }}
                      ref={previewContentRef}
                      dangerouslySetInnerHTML={{
                        __html: descriptionHtml,
                      }}
                    />
                  </TypographyStylesProvider>
                </motion.div>
              )}
            </AnimatePresence>
          </Box>
        )}

        {/* Status & Scheduling Section */}
        <SectionCard>
          <Stack gap="md">
            <Box>
              <Text size="sm" fw={600} mb={6} c="dimmed">
                Status
              </Text>
              {showSegmented ? (
                <SegmentedControl
                  fullWidth
                  value={formData.status}
                  onChange={(value) => {
                    setFormData((prev) => ({ ...prev, status: value }));
                    markUserEdited();
                  }}
                  color={STATUS_COLORS[formData.status]}
                  autoContrast
                  data={STATUS_OPTIONS}
                  styles={{
                    root: {
                      backgroundColor: "var(--card)",
                      padding: 3,
                    },
                    indicator: {
                      boxShadow: "var(--shadow-sm)",
                    },
                  }}
                />
              ) : (
                <Skeleton height={36} radius="sm" />
              )}
            </Box>

            <Box>
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
                                <IconLockOpen
                                  size={12}
                                  color="var(--accent-hover)"
                                />
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
                value={formData.due_date}
                onChange={(value) => {
                  setFormData((prev) => ({ ...prev, due_date: value }));
                  markUserEdited();
                }}
                disabled={isSyncLocked}
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
                    const currentTime = formData.due_date
                      ? dayjs(formData.due_date)
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
          </Stack>
        </SectionCard>

        {/* Classification Section */}
        <SectionCard accent={currentClassColor}>
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
              data={classes
                .filter(
                  (cls) =>
                    !cls.canvas_course_id ||
                    cls.is_synced ||
                    (event && cls.id === event.class_id),
                )
                .map((cls) => ({
                  value: String(cls.id),
                  label: cls.name,
                }))}
              value={formData.class_id}
              onChange={(value) => {
                setFormData((prev) => ({ ...prev, class_id: value }));
                markUserEdited();
              }}
              clearable
              renderOption={({ option }) => {
                const cls = classes.find(
                  (item) => String(item.id) === option.value,
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
                formData.class_id ? (
                  <Box
                    style={{
                      width: 10,
                      height: 10,
                      backgroundColor:
                        classes.find(
                          (cls) => String(cls.id) === formData.class_id,
                        )?.color || unassignedColor,
                      borderRadius: 2,
                      flexShrink: 0,
                    }}
                  />
                ) : null
              }
            />

            <Select
              label={
                <Text size="sm" fw={600} c="dimmed" mb={2}>
                  Event Type
                </Text>
              }
              data={EVENT_TYPES}
              value={formData.event_type}
              onChange={(value) => {
                setFormData((prev) => ({ ...prev, event_type: value }));
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
              placeholder={formData.url ? "Canvas URL" : "Add a URL (optional)"}
              value={formData.url}
              onChange={(e) => {
                setFormData((prev) => ({
                  ...prev,
                  url: e.target.value,
                }));
                markUserEdited();
              }}
              size="sm"
            />
            {formData.url && (
              <Anchor
                href={formData.url}
                target="_blank"
                size="xs"
                mt={4}
                style={{ display: "inline-block" }}
              >
                Open in Canvas →
              </Anchor>
            )}
          </Box>
        </SectionCard>

        {/* Points - always in its own card when present */}
        {event?.points_possible != null && (
          <SectionCard>
            <Group gap="xs">
              <Text size="sm" fw={600} c="dimmed">
                Points
              </Text>
              <Badge
                variant="light"
                size="sm"
                styles={{
                  root: {
                    fontWeight: 600,
                  },
                }}
              >
                {event.points_possible}
              </Badge>
            </Group>
          </SectionCard>
        )}
      </Stack>
    </Box>
  );
}
