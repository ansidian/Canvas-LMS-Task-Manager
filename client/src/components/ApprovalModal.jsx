import { useState, useEffect } from "react";
import {
  Stack,
  TextInput,
  Select,
  Textarea,
  Button,
  Group,
  Text,
  Badge,
  ActionIcon,
  Box,
  Paper,
} from "@mantine/core";
import { DateTimePicker } from "@mantine/dates";
import { IconChevronLeft, IconChevronRight, IconX } from "@tabler/icons-react";
import { motion, AnimatePresence } from "framer-motion";
import dayjs from "dayjs";
import { parseDueDate, toUTCString } from "../utils/datetime";

const EVENT_TYPES = [
  { value: "assignment", label: "Assignment" },
  { value: "quiz", label: "Quiz" },
  { value: "exam", label: "Exam" },
  { value: "homework", label: "Homework" },
  { value: "lab", label: "Lab" },
];

function Card({
  item,
  classes,
  formData,
  setFormData,
  onApprove,
  onReject,
  onClose,
  exitDirection,
}) {
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
        transition: { duration: 0.3 },
      }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
    >
      <Paper
        shadow="xl"
        p="xl"
        radius="md"
        style={{
          backgroundColor: "var(--mantine-color-body)",
          border: "1px solid var(--mantine-color-default-border)",
        }}
      >
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
            onChange={(v) => setFormData((f) => ({ ...f, dueDate: v }))}
            clearable={false}
            firstDayOfWeek={0}
            valueFormat="MMM DD, YYYY hh:mm A"
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
            timePickerProps={{
              popoverProps: { withinPortal: false },
              format: "12h",
            }}
          />

          <Select
            label="Class"
            placeholder="Select a class"
            data={classes.map((c) => ({ value: String(c.id), label: c.name }))}
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
            placeholder="Canvas URL"
            value={formData.url}
            onChange={(e) =>
              setFormData((f) => ({ ...f, url: e.target.value }))
            }
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
              <Button variant="subtle" onClick={onClose} size="md">
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
  );
}

export default function ApprovalModal({
  opened,
  onClose,
  item,
  classes,
  onApprove,
  onReject,
  pendingCount,
  currentIndex,
  onNavigate,
}) {
  const [formData, setFormData] = useState({
    dueDate: null,
    classId: null,
    eventType: "assignment",
    notes: "",
    url: "",
  });
  const [exitDirection, setExitDirection] = useState(null);

  useEffect(() => {
    if (item) {
      // Auto-select class if course name matches
      const matchingClass = classes.find(
        (c) => c.name.toLowerCase() === item.course_name?.toLowerCase()
      );

      // Parse the due_date (handles both date-only and datetime)
      const { date } = parseDueDate(item.due_date);

      console.log("[ApprovalModal] Parsing due date:", {
        original: item.due_date,
        parsed: date,
        formatted: date ? dayjs(date).format("YYYY-MM-DD HH:mm:ss") : null,
      });

      setFormData({
        dueDate: date,
        classId: matchingClass ? String(matchingClass.id) : null,
        eventType: "assignment",
        notes: "",
        url: item.url || "",
      });
      setExitDirection(null);
    }
  }, [item, classes]);

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
    setExitDirection(direction > 0 ? "right" : "left");
    setTimeout(() => {
      onNavigate(direction);
    }, 50);
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
        padding: "20px",
        paddingTop: "60px",
        overflowY: "auto",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Close button */}
      <ActionIcon
        variant="subtle"
        size="lg"
        onClick={onClose}
        style={{
          position: "absolute",
          top: "20px",
          right: "20px",
          color: "white",
        }}
      >
        <IconX size={24} />
      </ActionIcon>

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
              formData={formData}
              setFormData={setFormData}
              onApprove={handleApproveClick}
              onReject={handleRejectClick}
              onClose={onClose}
              exitDirection={exitDirection}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
