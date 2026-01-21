import { Alert, Button, Group, Stack, Text, TextInput, PasswordInput } from "@mantine/core";
import { IconAlertTriangle } from "@tabler/icons-react";

export default function SettingsCanvasTab({ config, handlers }) {
  return (
    <Stack>
      <Text size="sm" c="dimmed">
        Connect to your Canvas LMS to fetch assignments. You can generate
        an API token in Canvas under Account &gt; Settings &gt; Approved
        Integrations.
      </Text>
      {config.canvasAuthError && (
        <Alert
          icon={<IconAlertTriangle size={18} />}
          color="red"
          variant="light"
        >
          {config.canvasAuthError}
        </Alert>
      )}
      <TextInput
        label="Canvas URL"
        placeholder="https://calstatela.instructure.com"
        value={config.canvasUrl}
        onChange={(e) => {
          handlers.setCanvasUrl(e.target.value);
          handlers.onCanvasAuthErrorClear?.();
        }}
        description="Your institution's Canvas URL"
        className={config.highlightCredentials ? "credential-highlight" : ""}
        data-highlight={config.highlightCredentials}
      />
      <PasswordInput
        label="API Token"
        placeholder="Your Canvas API token"
        value={config.canvasToken}
        onChange={(e) => {
          handlers.setCanvasToken(e.target.value);
          handlers.onCanvasAuthErrorClear?.();
        }}
        description="Generated from Canvas settings"
        className={config.highlightCredentials ? "credential-highlight" : ""}
        data-highlight={config.highlightCredentials}
      />
      <Group justify="flex-end">
        <Button
          onClick={handlers.saveCanvasSettings}
          color={config.saveSuccess ? "green" : "blue"}
          className={config.saveSuccess ? "success-flash" : ""}
        >
          {config.saveSuccess ? "✓ Saved" : "Save Settings"}
        </Button>
      </Group>
    </Stack>
  );
}
