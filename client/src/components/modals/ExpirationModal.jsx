import { Button, Stack, Text, Group, Box } from '@mantine/core';
import { SignInButton } from '@clerk/clerk-react';
import { IconClockOff } from '@tabler/icons-react';
import BottomSheet from '../BottomSheet';

/**
 * Modal displayed when a guest session has expired after 30 days of inactivity.
 * Offers options to continue as guest (fresh start) or sign in.
 */
export default function ExpirationModal({ opened, onContinueAsGuest, onClose }) {
  return (
    <BottomSheet
      opened={opened}
      onClose={onClose}
      title="Session Expired"
      size="sm"
      closeOnClickOutside={false}
      closeOnEscape={false}
      withCloseButton={false}
    >
      <Stack gap={24} align="center">
        <Box
          style={{
            width: 64,
            height: 64,
            borderRadius: '50%',
            backgroundColor: 'var(--parchment)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <IconClockOff size={32} style={{ color: 'var(--pencil)' }} />
        </Box>

        <Stack gap={8} align="center">
          <Text ta="center" fw={500} style={{ color: 'var(--ink)' }}>
            Your guest session data has expired after 30 days of inactivity.
          </Text>
          <Text size="sm" ta="center" style={{ color: 'var(--graphite)' }}>
            This helps us manage storage and protect your privacy.
          </Text>
        </Stack>

        <Group justify="center" className="modal-footer-flush" style={{ width: '100%' }}>
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
    </BottomSheet>
  );
}
