import { Button, Group, PasswordInput, Stack, Text } from "@mantine/core";

export default function SettingsTodoistTab({ config, handlers }) {
  return (
    <Stack>
      <Text size="sm" c="dimmed">
        Connect to Todoist to sync tasks. Get your API token from Todoist
        &gt; Settings &gt; Integrations &gt; Developer.
      </Text>
      <PasswordInput
        label="API Token"
        placeholder="Your Todoist API token"
        value={config.todoistToken}
        onChange={(e) => handlers.setTodoistToken(e.target.value)}
        description="40-character token from Todoist developer settings"
      />
      <Group justify="flex-end">
        <Button
          onClick={handlers.saveTodoistSettings}
          color={config.saveSuccess ? "green" : "blue"}
          className={config.saveSuccess ? "success-flash" : ""}
        >
          {config.saveSuccess ? "✓ Saved" : "Save Settings"}
        </Button>
      </Group>
    </Stack>
  );
}
