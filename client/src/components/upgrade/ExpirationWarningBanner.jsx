import { Alert, Button, CloseButton, Group, Text } from "@mantine/core";
import { IconAlertTriangle } from "@tabler/icons-react";
import { SignInButton } from "@clerk/clerk-react";

/**
 * Banner component warning guest users of impending data expiration
 * @param {number} daysRemaining - Days until expiration
 * @param {'warning' | 'urgent'} warningLevel - Urgency level
 * @param {function} onDismiss - Callback when user clicks dismiss (X) button
 */
export default function ExpirationWarningBanner({
  daysRemaining,
  warningLevel,
  onDismiss,
}) {
  const color = warningLevel === "urgent" ? "red" : "orange";

  let message;
  if (warningLevel === "urgent") {
    message = daysRemaining === 1
      ? "Your guest data expires tomorrow! Sign in now to keep your tasks."
      : "Your guest data expires today! Sign in now to keep your tasks.";
  } else {
    message = `Your guest data will expire in ${daysRemaining} days. Sign in to keep your tasks.`;
  }

  return (
    <Alert
      variant="light"
      color={color}
      icon={<IconAlertTriangle size={18} />}
      styles={{
        root: {
          borderRadius: 0,
          borderLeft: 0,
          borderRight: 0,
          borderTop: 0,
          overflow: "visible",
        },
        wrapper: {
          alignItems: "center",
          overflow: "visible",
        },
        body: {
          overflow: "visible",
        },
      }}
    >
      <Group justify="space-between" wrap="nowrap" w="100%">
        <Text size="sm" style={{ flex: 1 }}>
          {message}
        </Text>
        <Group gap="xs" wrap="nowrap">
          <SignInButton mode="modal">
            <Button size="xs" variant="filled" color="blue">
              Sign In
            </Button>
          </SignInButton>
          <CloseButton
            size="sm"
            onClick={onDismiss}
            aria-label="Dismiss expiration warning"
          />
        </Group>
      </Group>
    </Alert>
  );
}
