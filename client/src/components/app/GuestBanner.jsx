import {
  Box,
  Group,
  Popover,
  Text,
  useMantineColorScheme,
  useMantineTheme,
} from "@mantine/core";
import { IconUserCircle } from "@tabler/icons-react";

export default function GuestBanner() {
  const { colorScheme } = useMantineColorScheme();
  const theme = useMantineTheme();
  const isDark = colorScheme === "dark";
  const backgroundColor = isDark ? theme.colors.dark[7] : theme.colors.gray[0];
  const borderColor = isDark ? theme.colors.dark[4] : theme.colors.gray[3];
  const iconColor = isDark ? theme.colors.gray[2] : theme.colors.gray[6];

  return (
    <Popover position="bottom-start" withArrow shadow="sm" openDelay={150}>
      <Popover.Target>
        <Box
          role="status"
          px="md"
          py={6}
          style={{
            backgroundColor,
            borderBottom: `1px solid ${borderColor}`,
          }}
        >
          <Group gap="xs" align="center" wrap="nowrap">
            <IconUserCircle size={16} color={iconColor} />
            <Text size="sm" fw={600}>
              Guest mode
            </Text>
            <Text size="sm" c="dimmed">
              Local-only workspace
            </Text>
          </Group>
        </Box>
      </Popover.Target>
      <Popover.Dropdown>
        <Text size="sm">
          Guest work is stored only in this browser. Data stays local until you
          sign in or reset the guest session.
        </Text>
      </Popover.Dropdown>
    </Popover>
  );
}
