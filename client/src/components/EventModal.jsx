import { useState, useEffect } from 'react';
import {
  Modal,
  Stack,
  TextInput,
  Select,
  Textarea,
  Button,
  Group,
  Anchor,
  SegmentedControl,
  Text,
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

const STATUS_OPTIONS = [
  { value: 'incomplete', label: 'Incomplete' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'complete', label: 'Complete' },
];

export default function EventModal({ opened, onClose, event, classes, onUpdate, onDelete }) {
  const [formData, setFormData] = useState({
    title: '',
    due_date: null,
    class_id: null,
    event_type: 'assignment',
    status: 'incomplete',
    notes: '',
    url: '',
  });
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (event) {
      setFormData({
        title: event.title,
        // Add T00:00:00 to prevent timezone shift when parsing date string
        due_date: new Date(event.due_date + 'T00:00:00'),
        class_id: event.class_id ? String(event.class_id) : null,
        event_type: event.event_type || 'assignment',
        status: event.status || 'incomplete',
        notes: event.notes || '',
        url: event.url || '',
      });
      setConfirmDelete(false);
    }
  }, [event]);

  const handleSubmit = () => {
    const updates = {
      title: formData.title,
      due_date: dayjs(formData.due_date).format('YYYY-MM-DD'),
      class_id: formData.class_id ? parseInt(formData.class_id) : null,
      event_type: formData.event_type,
      status: formData.status,
      notes: formData.notes,
      url: formData.url,
    };
    console.log('[EventModal] Submitting update:', { eventId: event.id, originalStatus: event.status, newStatus: formData.status, updates });
    onUpdate(event.id, updates);
  };

  const handleDelete = () => {
    if (confirmDelete) {
      onDelete(event.id);
    } else {
      setConfirmDelete(true);
    }
  };

  if (!event) return null;

  return (
    <Modal opened={opened} onClose={onClose} title="Edit Event" size="md">
      <Stack>
        <TextInput
          label="Title"
          value={formData.title}
          onChange={(e) => setFormData((f) => ({ ...f, title: e.target.value }))}
        />

        <div>
          <Text size="sm" fw={500} mb={4}>
            Status
          </Text>
          <SegmentedControl
            fullWidth
            value={formData.status}
            onChange={(v) => setFormData((f) => ({ ...f, status: v }))}
            data={STATUS_OPTIONS}
          />
        </div>

        <DatePickerInput
          label="Due Date"
          value={formData.due_date}
          onChange={(v) => setFormData((f) => ({ ...f, due_date: v }))}
          firstDayOfWeek={0}
        />

        <Select
          label="Class"
          placeholder="Select a class"
          data={classes.map((c) => ({ value: String(c.id), label: c.name }))}
          value={formData.class_id}
          onChange={(v) => setFormData((f) => ({ ...f, class_id: v }))}
          clearable
        />

        <Select
          label="Event Type"
          data={EVENT_TYPES}
          value={formData.event_type}
          onChange={(v) => setFormData((f) => ({ ...f, event_type: v }))}
        />

        <TextInput
          label="URL"
          placeholder="Canvas URL"
          value={formData.url}
          onChange={(e) => setFormData((f) => ({ ...f, url: e.target.value }))}
        />

        {formData.url && (
          <Anchor href={formData.url} target="_blank" size="sm">
            Open in Canvas
          </Anchor>
        )}

        <Textarea
          label="Notes"
          placeholder="Add any notes..."
          minRows={3}
          value={formData.notes}
          onChange={(e) => setFormData((f) => ({ ...f, notes: e.target.value }))}
        />

        <Group justify="space-between">
          <Button
            color={confirmDelete ? 'red' : 'gray'}
            variant={confirmDelete ? 'filled' : 'subtle'}
            onClick={handleDelete}
          >
            {confirmDelete ? 'Confirm Delete' : 'Delete'}
          </Button>
          <Group>
            <Button variant="subtle" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSubmit}>Save Changes</Button>
          </Group>
        </Group>
      </Stack>
    </Modal>
  );
}
