import {
  Anchor,
  Box,
  Center,
  Container,
  List,
  Paper,
  SimpleGrid,
  Stack,
  Text,
  Title,
  useMantineColorScheme,
} from "@mantine/core";
import { IconCheck } from "@tabler/icons-react";
import { SignIn } from "@clerk/clerk-react";
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
  };

  const handleContinue = () => {
    clearAutoResumeBlocked();
    startGuestSession();
  };

  return (
    <Box style={backgroundStyle}>
      <Center mih="100vh" px="lg" py="xl">
        <Container size="lg" w="100%">
          <Paper radius="lg" p={{ base: "lg", md: "xl" }} shadow="xl">
            <SimpleGrid cols={{ base: 1, md: 2 }} spacing={{ base: "lg", md: "xl" }}>
              <Stack gap="sm">
                <Title order={2}>Welcome to Canvas Task Manager</Title>
                <Text c="dimmed">
                  Stay on top of assignments with a flexible calendar and a
                  simple approval flow.
                </Text>
                <List
                  spacing="xs"
                  icon={<IconCheck size={16} />}
                  styles={{ itemLabel: { lineHeight: 1.5 } }}
                >
                  <List.Item>Plan tasks immediately without signing in.</List.Item>
                  <List.Item>Everything stays on this device.</List.Item>
                  <List.Item>Upgrade later without losing progress.</List.Item>
                </List>
              </Stack>
              <Stack align="center" gap="sm">
                <SignIn />
                <Text size="sm" ta="center" c="dimmed">
                  Prefer not to sign in?{" "}
                  <Anchor component="button" type="button" onClick={handleContinue}>
                    Continue as guest
                  </Anchor>
                </Text>
              </Stack>
            </SimpleGrid>
          </Paper>
        </Container>
      </Center>
    </Box>
  );
}
