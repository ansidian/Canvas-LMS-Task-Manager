import { useState, useEffect } from 'react';
import {
  Modal,
  Tabs,
  Stack,
  TextInput,
  PasswordInput,
  Button,
  Group,
  Text,
  Paper,
  ColorInput,
  ActionIcon,
  Anchor,
} from '@mantine/core';
import { IconTrash, IconPlus, IconEdit, IconCheck, IconX } from '@tabler/icons-react';

const api = async (endpoint, options = {}) => {
  const res = await fetch(`/api${endpoint}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  if (!res.ok) throw new Error('Request failed');
  return res.json();
};

export default function SettingsModal({ opened, onClose, classes, onClassesChange }) {
  const [canvasUrl, setCanvasUrl] = useState('');
  const [canvasToken, setCanvasToken] = useState('');
  const [newClassName, setNewClassName] = useState('');
  const [newClassColor, setNewClassColor] = useState('#228be6');
  const [editingClassId, setEditingClassId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);

  const resetOnboarding = () => {
    localStorage.removeItem('hasCompletedOnboarding');
    onClose();
    // Reload to trigger tour
    window.location.reload();
  };

  useEffect(() => {
    setCanvasUrl(localStorage.getItem('canvasUrl') || '');
    setCanvasToken(localStorage.getItem('canvasToken') || '');
  }, [opened]);

  const saveCanvasSettings = () => {
    localStorage.setItem('canvasUrl', canvasUrl);
    localStorage.setItem('canvasToken', canvasToken);

    // Show success feedback
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 1500);
  };

  const addClass = async () => {
    if (!newClassName.trim()) return;
    try {
      await api('/classes', {
        method: 'POST',
        body: JSON.stringify({ name: newClassName.trim(), color: newClassColor }),
      });
      setNewClassName('');
      setNewClassColor('#228be6');
      onClassesChange();
    } catch (err) {
      console.error('Failed to add class:', err);
    }
  };

  const deleteClass = async (id) => {
    try {
      await api(`/classes/${id}`, { method: 'DELETE' });
      onClassesChange();
    } catch (err) {
      console.error('Failed to delete class:', err);
    }
  };

  const startEditing = (cls) => {
    setEditingClassId(cls.id);
    setEditName(cls.name);
    setEditColor(cls.color);
  };

  const cancelEditing = () => {
    setEditingClassId(null);
    setEditName('');
    setEditColor('');
  };

  const saveEdit = async () => {
    if (!editName.trim()) return;
    try {
      await api(`/classes/${editingClassId}`, {
        method: 'PATCH',
        body: JSON.stringify({ name: editName.trim(), color: editColor }),
      });
      setEditingClassId(null);
      onClassesChange();
    } catch (err) {
      console.error('Failed to update class:', err);
    }
  };

  return (
    <Modal opened={opened} onClose={onClose} title="Settings" size="lg">
      <Tabs defaultValue="canvas">
        <Tabs.List>
          <Tabs.Tab value="canvas">Canvas API</Tabs.Tab>
          <Tabs.Tab value="classes">Classes</Tabs.Tab>
          <Tabs.Tab value="help">Help</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="canvas" pt="md">
          <Stack>
            <Text size="sm" c="dimmed">
              Connect to your Canvas LMS to fetch assignments. You can generate an API token in
              Canvas under Account &gt; Settings &gt; Approved Integrations.
            </Text>
            <TextInput
              label="Canvas URL"
              placeholder="https://canvas.myschool.edu"
              value={canvasUrl}
              onChange={(e) => setCanvasUrl(e.target.value)}
              description="Your institution's Canvas URL"
            />
            <PasswordInput
              label="API Token"
              placeholder="Your Canvas API token"
              value={canvasToken}
              onChange={(e) => setCanvasToken(e.target.value)}
              description="Generated from Canvas settings"
            />
            <Group justify="flex-end">
              <Button
                onClick={saveCanvasSettings}
                color={saveSuccess ? 'green' : 'blue'}
                className={saveSuccess ? 'success-flash' : ''}
              >
                {saveSuccess ? '✓ Saved' : 'Save Settings'}
              </Button>
            </Group>
          </Stack>
        </Tabs.Panel>

        <Tabs.Panel value="classes" pt="md">
          <Stack>
            <Text size="sm" c="dimmed">
              Manage your classes. Each class has a color that will be shown on calendar events.
            </Text>

            <Group align="flex-end">
              <TextInput
                label="Class Name"
                placeholder="e.g., CS 101"
                value={newClassName}
                onChange={(e) => setNewClassName(e.target.value)}
                style={{ flex: 1 }}
              />
              <ColorInput
                label="Color"
                value={newClassColor}
                onChange={setNewClassColor}
                w={120}
              />
              <ActionIcon variant="filled" size="lg" onClick={addClass}>
                <IconPlus size={18} />
              </ActionIcon>
            </Group>

            <Stack gap="xs">
              {classes.map((cls) => (
                <Paper key={cls.id} p="sm" withBorder>
                  {editingClassId === cls.id ? (
                    <Group align="flex-end">
                      <TextInput
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        style={{ flex: 1 }}
                        size="xs"
                      />
                      <ColorInput
                        value={editColor}
                        onChange={setEditColor}
                        w={100}
                        size="xs"
                      />
                      <ActionIcon
                        variant="filled"
                        color="green"
                        onClick={saveEdit}
                        size="sm"
                      >
                        <IconCheck size={14} />
                      </ActionIcon>
                      <ActionIcon
                        variant="subtle"
                        color="gray"
                        onClick={cancelEditing}
                        size="sm"
                      >
                        <IconX size={14} />
                      </ActionIcon>
                    </Group>
                  ) : (
                    <Group justify="space-between">
                      <Group>
                        <div
                          style={{
                            width: 16,
                            height: 16,
                            borderRadius: 4,
                            backgroundColor: cls.color,
                          }}
                        />
                        <Text size="sm">{cls.name}</Text>
                      </Group>
                      <Group gap="xs">
                        <ActionIcon
                          variant="subtle"
                          onClick={() => startEditing(cls)}
                        >
                          <IconEdit size={16} />
                        </ActionIcon>
                        <ActionIcon
                          variant="subtle"
                          color="red"
                          onClick={() => deleteClass(cls.id)}
                        >
                          <IconTrash size={16} />
                        </ActionIcon>
                      </Group>
                    </Group>
                  )}
                </Paper>
              ))}
              {classes.length === 0 && (
                <Text size="sm" c="dimmed" ta="center">
                  No classes yet. Add one above.
                </Text>
              )}
            </Stack>
          </Stack>
        </Tabs.Panel>

        <Tabs.Panel value="help" pt="md">
          <Stack>
            <Text size="sm" c="dimmed">
              Need help getting started? Replay the onboarding tour to learn about the app's features.
            </Text>
            <Button onClick={resetOnboarding} variant="light">
              Show Tour Again
            </Button>
          </Stack>
        </Tabs.Panel>
      </Tabs>
    </Modal>
  );
}
