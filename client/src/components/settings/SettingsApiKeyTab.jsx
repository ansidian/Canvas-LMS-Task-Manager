import { useState } from "react";
import { Alert, Button, CopyButton, Group, Stack, Text, TextInput } from "@mantine/core";
import { IconAlertCircle, IconCheck, IconCopy } from "@tabler/icons-react";
import { notifyError, notifySuccess } from "../../utils/notify.jsx";

export default function SettingsApiKeyTab({ api, hasApiKey: initialHasKey }) {
  const [hasKey, setHasKey] = useState(initialHasKey);
  const [revealedKey, setRevealedKey] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [confirmRegenerate, setConfirmRegenerate] = useState(false);
  const [revoking, setRevoking] = useState(false);
  const [confirmRevoke, setConfirmRevoke] = useState(false);

  const generateKey = async () => {
    setGenerating(true);
    setConfirmRegenerate(false);
    try {
      const data = await api("/settings/api-key", { method: "POST" });
      setRevealedKey(data.api_key);
      setHasKey(true);
      notifySuccess(hasKey ? "API key regenerated." : "API key generated.");
    } catch (err) {
      notifyError(err.message || "Failed to generate API key.");
    } finally {
      setGenerating(false);
    }
  };

  const revokeKey = async () => {
    setRevoking(true);
    setConfirmRevoke(false);
    try {
      await api("/settings/api-key", { method: "DELETE" });
      setHasKey(false);
      setRevealedKey(null);
      notifySuccess("API key revoked.");
    } catch (err) {
      notifyError(err.message || "Failed to revoke API key.");
    } finally {
      setRevoking(false);
    }
  };

  return (
    <Stack>
      <Text size="sm" c="dimmed">
        Generate an API key to access CTM from external apps. The key grants
        read and update access to your events and classes.
      </Text>

      {revealedKey && (
        <Alert icon={<IconAlertCircle size={16} />} color="yellow" variant="light">
          Save this key now — it won't be shown again.
        </Alert>
      )}

      {revealedKey ? (
        <Group gap="xs" wrap="nowrap">
          <TextInput
            value={revealedKey}
            readOnly
            styles={{ input: { fontFamily: "monospace", fontSize: 13 } }}
            style={{ flex: 1 }}
          />
          <CopyButton value={revealedKey}>
            {({ copied, copy }) => (
              <Button
                variant="default"
                onClick={copy}
                leftSection={copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
              >
                {copied ? "Copied" : "Copy"}
              </Button>
            )}
          </CopyButton>
        </Group>
      ) : hasKey ? (
        <TextInput
          value="ctm_••••••••••••••••••••••••••••••••"
          readOnly
          styles={{ input: { fontFamily: "monospace", fontSize: 13, color: "var(--mantine-color-dimmed)" } }}
        />
      ) : null}

      <Group justify="flex-end">
        {hasKey && !confirmRevoke && (
          <Button
            variant="default"
            color="red"
            onClick={() => setConfirmRevoke(true)}
            disabled={revoking}
          >
            Revoke
          </Button>
        )}
        {confirmRevoke && (
          <>
            <Text size="sm" c="red">Revoke this key? External apps will lose access.</Text>
            <Button variant="default" onClick={() => setConfirmRevoke(false)}>Cancel</Button>
            <Button color="red" onClick={revokeKey} loading={revoking}>Confirm Revoke</Button>
          </>
        )}
        {!confirmRevoke && !confirmRegenerate && (
          <Button
            onClick={hasKey ? () => setConfirmRegenerate(true) : generateKey}
            loading={generating}
          >
            {hasKey ? "Regenerate" : "Generate API Key"}
          </Button>
        )}
        {confirmRegenerate && (
          <>
            <Text size="sm" c="orange">This will invalidate the current key.</Text>
            <Button variant="default" onClick={() => setConfirmRegenerate(false)}>Cancel</Button>
            <Button color="orange" onClick={generateKey} loading={generating}>Confirm Regenerate</Button>
          </>
        )}
      </Group>
    </Stack>
  );
}
