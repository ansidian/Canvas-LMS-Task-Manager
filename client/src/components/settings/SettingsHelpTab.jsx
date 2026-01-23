import { Alert, Button, Divider, Group, Stack, Text } from "@mantine/core";
import { IconAlertTriangle } from "@tabler/icons-react";

export default function SettingsHelpTab({ config, handlers }) {
  const isGuest = Boolean(config.isGuest);
  const deleteItems = isGuest
    ? [
        "All calendar events (including Canvas assignments)",
        "All custom classes",
        "All rejected items",
      ]
    : [
        "All calendar events (including Canvas assignments)",
        "All custom classes",
        "All rejected items",
        "All filters and preferences",
      ];
  const keepItems = isGuest
    ? [
        "Canvas API credentials",
        "Canvas-linked classes",
        "UI preferences (filters, split position, theme)",
        "Onboarding completion status",
      ]
    : [
        "Canvas API credentials",
        "Canvas-linked classes",
        "Settings (colors, etc.)",
        "Onboarding completion status",
      ];

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

      {isGuest && (
        <>
          <Text size="sm" c="dimmed">
            Dismissed the upgrade banner? Click here to see it again.
          </Text>
          <Button
            onClick={() => {
              sessionStorage.removeItem('upgrade_banner_dismissed');
              localStorage.removeItem('upgrade_banner_last_dismissed');
              window.location.reload();
            }}
            variant="light"
          >
            Reset Upgrade Banner
          </Button>
          <Divider my="md" />
        </>
      )}

      <Divider my="md" />

      <Text size="sm" c="dimmed">
        {isGuest
          ? "Reset guest data stored on this device while keeping UI preferences."
          : "Reset all your data while keeping your Canvas API credentials and settings."}
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
              {deleteItems.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </Text>
            <Text size="sm" fw={500}>
              This will keep:
            </Text>
            <Text size="sm" component="ul" style={{ margin: 0, paddingLeft: 20 }}>
              {keepItems.map((item) => (
                <li key={item}>{item}</li>
              ))}
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
