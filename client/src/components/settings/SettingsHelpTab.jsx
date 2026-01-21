import { Alert, Button, Divider, Group, Stack, Text } from "@mantine/core";
import { IconAlertTriangle } from "@tabler/icons-react";

export default function SettingsHelpTab({ config, handlers }) {
  return (
    <Stack>
      <Text size="sm" c="dimmed">
        Need help getting started? Replay the onboarding tour to learn
        about the app's features.
      </Text>
      <Button onClick={handlers.resetOnboarding} variant="light">
        Show Tour Again
      </Button>

      <Divider my="md" />

      <Text size="sm" c="dimmed">
        Reset all your data while keeping your Canvas API credentials and settings.
      </Text>
      {!config.showResetConfirm ? (
        <Button
          onClick={() => handlers.setShowResetConfirm(true)}
          color="red"
          variant="light"
          leftSection={<IconAlertTriangle size={16} />}
        >
          Reset All Data
        </Button>
      ) : (
        <Alert
          color="red"
          title="Are you sure?"
          icon={<IconAlertTriangle />}
        >
          <Stack gap="sm">
            <Text size="sm">
              This will permanently delete:
            </Text>
            <Text size="sm" component="ul" style={{ margin: 0, paddingLeft: 20 }}>
              <li>All calendar events (including Canvas assignments)</li>
              <li>All custom classes</li>
              <li>All rejected items</li>
              <li>All filters and preferences</li>
            </Text>
            <Text size="sm" fw={500}>
              This will keep:
            </Text>
            <Text size="sm" component="ul" style={{ margin: 0, paddingLeft: 20 }}>
              <li>Canvas API credentials</li>
              <li>Canvas-linked classes</li>
              <li>Settings (colors, etc.)</li>
              <li>Onboarding completion status</li>
            </Text>
            <Text size="sm" fw={700} c="red">
              This action cannot be undone.
            </Text>
            <Group justify="flex-end" mt="sm">
              <Button
                variant="subtle"
                color="gray"
                onClick={() => handlers.setShowResetConfirm(false)}
                disabled={config.resetting}
              >
                Cancel
              </Button>
              <Button
                color="red"
                onClick={handlers.handleResetData}
                loading={config.resetting}
              >
                Yes, Reset Everything
              </Button>
            </Group>
          </Stack>
        </Alert>
      )}
    </Stack>
  );
}
