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
import { IconLock, IconLockOpen } from "@tabler/icons-react";
import { EVENT_TYPES, PREVIEW_SIZE, STATUS_COLORS, STATUS_OPTIONS } from "./constants";

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

  return (
    <Box
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Stack gap="md">
        <Textarea
          label="Title"
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
        />

        {hasDescription && (
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
                        padding: 10,
                        borderRadius: 10,
                        border:
                          "1px solid var(--mantine-color-default-border)",
                        backgroundColor: "var(--mantine-color-body)",
                        boxShadow: "0 12px 28px rgba(0, 0, 0, 0.18)",
                        overflow: "hidden",
                        zIndex: 5,
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
            </Group>
          </Box>
        )}

        <Box>
          <Text size="sm" fw={500} mb={4}>
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
                  backgroundColor:
                    colorScheme === "dark"
                      ? "var(--mantine-color-dark-6)"
                      : "var(--mantine-color-gray-1)",
                  padding: 4,
                },
                indicator: {
                  boxShadow: "none",
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
                            <IconLock size={14} />
                          ) : (
                            <IconLockOpen size={14} />
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

        <Box>
          <Select
            label="Class"
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
                      width: 12,
                      height: 12,
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
                    width: 12,
                    height: 12,
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
        </Box>

        <Box>
          <Select
            label="Event Type"
            data={EVENT_TYPES}
            value={formData.event_type}
            onChange={(value) => {
              setFormData((prev) => ({ ...prev, event_type: value }));
              markUserEdited();
            }}
          />
        </Box>

        <Box>
          <TextInput
            label="URL"
            placeholder="Canvas URL"
            value={formData.url}
            onChange={(e) => {
              setFormData((prev) => ({
                ...prev,
                url: e.target.value,
              }));
              markUserEdited();
            }}
          />
          {formData.url && (
            <Anchor href={formData.url} target="_blank" size="sm">
              Open in Canvas
            </Anchor>
          )}
        </Box>

        {event?.points_possible !== null &&
          event?.points_possible !== undefined && (
            <Group gap="xs">
              <Text size="sm" fw={500}>
                Points
              </Text>
              <Badge variant="light">{event.points_possible}</Badge>
            </Group>
          )}
      </Stack>
    </Box>
  );
}
