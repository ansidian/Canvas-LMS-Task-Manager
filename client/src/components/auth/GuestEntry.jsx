import {
  Box,
  Button,
  Center,
  Container,
  Divider,
  Image,
  List,
  Paper,
  SimpleGrid,
  Stack,
  Text,
  ThemeIcon,
  Title,
  useMantineColorScheme,
} from "@mantine/core";
import {
  IconCloud,
  IconDeviceDesktop,
  IconCheck,
  IconAlertTriangle,
} from "@tabler/icons-react";
import { SignInButton } from "@clerk/clerk-react";
import { useGuestSession } from "../../contexts/GuestSessionContext";

export default function GuestEntry() {
  const { colorScheme } = useMantineColorScheme();
  const { startGuestSession, clearAutoResumeBlocked } = useGuestSession();

  const backgroundStyle = {
    minHeight: "100vh",
    background:
      colorScheme === "dark"
        ? "linear-gradient(135deg, #111827 0%, #1e293b 50%, #0f172a 100%)"
        : "linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)",
    fontFamily: "'Plus Jakarta Sans', sans-serif",
  };

  const titleStyle = {
    fontFamily: "'Sora', sans-serif",
  };

  const handleContinue = () => {
    clearAutoResumeBlocked();
    startGuestSession();
  };

  return (
    <Box style={backgroundStyle}>
      <Center mih="100vh" px="lg" py="xl">
        <Container size="lg" w="100%">
          <Stack gap="xl">
            {/* Header */}
            <Stack gap="xs" ta="center" align="center">
              <Image src="/icon.png" alt="Canvas Task Manager" w={80} h={80} />
              <Title order={1} c="white" style={titleStyle}>
                Canvas Task Manager (CTM)
              </Title>
              <Text size="lg" c="white" opacity={0.9}>
                Sync Canvas assignments, filter the clutter, and track your
                progress — with live updates for due dates and submissions.
              </Text>
            </Stack>

            <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
              {/* Sign In Option */}
              <Paper radius="lg" p="xl" shadow="xl">
                <Stack gap="md">
                  <Stack gap="xs" align="center">
                    <ThemeIcon
                      size="xl"
                      radius="xl"
                      variant="light"
                      color="blue"
                    >
                      <IconCloud size={24} />
                    </ThemeIcon>
                    <Title order={3}>Sign In</Title>
                    <Text size="sm" c="dimmed" ta="center">
                      Recommended for regular use
                    </Text>
                  </Stack>

                  <List
                    spacing="xs"
                    size="sm"
                    icon={
                      <ThemeIcon
                        size={20}
                        radius="xl"
                        color="blue"
                        variant="light"
                      >
                        <IconCheck size={12} />
                      </ThemeIcon>
                    }
                  >
                    <List.Item>Data stored securely in database</List.Item>
                    <List.Item>Access from any device</List.Item>
                    <List.Item>
                      Canvas credentials encrypted server-side
                    </List.Item>
                  </List>

                  <Divider />

                  <SignInButton mode="modal">
                    <Button size="md" variant="filled" color="blue" fullWidth>
                      Sign In
                    </Button>
                  </SignInButton>
                </Stack>
              </Paper>

              {/* Guest Option */}
              <Paper radius="lg" p="xl" shadow="xl">
                <Stack gap="md">
                  <Stack gap="xs" align="center">
                    <ThemeIcon
                      size="xl"
                      radius="xl"
                      variant="light"
                      color="gray"
                    >
                      <IconDeviceDesktop size={24} />
                    </ThemeIcon>
                    <Title order={3}>Guest Mode</Title>
                    <Text size="sm" c="dimmed" ta="center">
                      Data stays local until you sign in
                    </Text>
                  </Stack>

                  <List
                    spacing="xs"
                    size="sm"
                    icon={
                      <ThemeIcon
                        size={20}
                        radius="xl"
                        color="gray"
                        variant="light"
                      >
                        <IconCheck size={12} />
                      </ThemeIcon>
                    }
                  >
                    <List.Item>No sign-up required</List.Item>
                    <List.Item>All features available</List.Item>
                    <List.Item>Sign in later to keep your data</List.Item>
                  </List>

                  <Divider />

                  <Stack gap="xs">
                    <Button
                      size="md"
                      variant="light"
                      color="gray"
                      fullWidth
                      onClick={handleContinue}
                    >
                      Continue as Guest
                    </Button>

                    <Stack gap={4}>
                      <Text size="xs" c="dimmed" ta="center">
                        <IconAlertTriangle
                          size={12}
                          style={{ verticalAlign: "middle", marginRight: 4 }}
                        />
                        Data is stored in your browser only
                      </Text>
                      <Text size="xs" c="dimmed" ta="center">
                        Expires after 30 days of inactivity
                      </Text>
                      <Text size="xs" c="dimmed" ta="center">
                        Canvas credentials stored locally (not encrypted)
                      </Text>
                    </Stack>
                  </Stack>
                </Stack>
              </Paper>
            </SimpleGrid>
          </Stack>
        </Container>
      </Center>
    </Box>
  );
}
