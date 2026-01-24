import { Modal, Button, Stack, Text, Group } from '@mantine/core';
import { SignInButton } from '@clerk/clerk-react';
import { IconClockOff } from '@tabler/icons-react';

/**
 * Modal displayed when a guest session has expired after 30 days of inactivity.
 * Offers options to continue as guest (fresh start) or sign in.
 */
export default function ExpirationModal({ opened, onContinueAsGuest, onClose }) {
  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Session Expired"
      size="md"
      centered
      closeOnClickOutside={false}
      closeOnEscape={false}
      withCloseButton={false}
    >
      <Stack gap="lg" align="center">
        <IconClockOff size={48} color="gray" />

        <Stack gap="xs" align="center">
          <Text ta="center">
            Your guest session data has expired after 30 days of inactivity.
          </Text>
          <Text size="sm" c="dimmed" ta="center">
            This helps us manage storage and protect your privacy.
          </Text>
        </Stack>

        <Group justify="center" mt="md">
          <Button onClick={onContinueAsGuest}>
            Continue as Guest
          </Button>
          <SignInButton mode="modal">
            <Button variant="subtle">
              Sign In
            </Button>
          </SignInButton>
        </Group>
      </Stack>
    </Modal>
  );
}
