import { useState, useEffect, useRef } from 'react';
import {
  Modal,
  Stack,
  TextInput,
  Select,
  Textarea,
  Button,
  Group,
} from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import dayjs from 'dayjs';

const EVENT_TYPES = [
  { value: 'assignment', label: 'Assignment' },
  { value: 'quiz', label: 'Quiz' },
  { value: 'exam', label: 'Exam' },
  { value: 'homework', label: 'Homework' },
  { value: 'lab', label: 'Lab' },
];

export default function CreateEventModal({ opened, onClose, date, classes, onCreate }) {
  const titleRef = useRef(null);
  const [formData, setFormData] = useState({
    title: '',
    dueDate: null,
    classId: null,
    eventType: 'assignment',
    notes: '',
    url: '',
  });

  useEffect(() => {
    if (date) {
      setFormData({
        title: '',
        dueDate: new Date(date + 'T00:00:00'),
        classId: null,
        eventType: 'assignment',
        notes: '',
        url: '',
      });
    }
  }, [date]);

  // Focus title input when modal opens
  useEffect(() => {
    if (opened && titleRef.current) {
      setTimeout(() => {
        titleRef.current?.focus();
      }, 100);
    }
  }, [opened]);

  const handleSubmit = () => {
    if (!formData.title.trim()) return;

    onCreate({
      title: formData.title.trim(),
      due_date: dayjs(formData.dueDate).format('YYYY-MM-DD'),
      class_id: formData.classId ? parseInt(formData.classId) : null,
      event_type: formData.eventType,
      notes: formData.notes,
      url: formData.url,
    });
  };

  return (
    <Modal opened={opened} onClose={onClose} title="Create Event" size="md">
      <Stack>
        <TextInput
          ref={titleRef}
          label="Title"
          placeholder="Event title"
          value={formData.title}
          onChange={(e) => setFormData((f) => ({ ...f, title: e.target.value }))}
          required
          data-autofocus
        />

        <DatePickerInput
          label="Due Date"
          value={formData.dueDate}
          onChange={(v) => setFormData((f) => ({ ...f, dueDate: v }))}
          clearable={false}
          firstDayOfWeek={0}
        />

        <Select
          label="Class"
          placeholder="Select a class (optional)"
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
          placeholder="Link (optional)"
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
          <Button onClick={handleSubmit} disabled={!formData.title.trim()}>
            Create Event
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
