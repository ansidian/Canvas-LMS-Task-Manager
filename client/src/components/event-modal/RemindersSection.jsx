import { useState } from "react";
import {
  ActionIcon,
  Badge,
  Box,
  Collapse,
  Group,
  NumberInput,
  Popover,
  Select,
  Stack,
  Text,
  Tooltip,
  UnstyledButton,
} from "@mantine/core";
import { IconBell, IconCheck, IconChevronDown, IconChevronUp, IconPlus, IconX } from "@tabler/icons-react";

const BEFORE_PRESETS = [
  { label: "At due time", offsetMinutes: 0 },
  { label: "30 min before", offsetMinutes: -30 },
  { label: "1 hour before", offsetMinutes: -60 },
  { label: "1 day before", offsetMinutes: -1440 },
];

/**
 * For past events, generate presets that fire at "now + X" expressed as
 * an offset from the (past) due_date. This way "in 30 min" is always actionable.
 */
function buildFuturePresets(dueDate) {
  if (!dueDate) return [];
  const due = dueDate instanceof Date ? dueDate : new Date(dueDate);
  const now = Date.now();
  // minutes from due_date to now (positive = due is in the past)
  const minsIntoPast = Math.round((now - due.getTime()) / 60_000);
  return [
    { label: "In 30 min", offsetMinutes: minsIntoPast + 30 },
    { label: "In 1 hour", offsetMinutes: minsIntoPast + 60 },
    { label: "In 1 day", offsetMinutes: minsIntoPast + 1440 },
  ];
}

/**
 * Format an offset cleanly. For "clean" offsets (multiples of 60/1440) shows
 * relative label ("1h before"). For irregular offsets (from past-event quick presets),
 * shows the wall-clock fire time instead ("Feb 26, 3:45 PM").
 */
export function formatOffsetLabel(offsetMinutes, dueDate) {
  if (offsetMinutes === 0) return "At due time";
  const abs = Math.abs(offsetMinutes);
  const direction = offsetMinutes < 0 ? "before" : "after";

  if (abs % 1440 === 0) {
    const d = abs / 1440;
    return `${d}d ${direction}`;
  }
  if (abs % 60 === 0) {
    const h = abs / 60;
    return `${h}h ${direction}`;
  }
  if (abs < 120 && (abs % 30 === 0 || abs % 15 === 0 || abs % 5 === 0)) {
    return `${abs} min ${direction}`;
  }
  // Irregular offset (e.g. from a "fire in 30 min" on a past event) —
  // show the actual wall-clock time instead of a confusing number.
  if (dueDate) {
    const due = dueDate instanceof Date ? dueDate : new Date(dueDate);
    const fireAt = new Date(due.getTime() + offsetMinutes * 60_000);
    const now = new Date();
    const isToday = fireAt.toDateString() === now.toDateString();
    const timeStr = fireAt.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    if (isToday) return timeStr;
    const dateStr = fireAt.toLocaleDateString([], { month: "short", day: "numeric" });
    return `${dateStr}, ${timeStr}`;
  }
  return `${abs} min ${direction}`;
}

function computeOffset(value, unit, direction) {
  if (!value || value <= 0) return 0;
  let minutes = value;
  if (unit === "hours") minutes = value * 60;
  if (unit === "days") minutes = value * 1440;
  return direction === "before" ? -minutes : minutes;
}

function isOffsetInPast(offsetMinutes, dueDate) {
  if (!dueDate) return false;
  const due = dueDate instanceof Date ? dueDate : new Date(dueDate);
  const remindAt = new Date(due.getTime() + offsetMinutes * 60_000);
  return remindAt <= new Date();
}

/** True if the event's due date itself is in the past */
function isDueDatePast(dueDate) {
  if (!dueDate) return false;
  const due = dueDate instanceof Date ? dueDate : new Date(dueDate);
  return due <= new Date();
}

function AddReminderPopover({ reminders, onAdd, isMobile, dueDate }) {
  const [opened, setOpened] = useState(false);
  const [showCustom, setShowCustom] = useState(false);
  const [customValue, setCustomValue] = useState(30);
  const [customUnit, setCustomUnit] = useState("minutes");

  // Default direction to "after" when event is past so the add button isn't immediately blocked
  const eventIsPast = isDueDatePast(dueDate);
  const [customDirection, setCustomDirection] = useState(eventIsPast ? "after" : "before");

  // Reset custom direction default when popover opens based on current event state
  const handleOpenChange = (isOpen) => {
    if (isOpen) {
      setCustomDirection(isDueDatePast(dueDate) ? "after" : "before");
      setCustomValue(30);
      setCustomUnit("minutes");
      setShowCustom(false);
    }
    setOpened(isOpen);
  };

  const handlePreset = (offsetMinutes) => {
    const already = reminders.some((r) => r.offset_minutes === offsetMinutes);
    if (!already) onAdd(offsetMinutes);
    setOpened(false);
  };

  const handleCustomAdd = () => {
    const offset = computeOffset(customValue, customUnit, customDirection);
    const already = reminders.some((r) => r.offset_minutes === offset);
    if (!already) onAdd(offset);
    setOpened(false);
    setShowCustom(false);
    setCustomValue(30);
    setCustomUnit("minutes");
    setCustomDirection(isDueDatePast(dueDate) ? "after" : "before");
  };

  // For past events, custom offset means "fire in X time from now", same as buildFuturePresets.
  // We compute minsIntoPast once and add the user's chosen interval to it.
  const minsIntoPast = eventIsPast && dueDate
    ? Math.round((Date.now() - (dueDate instanceof Date ? dueDate : new Date(dueDate)).getTime()) / 60_000)
    : 0;

  let customOffset;
  if (eventIsPast) {
    let rawMins = customValue || 0;
    if (customUnit === "hours") rawMins = rawMins * 60;
    if (customUnit === "days") rawMins = rawMins * 1440;
    customOffset = minsIntoPast + rawMins;
  } else {
    customOffset = computeOffset(customValue, customUnit, customDirection);
  }
  const customIsPast = isOffsetInPast(customOffset, dueDate);

  // For past events, show presets relative to now ("in 30 min") rather than
  // relative to due_date ("30 min after") — those would all be in the past too.
  const presetsToShow = eventIsPast ? buildFuturePresets(dueDate) : BEFORE_PRESETS;
  const presetsLabel = eventIsPast ? "Fire reminder" : "Quick add";

  return (
    <Popover
      opened={opened}
      onChange={handleOpenChange}
      position="bottom-start"
      withinPortal
      shadow="md"
      width={260}
    >
      <Popover.Target>
        <ActionIcon
          size="sm"
          variant="light"
          color="blue"
          onClick={() => handleOpenChange(!opened)}
          title="Add reminder"
        >
          <IconPlus size={14} />
        </ActionIcon>
      </Popover.Target>
      <Popover.Dropdown>
        <Stack gap="xs">
          <Text size="xs" fw={600} c="dimmed">{presetsLabel}</Text>
          {presetsToShow.map((p) => {
            const active = reminders.some((r) => r.offset_minutes === p.offsetMinutes);
            const isPast = isOffsetInPast(p.offsetMinutes, dueDate);
            return (
              <UnstyledButton
                key={p.offsetMinutes}
                onClick={() => !active && !isPast && handlePreset(p.offsetMinutes)}
                style={{
                  padding: "4px 8px",
                  borderRadius: 6,
                  opacity: active || isPast ? 0.4 : 1,
                  cursor: active || isPast ? "default" : "pointer",
                  background: active ? "var(--parchment)" : undefined,
                }}
                disabled={active || isPast}
              >
                <Text size="xs">
                  {p.label}
                  {isPast && !active && <span style={{ marginLeft: 4, fontSize: 10, opacity: 0.7 }}>(past)</span>}
                </Text>
              </UnstyledButton>
            );
          })}

          <Box
            style={{
              borderTop: "1px solid var(--rule)",
              paddingTop: 6,
            }}
          >
            <UnstyledButton
              onClick={() => setShowCustom((v) => !v)}
              style={{ padding: "4px 8px", borderRadius: 6, width: "100%" }}
            >
              <Text size="xs" c="dimmed">Custom…</Text>
            </UnstyledButton>
            <Collapse in={showCustom}>
              <Stack gap={6} mt={6}>
                <Group gap="xs" wrap="nowrap">
                  <NumberInput
                    value={customValue}
                    onChange={setCustomValue}
                    min={1}
                    max={9999}
                    size="xs"
                    style={{ flex: 1 }}
                  />
                  <Select
                    value={customUnit}
                    onChange={setCustomUnit}
                    data={[
                      { value: "minutes", label: "min" },
                      { value: "hours", label: "hr" },
                      { value: "days", label: "day" },
                    ]}
                    size="xs"
                    style={{ width: 70 }}
                    allowDeselect={false}
                    comboboxProps={{ withinPortal: false }}
                  />
                  {eventIsPast ? (
                    <Text size="xs" c="dimmed" style={{ width: 80 }}>from now</Text>
                  ) : (
                    <Select
                      value={customDirection}
                      onChange={setCustomDirection}
                      data={[
                        { value: "before", label: "before" },
                        { value: "after", label: "after" },
                      ]}
                      size="xs"
                      style={{ width: 80 }}
                      allowDeselect={false}
                      comboboxProps={{ withinPortal: false }}
                    />
                  )}
                </Group>
                <Tooltip label="This time has already passed" disabled={!customIsPast} withArrow>
                  <UnstyledButton
                    onClick={customIsPast ? undefined : handleCustomAdd}
                    style={{
                      padding: "4px 8px",
                      borderRadius: 6,
                      background: customIsPast ? "var(--mantine-color-gray-5)" : "var(--mantine-color-blue-6)",
                      color: "white",
                      textAlign: "center",
                      cursor: customIsPast ? "default" : "pointer",
                      opacity: customIsPast ? 0.6 : 1,
                    }}
                  >
                    <Text size="xs" fw={600}>{customIsPast ? "In the past" : "Add"}</Text>
                  </UnstyledButton>
                </Tooltip>
              </Stack>
            </Collapse>
          </Box>
        </Stack>
      </Popover.Dropdown>
    </Popover>
  );
}

export default function RemindersSection({
  reminders,
  onAdd,
  onRemove,
  isMobile,
  isAllDay,
  dueDate,
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const sortedReminders = [...reminders].sort(
    (a, b) => a.offset_minutes - b.offset_minutes,
  );

  const content = (
    <Stack gap={6}>
      {isAllDay && (
        <Text size="xs" c="orange">
          All-day event — reminders fire relative to 11:59 PM
        </Text>
      )}
      {/* Active reminders as inline pills + add button — stable height */}
      <Group gap={4} wrap="wrap" align="center">
        {sortedReminders.map((r) => {
          const isSent = r.sent === 1;
          return (
            <Tooltip
              key={r.id ?? r.offset_minutes}
              label="Reminder sent"
              disabled={!isSent}
              withArrow
              position="top"
            >
              <Badge
                size="sm"
                variant={isSent ? "light" : "outline"}
                color={isSent ? "green" : "blue"}
                leftSection={isSent ? <IconCheck size={9} /> : undefined}
                rightSection={
                  !isSent ? (
                    <ActionIcon
                      size={10}
                      variant="transparent"
                      color="gray"
                      onClick={() => onRemove(r.id ?? r.offset_minutes)}
                      style={{ marginLeft: 2 }}
                    >
                      <IconX size={9} />
                    </ActionIcon>
                  ) : undefined
                }
                styles={{ root: { paddingRight: isSent ? undefined : 4 } }}
              >
                {formatOffsetLabel(r.offset_minutes, dueDate)}
              </Badge>
            </Tooltip>
          );
        })}
        <AddReminderPopover
          reminders={reminders}
          onAdd={onAdd}
          isMobile={isMobile}
          dueDate={dueDate}
        />
      </Group>
    </Stack>
  );

  if (isMobile) {
    return (
      <Box
        style={{
          background: "var(--parchment)",
          borderRadius: 8,
          overflow: "hidden",
        }}
      >
        <UnstyledButton
          onClick={() => setMobileOpen((v) => !v)}
          style={{ width: "100%", padding: "12px 16px" }}
        >
          <Group justify="space-between" wrap="nowrap">
            <Group gap={6} wrap="nowrap">
              <IconBell size={14} style={{ opacity: 0.6 }} />
              <Text size="sm" fw={600} c="dimmed">
                Reminders
                {reminders.length > 0 && ` (${reminders.length})`}
              </Text>
            </Group>
            {mobileOpen ? (
              <IconChevronUp size={14} style={{ opacity: 0.5 }} />
            ) : (
              <IconChevronDown size={14} style={{ opacity: 0.5 }} />
            )}
          </Group>
        </UnstyledButton>
        <Collapse in={mobileOpen}>
          <Box style={{ padding: "0 16px 14px" }}>{content}</Box>
        </Collapse>
      </Box>
    );
  }

  return (
    <Box
      style={{
        background: "var(--parchment)",
        borderRadius: 8,
        padding: "12px 16px",
      }}
    >
      <Group gap={6} mb={8} align="center">
        <IconBell size={14} style={{ opacity: 0.5 }} />
        <Text size="sm" fw={600} c="dimmed">
          Reminders
        </Text>
      </Group>
      {content}
    </Box>
  );
}
