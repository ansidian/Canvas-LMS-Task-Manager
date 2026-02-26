import { useState } from "react";
import { Alert, Button, Group, Stack, Text, TextInput } from "@mantine/core";
import { IconAlertCircle } from "@tabler/icons-react";
import { notifyError, notifySuccess } from "../../utils/notify.jsx";

export default function SettingsRemindersTab({ config, handlers }) {
  const [testing, setTesting] = useState(false);
  // savedWebhook = the URL currently persisted on the server (loaded on open or just saved)
  const isSaved = Boolean(config.savedDiscordWebhook);
  const isUnsavedChange =
    config.discordWebhook !== config.savedDiscordWebhook;

  const handleTest = async () => {
    setTesting(true);
    try {
      await handlers.testWebhook();
      notifySuccess("Test message sent to Discord!");
    } catch (err) {
      notifyError(err.message || "Failed to send test message.");
    } finally {
      setTesting(false);
    }
  };

  return (
    <Stack>
      <Text size="sm" c="dimmed">
        Enter a Discord Webhook URL to receive reminders. Create one in your Discord server under{" "}
        <strong>Server Settings → Integrations → Webhooks</strong>.
      </Text>

      {!isSaved && (
        <Alert icon={<IconAlertCircle size={16} />} color="orange" variant="light">
          No webhook saved — reminders won't be sent until you save a webhook URL.
        </Alert>
      )}

      <TextInput
        label="Discord Webhook URL"
        placeholder="https://discord.com/api/webhooks/..."
        value={config.discordWebhook}
        onChange={(e) => handlers.setDiscordWebhook(e.target.value)}
        description="Reminders will be posted to this channel"
        error={isUnsavedChange && config.discordWebhook ? "Unsaved — click Save Settings" : undefined}
      />
      <Group justify="flex-end">
        <Button
          variant="default"
          onClick={handleTest}
          loading={testing}
          disabled={!isSaved || isUnsavedChange}
          title={!isSaved ? "Save a webhook URL first" : isUnsavedChange ? "Save changes first" : undefined}
        >
          Send Test
        </Button>
        <Button
          onClick={handlers.saveDiscordWebhook}
          color={config.saveSuccess ? "green" : "blue"}
          className={config.saveSuccess ? "success-flash" : ""}
        >
          {config.saveSuccess ? "✓ Saved" : "Save Settings"}
        </Button>
      </Group>
    </Stack>
  );
}
