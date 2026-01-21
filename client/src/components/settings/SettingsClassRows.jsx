import {
  ActionIcon,
  Alert,
  Button,
  ColorInput,
  Divider,
  Group,
  Paper,
  Stack,
  Switch,
  Text,
  TextInput,
  Tooltip,
} from "@mantine/core";
import {
  IconAlertTriangle,
  IconCheck,
  IconEdit,
  IconPlus,
  IconRefresh,
  IconTrash,
  IconX,
} from "@tabler/icons-react";

export function NewClassRow({ config, handlers }) {
  return (
    <Group align="flex-end">
      <TextInput
        label="Class Name"
        placeholder="e.g., CS 101"
        value={config.newClassName}
        onChange={(e) => handlers.setNewClassName(e.target.value)}
        style={{ flex: 1 }}
      />
      <ColorInput
        label="Color"
        value={config.newClassColor}
        onChange={handlers.setNewClassColor}
        w={120}
      />
      <ActionIcon variant="filled" size="lg" onClick={handlers.addClass}>
        <IconPlus size={18} />
      </ActionIcon>
    </Group>
  );
}

export function UnassignedRow({ config, handlers }) {
  return (
    <Stack gap="xs">
      <Divider label="Unassigned" labelPosition="left" />
      <Paper p="sm" withBorder>
        {config.editingUnassigned ? (
          <Group align="flex-end">
            <Text size="sm" style={{ flex: 1 }}>
              Unassigned
            </Text>
            <ColorInput
              value={config.editUnassignedColor}
              onChange={handlers.setEditUnassignedColor}
              w={100}
              size="xs"
            />
            <ActionIcon
              variant="filled"
              color="green"
              onClick={handlers.saveUnassignedColor}
              size="sm"
            >
              <IconCheck size={14} />
            </ActionIcon>
            <ActionIcon
              variant="subtle"
              color="gray"
              onClick={handlers.cancelEditingUnassigned}
              size="sm"
            >
              <IconX size={14} />
            </ActionIcon>
          </Group>
        ) : (
          <Group justify="space-between" wrap="nowrap">
            <Group wrap="nowrap" style={{ minWidth: 0 }}>
              <div
                style={{
                  width: 16,
                  height: 16,
                  borderRadius: 4,
                  backgroundColor: config.unassignedColor,
                  flexShrink: 0,
                }}
              />
              <Text size="sm" truncate style={{ minWidth: 0 }}>
                Unassigned
              </Text>
            </Group>
            <Group gap="xs" wrap="nowrap">
              <ActionIcon
                variant="subtle"
                onClick={handlers.startEditingUnassigned}
              >
                <IconEdit size={16} />
              </ActionIcon>
            </Group>
          </Group>
        )}
      </Paper>
    </Stack>
  );
}

export function ClassRowEdit({ config, handlers }) {
  return (
    <Group align="flex-end">
      <TextInput
        value={config.editName}
        onChange={(e) => handlers.setEditName(e.target.value)}
        style={{ flex: 1 }}
        size="xs"
      />
      <ColorInput
        value={config.editColor}
        onChange={handlers.setEditColor}
        w={100}
        size="xs"
      />
      <ActionIcon
        variant="filled"
        color="green"
        onClick={handlers.saveEdit}
        size="sm"
      >
        <IconCheck size={14} />
      </ActionIcon>
      <ActionIcon
        variant="subtle"
        color="gray"
        onClick={handlers.cancelEditing}
        size="sm"
      >
        <IconX size={14} />
      </ActionIcon>
    </Group>
  );
}

export function ClassRowDeleteConfirm({ cls, config, handlers }) {
  return (
    <Alert color="red" title="Delete this class?" icon={<IconAlertTriangle />}>
      <Stack gap="sm">
        <Text size="sm">
          This will permanently delete <strong>{cls.name}</strong> and all associated events.
        </Text>
        <Text size="sm" fw={700} c="red">
          This action cannot be undone.
        </Text>
        <Group justify="flex-end" mt="sm">
          <Button
            variant="subtle"
            color="gray"
            onClick={() => handlers.setDeleteClassId(null)}
            disabled={config.deleting}
            size="xs"
          >
            Cancel
          </Button>
          <Button
            color="red"
            onClick={() => handlers.deleteClass(cls.id)}
            loading={config.deleting}
            size="xs"
          >
            Yes, Delete
          </Button>
        </Group>
      </Stack>
    </Alert>
  );
}

export function ClassRowView({ cls, handlers, showSyncToggle }) {
  return (
    <Group justify="space-between" wrap="nowrap">
      <Group wrap="nowrap" style={{ minWidth: 0 }}>
        <div
          style={{
            width: 16,
            height: 16,
            borderRadius: 4,
            backgroundColor: cls.color,
            flexShrink: 0,
          }}
        />
        <Text size="sm" truncate style={{ minWidth: 0 }}>
          {cls.name}
        </Text>
      </Group>
      <Group gap="xs" wrap="nowrap">
        {showSyncToggle && (
          <Tooltip
            label={
              cls.is_synced
                ? "Assignments from this Canvas course will appear in your pending items"
                : "Assignments from this Canvas course will be ignored"
            }
            multiline
            w={220}
          >
            <div>
              <Switch
                size="xs"
                checked={!!cls.is_synced}
                onChange={() => handlers.toggleSync(cls)}
                label={<IconRefresh size={14} />}
                styles={{ label: { paddingLeft: 4 } }}
              />
            </div>
          </Tooltip>
        )}
        <ActionIcon
          variant="subtle"
          onClick={() => handlers.startEditing(cls)}
        >
          <IconEdit size={16} />
        </ActionIcon>
        <ActionIcon
          variant="subtle"
          color="red"
          onClick={() => handlers.setDeleteClassId(cls.id)}
        >
          <IconTrash size={16} />
        </ActionIcon>
      </Group>
    </Group>
  );
}
