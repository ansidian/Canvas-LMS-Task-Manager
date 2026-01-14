import { useState, useEffect } from 'react';
import {
  Modal,
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
} from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import { IconChevronLeft, IconChevronRight } from '@tabler/icons-react';
import dayjs from 'dayjs';

const EVENT_TYPES = [
  { value: 'assignment', label: 'Assignment' },
  { value: 'quiz', label: 'Quiz' },
  { value: 'exam', label: 'Exam' },
  { value: 'homework', label: 'Homework' },
  { value: 'lab', label: 'Lab' },
];

export default function ApprovalModal({
  opened,
  onClose,
  item,
  classes,
  onApprove,
  pendingCount,
  currentIndex,
  onNavigate,
}) {
  const [formData, setFormData] = useState({
    dueDate: null,
    classId: null,
    eventType: 'assignment',
    notes: '',
    url: '',
  });

  useEffect(() => {
    if (item) {
      // Auto-select class if course name matches
      const matchingClass = classes.find(
        (c) => c.name.toLowerCase() === item.course_name?.toLowerCase()
      );
      setFormData({
        dueDate: item.due_date ? new Date(item.due_date + 'T00:00:00') : null,
        classId: matchingClass ? String(matchingClass.id) : null,
        eventType: 'assignment',
        notes: '',
        url: item.url || '',
      });
    }
  }, [item, classes]);

  const handleSubmit = () => {
    onApprove(item, {
      ...formData,
      dueDate: formData.dueDate ? dayjs(formData.dueDate).format('YYYY-MM-DD') : item.due_date,
    });
  };

  const canGoPrev = currentIndex > 0;
  const canGoNext = currentIndex < pendingCount - 1;

  if (!item) return null;

  return (
    <Modal opened={opened} onClose={onClose} title="Approve Assignment" size="md">
      <Group justify="space-between" align="center" mb="md">
        <ActionIcon
          variant="subtle"
          size="lg"
          onClick={() => onNavigate(-1)}
          disabled={!canGoPrev}
        >
          <IconChevronLeft size={20} />
        </ActionIcon>

        <Badge variant="light" color="blue">
          {currentIndex + 1} of {pendingCount}
        </Badge>

        <ActionIcon
          variant="subtle"
          size="lg"
          onClick={() => onNavigate(1)}
          disabled={!canGoNext}
        >
          <IconChevronRight size={20} />
        </ActionIcon>
      </Group>

      <Stack>
        <Box>
          <Text fw={500}>{item.title}</Text>
          <Text size="sm" c="dimmed">
            Course: {item.course_name}
          </Text>
        </Box>

        <DatePickerInput
          label="Due Date"
          value={formData.dueDate}
          onChange={(v) => setFormData((f) => ({ ...f, dueDate: v }))}
          clearable={false}
          firstDayOfWeek={0}
        />

        <Select
          label="Class"
          placeholder="Select a class"
          data={classes.map((c) => ({ value: String(c.id), label: c.name }))}
          value={formData.classId}
          onChange={(v) => setFormData((f) => ({ ...f, classId: v }))}
          clearable
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
          onChange={(e) => setFormData((f) => ({ ...f, url: e.target.value }))}
        />

        <Textarea
          label="Notes"
          placeholder="Add any notes..."
          minRows={3}
          value={formData.notes}
          onChange={(e) => setFormData((f) => ({ ...f, notes: e.target.value }))}
        />

        <Group justify="flex-end">
          <Button variant="subtle" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>Add to Calendar</Button>
        </Group>
      </Stack>
    </Modal>
  );
}
