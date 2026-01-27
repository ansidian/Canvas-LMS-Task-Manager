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
  Box,
  Loader,
} from '@mantine/core';
import { IconAlertCircle, IconInfoCircle } from '@tabler/icons-react';
import dayjs from 'dayjs';

/**
 * Format date for display in the preview table
 */
const formatDate = (dateString) => {
  if (!dateString) return 'No date';
  return dayjs(dateString).format('MMM D, YYYY');
};

/**
 * Get class name for an event
 */
const getClassName = (event, classes) => {
  if (!event) return null;
  if (!event.class_id) return 'Unassigned';
  if (!classes) return null;
  const classItem = classes.find((c) => c.id === event.class_id);
  return classItem?.name || 'Unassigned';
};

/**
 * Get display text for a duplicate event
 */
const getEventDisplay = (event, classes) => {
  if (!event) return 'N/A';
  const className = getClassName(event, classes);
  return (
    <>
      <strong>{event.title}</strong>
      <br />
      <Text size="xs" c="dimmed">
        Due: {formatDate(event.due_date)}
        {className && (
          <Text component="span" size="xs" c="dimmed" ml="xs" style={{ fontSize: '0.7rem' }}>
            • {className}
          </Text>
        )}
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
  guestClasses = [],
  guestSettings = {},
  authClasses = [],
  confirmMerge,
  isLoading = false,
  error = null,
}) {

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

  // Calculate items being added from "both" resolutions
  const bothItems = useMemo(() => {
    const bothEvents = [];
    const bothClasses = [];

    duplicateEvents.forEach((dup) => {
      if (finalResolutions[`event-${dup.id}`] === 'both') {
        bothEvents.push(dup.guest);
      }
    });

    duplicateClasses.forEach((dup) => {
      if (finalResolutions[`class-${dup.id}`] === 'both') {
        bothClasses.push(dup.guest);
      }
    });

    return {
      events: bothEvents,
      classes: bothClasses,
      count: bothEvents.length + bothClasses.length,
    };
  }, [duplicateEvents, duplicateClasses, finalResolutions]);

  const handleConfirmClick = () => {
    confirmMerge(finalResolutions);
  };

  const duplicateCount = duplicateEvents.length + duplicateClasses.length;
  const uniqueCount = uniqueGuestEvents.length + uniqueGuestClasses.length;

  const hasCanvasCredentials =
    guestSettings?.canvas_url && guestSettings?.canvas_token;

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Review Merge"
      size="xl"
      centered
      closeOnClickOutside={false}
      closeOnEscape={false}
      withCloseButton={false}
    >
      <Stack gap={16}>
        {/* Summary */}
        <Box className="modal-info-banner">
          <Group gap={8} wrap="nowrap">
            <IconInfoCircle size={18} style={{ color: 'var(--ink-blue)', flexShrink: 0 }} />
            <Text size="sm" style={{ color: 'var(--ink)' }}>
              <strong>{duplicateCount}</strong> duplicate item
              {duplicateCount !== 1 ? "s" : ""} found,{" "}
              <strong>{uniqueCount + bothItems.count}</strong> new item
              {uniqueCount + bothItems.count !== 1 ? "s" : ""} will be added
              {hasCanvasCredentials && (
                <>
                  <br />
                  Canvas credentials will be migrated to your account
                </>
              )}
            </Text>
          </Group>
        </Box>

        {/* Error display */}
        {error && (
          <Box className="modal-warning-banner">
            <Group gap={8} wrap="nowrap">
              <IconAlertCircle size={18} style={{ color: 'var(--overdue)', flexShrink: 0 }} />
              <div>
                <Text size="sm" fw={500} style={{ color: 'var(--ink)' }}>Merge Error</Text>
                <Text size="sm" style={{ color: 'var(--graphite)' }}>{error}</Text>
              </div>
            </Group>
          </Box>
        )}

        {/* Duplicate Items Section */}
        {duplicateCount > 0 && (
          <Stack gap={12}>
            <Text size="sm" fw={500} style={{ color: 'var(--ink)' }}>
              Duplicate Items
            </Text>
            <Text size="xs" style={{ color: 'var(--graphite)' }}>
              Choose which version to keep for each duplicate item
            </Text>

            <Box style={{
              border: '1px solid var(--rule)',
              borderRadius: 8,
              overflow: 'hidden'
            }}>
              <Table>
                <Table.Thead>
                  <Table.Tr style={{ backgroundColor: 'var(--parchment)' }}>
                    <Table.Th style={{ color: 'var(--graphite)', fontWeight: 500, fontSize: '0.8125rem' }}>Guest Version</Table.Th>
                    <Table.Th style={{ color: 'var(--graphite)', fontWeight: 500, fontSize: '0.8125rem' }}>Your Version</Table.Th>
                    <Table.Th style={{ color: 'var(--graphite)', fontWeight: 500, fontSize: '0.8125rem' }}>Keep</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {duplicateEvents.map((dup) => (
                    <Table.Tr key={dup.id}>
                      <Table.Td>{getEventDisplay(dup.guest, guestClasses)}</Table.Td>
                      <Table.Td>{getEventDisplay(dup.auth, authClasses)}</Table.Td>
                      <Table.Td>
                        <Select
                          size="sm"
                          value={finalResolutions[`event-${dup.id}`] || "auth"}
                          onChange={(value) =>
                            handleResolutionChange(`event-${dup.id}`, value)
                          }
                          data={[
                            { value: "auth", label: "Your version" },
                            { value: "guest", label: "Guest version" },
                            { value: "both", label: "Keep both" },
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
                          value={finalResolutions[`class-${dup.id}`] || "auth"}
                          onChange={(value) =>
                            handleResolutionChange(`class-${dup.id}`, value)
                          }
                          data={[
                            { value: "auth", label: "Your version" },
                            { value: "guest", label: "Guest version" },
                            { value: "both", label: "Keep both" },
                          ]}
                          disabled={isLoading}
                        />
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </Box>
          </Stack>
        )}

        {/* Items Being Added From Duplicates Section */}
        {bothItems.count > 0 && (
          <Stack gap={12}>
            <Text size="sm" fw={500} style={{ color: 'var(--ink)' }}>
              Items Being Added From Duplicates
            </Text>
            <Group gap={8}>
              {bothItems.events.map((event) => {
                const className = getClassName(event, guestClasses);
                return (
                  <Badge
                    key={event.id}
                    size="lg"
                    variant="light"
                    style={{
                      backgroundColor: 'rgba(230, 160, 60, 0.12)',
                      color: 'var(--ink)',
                      border: '1px solid var(--rule)'
                    }}
                  >
                    {event.title} - {formatDate(event.due_date)}
                    {className && ` (${className})`}
                  </Badge>
                );
              })}
              {bothItems.classes.map((classItem) => (
                <Badge
                  key={classItem.id}
                  size="lg"
                  variant="light"
                  style={{
                    backgroundColor: 'rgba(230, 160, 60, 0.12)',
                    color: 'var(--ink)',
                    border: '1px solid var(--rule)'
                  }}
                >
                  {classItem.name}
                </Badge>
              ))}
            </Group>
          </Stack>
        )}

        {/* New Items Section */}
        {uniqueCount > 0 && (
          <Stack gap={12}>
            <Text size="sm" fw={500} style={{ color: 'var(--ink)' }}>
              New Items to Add
            </Text>
            <Group gap={8}>
              {uniqueGuestEvents.map((event) => {
                const className = getClassName(event, guestClasses);
                return (
                  <Badge
                    key={event.id}
                    size="lg"
                    variant="light"
                    style={{
                      backgroundColor: 'var(--complete-light)',
                      color: 'var(--ink)',
                      border: '1px solid var(--rule)'
                    }}
                  >
                    {event.title} - {formatDate(event.due_date)}
                    {className && ` (${className})`}
                  </Badge>
                );
              })}
              {uniqueGuestClasses.map((classItem) => (
                <Badge
                  key={classItem.id}
                  size="lg"
                  variant="light"
                  style={{
                    backgroundColor: 'var(--ink-blue-light)',
                    color: 'var(--ink)',
                    border: '1px solid var(--rule)'
                  }}
                >
                  {classItem.name}
                </Badge>
              ))}
            </Group>
          </Stack>
        )}

        {/* No items to merge */}
        {duplicateCount === 0 && uniqueCount === 0 && (
          <Text style={{ color: 'var(--pencil)', textAlign: 'center', padding: '24px 0' }}>
            No items to merge
          </Text>
        )}

        {/* Action Buttons */}
        <Group justify="flex-end" className="modal-footer">
          <Button variant="subtle" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirmClick}
            disabled={isLoading || (duplicateCount === 0 && uniqueCount === 0)}
            leftSection={isLoading ? <Loader size="xs" /> : null}
          >
            {isLoading ? "Merging..." : "Confirm & Merge"}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
