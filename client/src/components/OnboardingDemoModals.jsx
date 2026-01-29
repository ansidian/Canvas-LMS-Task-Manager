import { useState } from "react";
import {
  Stack,
  Select,
  Button,
  Group,
  Text,
  Badge,
  ActionIcon,
  Box,
  Paper,
  SegmentedControl,
  Textarea,
  useMantineColorScheme,
  Popover,
} from "@mantine/core";
import { DateTimePicker } from "@mantine/dates";
import { OnboardingTour } from "@gfazioli/mantine-onboarding-tour";
import { IconX, IconFileText } from "@tabler/icons-react";
import dayjs from "dayjs";
import { EVENT_TYPES, EVENT_TYPE_ICONS } from "./event-modal/constants";

const STATUS_COLORS = {
  incomplete: "#78716C",   // pencil - muted neutral
  in_progress: "#8B6BC0", // violet blend
  complete: "#4A9968",    // earthy green blend
};

const STATUS_OPTIONS = [
  { value: "incomplete", label: "Incomplete" },
  { value: "in_progress", label: "In Progress" },
  { value: "complete", label: "Complete" },
];

// Demo data for the approval modal
export const DEMO_PENDING_ITEM = {
  canvas_id: "demo-123-456",
  title: "Homework 2",
  course_name: "Computer Science Recapitulation (CS4963)",
  due_date: dayjs().add(3, "day").format("YYYY-MM-DD"),
  points_possible: 25,
  description:
    "<p>Complete the reading quiz covering Chapter 5: Memory and Cognition.</p>",
  url: "https://canvas.example.edu/courses/123/assignments/456",
};

// Demo data for the event modal
export const DEMO_EVENT = {
  id: "demo-event-789",
  title: "Homework 2",
  due_date: dayjs().add(3, "day").toDate(),
  class_id: null,
  event_type: "homework",
  status: "in_progress",
  notes: "",
  url: "https://canvas.example.edu/courses/123/assignments/456",
  points_possible: 25,
  description:
    "<p>Complete the reading quiz covering Chapter 5: Memory and Cognition.</p>",
};

// Demo Approval Modal for onboarding
export function DemoApprovalModal({ onClose, visible = true }) {
  const [formData, setFormData] = useState({
    dueDate: dayjs().add(3, "day").toDate(),
    classId: "demo",
    eventType: DEMO_EVENT.event_type,
    notes: "Review the study guide before starting.",
    url: DEMO_PENDING_ITEM.url,
  });

  const callouts = [
    {
      label: "Due Date",
      description:
        "Adjust when this assignment is due. CTM auto-detects this from Canvas.",
      offset: { mainAxis: 12, crossAxis: -20 },
    },
    {
      label: "Class Selection",
      description:
        "Assign to a class. If able, CTM matches this automatically.",
      offset: { mainAxis: 12, crossAxis: -4 },
    },
    {
      label: "Event Type",
      description:
        "Categorize as quiz, exam, homework, etc. Auto-detected from title keywords.",
      offset: { mainAxis: 12, crossAxis: 12 },
    },
    {
      label: "Notes",
      description:
        "Add personal notes. You can @mention other events to create links between them.",
      offset: { mainAxis: 12, crossAxis: 18 },
    },
    {
      label: "Actions",
      description:
        "Reject to hide from pending, or Add to Calendar to create the event.",
      offset: { mainAxis: 15, crossAxis: 0 },
    },
  ];

  return (
    <div
      className="onboarding-demo-modal modal-overlay-custom"
      style={{
        backgroundColor: visible ? "rgba(0, 0, 0, 0.6)" : "transparent",
        zIndex: 150,
        opacity: visible ? 1 : 0,
        pointerEvents: visible ? "auto" : "none",
      }}
    >
      {/* Use OnboardingTour.Target so the library tracks the real modal element and stays aligned on resize/devtools toggles. */}
      <OnboardingTour.Target id="demo-approval-modal">
        <Paper
          className="modal-card"
          p="xl"
          style={{
            position: "relative",
            width: "100%",
            maxWidth: "500px",
          }}
        >
          <ActionIcon
            variant="subtle"
            size="lg"
            onClick={onClose}
            style={{
              position: "absolute",
              top: "12px",
              right: "12px",
            }}
          >
            <IconX size={20} />
          </ActionIcon>

          <Stack gap={16}>
            <Box>
              <Text fw={600} size="lg">
                {DEMO_PENDING_ITEM.title}
              </Text>
              <Text size="sm" c="dimmed">
                Course: {DEMO_PENDING_ITEM.course_name}
              </Text>
            </Box>

            <Box>
              <Text size="sm" fw={500} mb={4}>
                Due Date & Time
              </Text>
              <Popover
                opened
                position="right"
                withArrow
                shadow="md"
                width={220}
                zIndex={260}
                offset={callouts[0].offset}
              >
                <Popover.Target>
                  <Box>
                    <DateTimePicker
                      value={formData.dueDate}
                      onChange={(v) =>
                        setFormData((f) => ({
                          ...f,
                          dueDate: v,
                        }))
                      }
                      firstDayOfWeek={0}
                      valueFormat="MMM DD, YYYY hh:mm A"
                    />
                  </Box>
                </Popover.Target>
                <Popover.Dropdown>
                  <Text size="sm" fw={600} mb={4}>
                    {callouts[0].label}
                  </Text>
                  <Text size="xs" c="dimmed">
                    {callouts[0].description}
                  </Text>
                </Popover.Dropdown>
              </Popover>
            </Box>

            <Box>
              <Text size="sm" fw={500} mb={4}>
                Class
              </Text>
              <Popover
                opened
                position="right"
                withArrow
                shadow="md"
                width={220}
                zIndex={260}
                offset={callouts[1].offset}
              >
                <Popover.Target>
                  <Box>
                    <Select
                      placeholder="Select a class"
                      data={[
                        { value: "", label: "Unassigned" },
                        {
                          value: "demo",
                          label: "Computer Science Recapitulation (CS4963)",
                        },
                      ]}
                      value={formData.classId || ""}
                      onChange={(v) =>
                        setFormData((f) => ({
                          ...f,
                          classId: v || null,
                        }))
                      }
                      searchable
                    />
                  </Box>
                </Popover.Target>
                <Popover.Dropdown>
                  <Text size="sm" fw={600} mb={4}>
                    {callouts[1].label}
                  </Text>
                  <Text size="xs" c="dimmed">
                    {callouts[1].description}
                  </Text>
                </Popover.Dropdown>
              </Popover>
            </Box>

            <Box>
              <Text size="sm" fw={500} mb={4}>
                Event Type
              </Text>
              <Popover
                opened
                position="right"
                withArrow
                shadow="md"
                width={220}
                zIndex={260}
                offset={callouts[2].offset}
              >
                <Popover.Target>
                  <Box>
                    <Select
                      data={EVENT_TYPES}
                      value={formData.eventType}
                      onChange={(v) =>
                        setFormData((f) => ({
                          ...f,
                          eventType: v,
                        }))
                      }
                      searchable
                      allowDeselect={false}
                      selectFirstOptionOnChange
                      renderOption={({ option }) => {
                        const Icon =
                          EVENT_TYPE_ICONS[option.value] || IconFileText;
                        return (
                          <Group gap="xs" wrap="nowrap">
                            <Icon
                              size={16}
                              style={{ opacity: 0.7, flexShrink: 0 }}
                            />
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
                  </Box>
                </Popover.Target>
                <Popover.Dropdown>
                  <Text size="sm" fw={600} mb={4}>
                    {callouts[2].label}
                  </Text>
                  <Text size="xs" c="dimmed">
                    {callouts[2].description}
                  </Text>
                </Popover.Dropdown>
              </Popover>
            </Box>

            <Box>
              <Text size="sm" fw={500} mb={4}>
                Notes
              </Text>
              <Popover
                opened
                position="right"
                withArrow
                shadow="md"
                width={220}
                zIndex={260}
                offset={callouts[3].offset}
              >
                <Popover.Target>
                  <Box>
                    <Textarea
                      placeholder="Add any notes..."
                      value={formData.notes}
                      onChange={(e) =>
                        setFormData((f) => ({
                          ...f,
                          notes: e.target.value,
                        }))
                      }
                      minRows={2}
                    />
                  </Box>
                </Popover.Target>
                <Popover.Dropdown>
                  <Text size="sm" fw={600} mb={4}>
                    {callouts[3].label}
                  </Text>
                  <Text size="xs" c="dimmed">
                    {callouts[3].description}
                  </Text>
                </Popover.Dropdown>
              </Popover>
            </Box>

            {DEMO_PENDING_ITEM.points_possible && (
              <Group gap="xs">
                <Text size="sm" fw={500}>
                  Points
                </Text>
                <Badge variant="light">
                  {DEMO_PENDING_ITEM.points_possible}
                </Badge>
              </Group>
            )}

            <Popover
              opened
              position="bottom"
              withArrow
              shadow="md"
              width={240}
              zIndex={260}
              offset={callouts[4].offset}
            >
              <Popover.Target>
                <Box>
                  <Group justify="space-between" mt="md">
                    <Button variant="light" color="red" size="md" disabled>
                      Reject
                    </Button>
                    <Group>
                      <Button variant="subtle" size="md" disabled>
                        Cancel
                      </Button>
                      <Button size="md" disabled>
                        Add to Calendar
                      </Button>
                    </Group>
                  </Group>
                </Box>
              </Popover.Target>
              <Popover.Dropdown>
                <Text size="sm" fw={600} mb={4}>
                  {callouts[4].label}
                </Text>
                <Text size="xs" c="dimmed">
                  {callouts[4].description}
                </Text>
              </Popover.Dropdown>
            </Popover>
          </Stack>
        </Paper>
      </OnboardingTour.Target>
    </div>
  );
}

// Demo Event Modal for onboarding
export function DemoEventModal({ onClose, visible = true }) {
  const { colorScheme } = useMantineColorScheme();
  const [formData, setFormData] = useState({
    title: DEMO_EVENT.title,
    due_date: DEMO_EVENT.due_date,
    class_id: "demo",
    event_type: DEMO_EVENT.event_type,
    status: DEMO_EVENT.status,
    notes: "@Homework 1	",
    url: DEMO_EVENT.url,
  });

  const callouts = [
    {
      label: "Title",
      description: "Edit the event title.",
      offset: { mainAxis: 12, crossAxis: -25 },
    },
    {
      label: "Status Tracking",
      description:
        "Track progress: Incomplete, In Progress, or Complete. Submitting auto marks as complete.",
      offset: { mainAxis: 12, crossAxis: -5 },
    },
    {
      label: "Due Date",
      description:
        "Change the due date and time. Drag events on the calendar for quick rescheduling.",
      offset: { mainAxis: 12, crossAxis: 25 },
    },
    {
      label: "Canvas Submission",
      description:
        "Submit directly to Canvas. Use at your own risk, but it does verify with Canvas so it should be pretty safe. Recommended that you verify.",
      offset: { mainAxis: 12, crossAxis: 28 },
    },
    {
      label: "Event Type",
      description:
        "Categorize as quiz, exam, homework, etc. Auto-detected from title keywords.",
      offset: { mainAxis: 12, crossAxis: -15 },
    },
    {
      label: "Notes",
      description: "Add notes with @mentions to link related events together.",
      offset: { mainAxis: 12, crossAxis: 35 },
    },
  ];

  return (
    <div
      className="onboarding-demo-modal modal-overlay-custom"
      style={{
        backgroundColor: visible ? "rgba(0, 0, 0, 0.6)" : "transparent",
        zIndex: 150,
        opacity: visible ? 1 : 0,
        pointerEvents: visible ? "auto" : "none",
      }}
    >
      {/* Use OnboardingTour.Target so the library tracks the real modal element and stays aligned on resize/devtools toggles. */}
      <OnboardingTour.Target id="demo-event-modal">
        <Paper
          className="modal-card"
          p="lg"
          style={{
            position: "relative",
            width: "100%",
            maxWidth: "480px",
            maxHeight: "85vh",
            overflowY: "auto",
          }}
        >
          <Group justify="space-between" mb="md">
            <Text fw={600}>Edit Event</Text>
            <ActionIcon variant="subtle" onClick={onClose}>
              <IconX size={18} />
            </ActionIcon>
          </Group>

          <Stack>
            <Box>
              <Text size="sm" fw={500} mb={4}>
                Title
              </Text>
              <Popover
                opened
                position="right"
                withArrow
                shadow="md"
                width={200}
                zIndex={260}
                offset={callouts[0].offset}
              >
                <Popover.Target>
                  <Box>
                    <Textarea
                      value={formData.title}
                      onChange={(e) =>
                        setFormData((f) => ({
                          ...f,
                          title: e.target.value,
                        }))
                      }
                      autosize
                      minRows={1}
                      maxRows={3}
                    />
                  </Box>
                </Popover.Target>
                <Popover.Dropdown>
                  <Text size="sm" fw={600} mb={4}>
                    {callouts[0].label}
                  </Text>
                  <Text size="xs" c="dimmed">
                    {callouts[0].description}
                  </Text>
                </Popover.Dropdown>
              </Popover>
            </Box>

            <Box>
              <Text size="sm" fw={500} mb={4}>
                Status
              </Text>
              <Popover
                opened
                position="right"
                withArrow
                shadow="md"
                width={220}
                zIndex={260}
                offset={callouts[1].offset}
              >
                <Popover.Target>
                  <Box>
                    <SegmentedControl
                      fullWidth
                      value={formData.status}
                      onChange={(v) =>
                        setFormData((f) => ({
                          ...f,
                          status: v,
                        }))
                      }
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
                  </Box>
                </Popover.Target>
                <Popover.Dropdown>
                  <Text size="sm" fw={600} mb={4}>
                    {callouts[1].label}
                  </Text>
                  <Text size="xs" c="dimmed">
                    {callouts[1].description}
                  </Text>
                </Popover.Dropdown>
              </Popover>
            </Box>

            <Box>
              <Text size="sm" fw={500} mb={4}>
                Due Date & Time
              </Text>
              <Popover
                opened
                position="right"
                withArrow
                shadow="md"
                width={200}
                zIndex={260}
                offset={callouts[2].offset}
              >
                <Popover.Target>
                  <Box>
                    <DateTimePicker
                      value={formData.due_date}
                      onChange={(v) =>
                        setFormData((f) => ({
                          ...f,
                          due_date: v,
                        }))
                      }
                      firstDayOfWeek={0}
                      valueFormat="MMM DD, YYYY hh:mm A"
                    />
                  </Box>
                </Popover.Target>
                <Popover.Dropdown>
                  <Text size="sm" fw={600} mb={4}>
                    {callouts[2].label}
                  </Text>
                  <Text size="xs" c="dimmed">
                    {callouts[2].description}
                  </Text>
                </Popover.Dropdown>
              </Popover>
            </Box>

            <Select
              label="Class"
              placeholder="Select a class"
              data={[
                { value: "", label: "Unassigned" },
                {
                  value: "demo",
                  label: "Computer Science Recapitulation (CS4963)",
                },
              ]}
              value={formData.class_id || ""}
              onChange={(v) =>
                setFormData((f) => ({ ...f, class_id: v || null }))
              }
              searchable
            />

            <Box>
              <Text size="sm" fw={500} mb={4}>
                Event Type
              </Text>
              <Popover
                opened
                position="right"
                withArrow
                shadow="md"
                width={210}
                zIndex={260}
                offset={callouts[4].offset}
              >
                <Popover.Target>
                  <Box>
                    <Select
                      data={EVENT_TYPES}
                      value={formData.event_type}
                      onChange={(v) =>
                        setFormData((f) => ({
                          ...f,
                          event_type: v,
                        }))
                      }
                      searchable
                      selectFirstOptionOnChange
                      renderOption={({ option }) => {
                        const Icon =
                          EVENT_TYPE_ICONS[option.value] || IconFileText;
                        return (
                          <Group gap="xs" wrap="nowrap">
                            <Icon
                              size={16}
                              style={{ opacity: 0.7, flexShrink: 0 }}
                            />
                            <Text size="sm">{option.label}</Text>
                          </Group>
                        );
                      }}
                      leftSection={(() => {
                        const Icon =
                          EVENT_TYPE_ICONS[formData.event_type] || IconFileText;
                        return <Icon size={16} style={{ opacity: 0.7 }} />;
                      })()}
                    />
                  </Box>
                </Popover.Target>
                <Popover.Dropdown>
                  <Text size="sm" fw={600} mb={4}>
                    {callouts[4].label}
                  </Text>
                  <Text size="xs" c="dimmed">
                    {callouts[4].description}
                  </Text>
                </Popover.Dropdown>
              </Popover>
            </Box>

            <Popover
              opened
              position="right"
              withArrow
              shadow="md"
              width={220}
              zIndex={260}
              offset={callouts[3].offset}
            >
              <Popover.Target>
                <Box>
                  <Box
                    p="sm"
                    style={{
                      border: "1px dashed var(--mantine-color-default-border)",
                      borderRadius: 8,
                      backgroundColor:
                        colorScheme === "dark"
                          ? "var(--mantine-color-dark-6)"
                          : "var(--mantine-color-gray-0)",
                    }}
                  >
                    <Text size="sm" fw={500} mb={4}>
                      Canvas Submission
                    </Text>
                    <Text size="xs" c="dimmed">
                      When linked to Canvas, submit files, text, or URLs
                      directly from here.
                    </Text>
                  </Box>
                </Box>
              </Popover.Target>
              <Popover.Dropdown>
                <Text size="sm" fw={600} mb={4}>
                  {callouts[3].label}
                </Text>
                <Text size="xs" c="dimmed">
                  {callouts[3].description}
                </Text>
              </Popover.Dropdown>
            </Popover>

            <Box>
              <Text size="sm" fw={500} mb={4}>
                Notes
              </Text>
              <Popover
                opened
                position="right"
                withArrow
                shadow="md"
                width={200}
                zIndex={260}
                offset={callouts[5].offset}
              >
                <Popover.Target>
                  <Box>
                    <Textarea
                      placeholder="Add any notes... Use @ to mention other events"
                      value={formData.notes}
                      onChange={(e) =>
                        setFormData((f) => ({
                          ...f,
                          notes: e.target.value,
                        }))
                      }
                      minRows={2}
                    />
                  </Box>
                </Popover.Target>
                <Popover.Dropdown>
                  <Text size="sm" fw={600} mb={4}>
                    {callouts[5].label}
                  </Text>
                  <Text size="xs" c="dimmed">
                    {callouts[5].description}
                  </Text>
                </Popover.Dropdown>
              </Popover>
            </Box>

            <Group justify="space-between">
              <Button color="gray" variant="subtle" disabled>
                Delete
              </Button>
              <Group>
                <Button variant="subtle" disabled>
                  Cancel
                </Button>
                <Button disabled>Save Changes</Button>
              </Group>
            </Group>
          </Stack>
        </Paper>
      </OnboardingTour.Target>
    </div>
  );
}
