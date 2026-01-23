import { useState, useMemo } from 'react';
import {
  Modal,
  Table,
  Badge,
  Button,
  Group,
  Stack,
  Select,
  Text,
  Title,
  Divider,
  Alert,
  Loader,
} from '@mantine/core';
import { IconAlertCircle, IconInfoCircle } from '@tabler/icons-react';
import dayjs from 'dayjs';
import useMergeFlow from '../../hooks/useMergeFlow';

/**
 * Format date for display in the preview table
 */
const formatDate = (dateString) => {
  if (!dateString) return 'No date';
  return dayjs(dateString).format('MMM D, YYYY');
};

/**
 * Get display text for a duplicate event
 */
const getEventDisplay = (event) => {
  if (!event) return 'N/A';
  return (
    <>
      <strong>{event.title}</strong>
      <br />
      <Text size="xs" c="dimmed">
        Due: {formatDate(event.due_date)}
      </Text>
    </>
  );
};

/**
 * Get display text for a duplicate class
 */
const getClassDisplay = (classItem) => {
  if (!classItem) return 'N/A';
  return (
    <>
      <strong>{classItem.name}</strong>
      {classItem.color && (
        <>
          <br />
          <Badge
            size="xs"
            style={{ backgroundColor: classItem.color }}
            variant="filled"
          >
            {classItem.color}
          </Badge>
        </>
      )}
    </>
  );
};

/**
 * Modal for previewing and confirming merge between guest and authenticated data.
 * Shows duplicate items with resolution controls and unique items to be added.
 */
export default function MergePreviewModal({
  opened,
  onClose,
  duplicateEvents = [],
  duplicateClasses = [],
  uniqueGuestEvents = [],
  uniqueGuestClasses = [],
  guestSessionId,
  guestClasses = [],
  guestEvents = [],
  guestSettings = {},
  onConfirm,
  api = { post: fetch }, // API client with auth
}) {
  const { confirmMerge, isLoading, error } = useMergeFlow(
    api,
    guestSessionId
  );

  // Track resolution choices for duplicates
  // Format: { 'event-{id}': 'auth' | 'guest' | 'both', 'class-{id}': ... }
  const [resolutions, setResolutions] = useState({});

  // Initialize default resolutions to 'auth' (keep your version)
  const defaultResolutions = useMemo(() => {
    const defaults = {};
    duplicateEvents.forEach((dup) => {
      defaults[`event-${dup.id}`] = 'auth';
    });
    duplicateClasses.forEach((dup) => {
      defaults[`class-${dup.id}`] = 'auth';
    });
    return defaults;
  }, [duplicateEvents, duplicateClasses]);

  // Merge default resolutions with user choices
  const finalResolutions = useMemo(
    () => ({ ...defaultResolutions, ...resolutions }),
    [defaultResolutions, resolutions]
  );

  const handleResolutionChange = (duplicateId, choice) => {
    setResolutions((prev) => ({
      ...prev,
      [duplicateId]: choice,
    }));
  };

  const handleConfirmClick = async () => {
    try {
      await confirmMerge(finalResolutions, {
        classes: guestClasses,
        events: guestEvents,
        settings: guestSettings,
      });

      // Call parent callback if provided
      if (onConfirm) {
        onConfirm(finalResolutions);
      }
    } catch (err) {
      // Error is already handled and displayed by useMergeFlow
      console.error('[MergePreviewModal] Merge failed:', err);
    }
  };

  const duplicateCount = duplicateEvents.length + duplicateClasses.length;
  const uniqueCount = uniqueGuestEvents.length + uniqueGuestClasses.length;

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={<Title order={3}>Review Merge</Title>}
      size="xl"
      centered
    >
      <Stack gap="md">
        {/* Summary */}
        <Alert icon={<IconInfoCircle size={16} />} color="blue">
          <Text size="sm">
            <strong>{duplicateCount}</strong> duplicate item
            {duplicateCount !== 1 ? 's' : ''} found,{' '}
            <strong>{uniqueCount}</strong> new item{uniqueCount !== 1 ? 's' : ''}{' '}
            will be added
          </Text>
        </Alert>

        {/* Error display */}
        {error && (
          <Alert icon={<IconAlertCircle size={16} />} color="red" title="Merge Error">
            {error}
          </Alert>
        )}

        {/* Duplicate Items Section */}
        {duplicateCount > 0 && (
          <>
            <Divider label="Duplicate Items" labelPosition="center" />
            <Text size="sm" c="dimmed">
              Choose which version to keep for each duplicate item
            </Text>

            <Table striped highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Guest Version</Table.Th>
                  <Table.Th>Your Version</Table.Th>
                  <Table.Th>Keep</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {duplicateEvents.map((dup) => (
                  <Table.Tr key={dup.id}>
                    <Table.Td>{getEventDisplay(dup.guest)}</Table.Td>
                    <Table.Td>{getEventDisplay(dup.auth)}</Table.Td>
                    <Table.Td>
                      <Select
                        size="sm"
                        value={finalResolutions[`event-${dup.id}`] || 'auth'}
                        onChange={(value) =>
                          handleResolutionChange(`event-${dup.id}`, value)
                        }
                        data={[
                          { value: 'auth', label: 'Your version' },
                          { value: 'guest', label: 'Guest version' },
                          { value: 'both', label: 'Keep both' },
                        ]}
                        disabled={isLoading}
                      />
                    </Table.Td>
                  </Table.Tr>
                ))}
                {duplicateClasses.map((dup) => (
                  <Table.Tr key={dup.id}>
                    <Table.Td>{getClassDisplay(dup.guest)}</Table.Td>
                    <Table.Td>{getClassDisplay(dup.auth)}</Table.Td>
                    <Table.Td>
                      <Select
                        size="sm"
                        value={finalResolutions[`class-${dup.id}`] || 'auth'}
                        onChange={(value) =>
                          handleResolutionChange(`class-${dup.id}`, value)
                        }
                        data={[
                          { value: 'auth', label: 'Your version' },
                          { value: 'guest', label: 'Guest version' },
                          { value: 'both', label: 'Keep both' },
                        ]}
                        disabled={isLoading}
                      />
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </>
        )}

        {/* New Items Section */}
        {uniqueCount > 0 && (
          <>
            <Divider label="New Items to Add" labelPosition="center" />
            <Stack gap="xs">
              {uniqueGuestEvents.map((event) => (
                <Badge key={event.id} size="lg" variant="light" color="green">
                  {event.title} - {formatDate(event.due_date)}
                </Badge>
              ))}
              {uniqueGuestClasses.map((classItem) => (
                <Badge key={classItem.id} size="lg" variant="light" color="blue">
                  {classItem.name}
                </Badge>
              ))}
            </Stack>
          </>
        )}

        {/* No items to merge */}
        {duplicateCount === 0 && uniqueCount === 0 && (
          <Text c="dimmed" ta="center">
            No items to merge
          </Text>
        )}

        {/* Action Buttons */}
        <Group justify="flex-end" mt="md">
          <Button variant="subtle" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirmClick}
            disabled={isLoading || (duplicateCount === 0 && uniqueCount === 0)}
            leftSection={isLoading ? <Loader size="xs" /> : null}
          >
            {isLoading ? 'Merging...' : 'Confirm & Merge'}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
