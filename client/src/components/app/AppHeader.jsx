import {
	ActionIcon,
	Badge,
	Button,
	Group,
	Text,
	Title,
	Tooltip,
	useMantineColorScheme,
} from "@mantine/core";
import { OnboardingTour } from "@gfazioli/mantine-onboarding-tour";
import {
	IconChevronLeft,
	IconChevronRight,
	IconMoon,
	IconRefresh,
	IconSearch,
	IconSettings,
	IconSun,
} from "@tabler/icons-react";
import { UserButton, useClerk } from "@clerk/clerk-react";
import { spotlight } from "@mantine/spotlight";
import { motion } from "framer-motion";
import { useAppControllerContext } from "../../contexts/AppControllerContext";
import useIsMobile from "../../hooks/useIsMobile";

const tapSpring = { type: "spring", stiffness: 500, damping: 25 };

const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
const modKey = isMac ? "⌘" : "Ctrl";

export default function AppHeader({ isGuest }) {
  const isMobile = useIsMobile();
  const controller = useAppControllerContext();
  const { colorScheme, toggleColorScheme } = useMantineColorScheme();
  const { openSignIn } = useClerk();

  if (isMobile) {
    return (
      <Group h="100%" px="xs" style={{ width: "100%", position: "relative" }} wrap="nowrap">
        {/* Absolutely centered month/arrows — not affected by sibling widths */}
        <Group
          gap="xs"
          wrap="nowrap"
          style={{
            position: "absolute",
            left: "50%",
            transform: "translateX(-50%)",
          }}
        >
          <motion.div whileTap={{ scale: 0.8 }} transition={tapSpring}>
            <ActionIcon variant="subtle" onClick={controller.prevMonth} size="md">
              <IconChevronLeft size={18} />
            </ActionIcon>
          </motion.div>
          <Text
            fw={500}
            size="md"
            ta="center"
            style={{ cursor: "pointer", minWidth: 130 }}
            onClick={controller.goToToday}
          >
            {controller.currentDate.format("MMMM YYYY")}
          </Text>
          <motion.div whileTap={{ scale: 0.8 }} transition={tapSpring}>
            <ActionIcon variant="subtle" onClick={controller.nextMonth} size="md">
              <IconChevronRight size={18} />
            </ActionIcon>
          </motion.div>
        </Group>
        {/* Right-aligned controls */}
        <Group gap="xs" wrap="nowrap" style={{ marginLeft: "auto" }}>
          <motion.div whileTap={{ scale: 0.8 }} transition={tapSpring}>
            <ActionIcon
              variant="subtle"
              onClick={() => {
                controller.loadEvents();
                controller.loadClasses();
                controller.fetchCanvasAssignments();
                controller.fetchTodoistTasks();
              }}
              loading={controller.loading}
              size="md"
            >
              <IconRefresh size={18} />
            </ActionIcon>
          </motion.div>
          {isGuest ? (
            <Button size="xs" variant="filled" onClick={() => openSignIn()}>
              Sign In
            </Button>
          ) : (
            <UserButton />
          )}
        </Group>
      </Group>
    );
  }

  return (
    <Group h="100%" px="md" style={{ width: "100%" }} wrap="nowrap">
      <Group style={{ flex: 1 }} justify="flex-start">
        <Title order={3}>Canvas Task Manager (CTM)</Title>
      </Group>
      <Group style={{ flex: 1 }} justify="center" gap="xs">
        <Tooltip label="Previous month (P)">
          <ActionIcon variant="subtle" onClick={controller.prevMonth} size="lg">
            <IconChevronLeft size={20} />
          </ActionIcon>
        </Tooltip>
        <Tooltip label="Today (T)">
          <Text
            fw={500}
            size="lg"
            w={180}
            ta="center"
            style={{ cursor: "pointer" }}
            onClick={controller.goToToday}
          >
            {controller.currentDate.format("MMMM YYYY")}
          </Text>
        </Tooltip>
        <Tooltip label="Next month (N)">
          <ActionIcon variant="subtle" onClick={controller.nextMonth} size="lg">
            <IconChevronRight size={20} />
          </ActionIcon>
        </Tooltip>
      </Group>
      <Group style={{ flex: 1 }} justify="flex-end">
        <OnboardingTour.Target id="header-utilities">
          <Group gap="xs">
            <Tooltip label={`Search (${modKey}+K)`}>
              <ActionIcon
                variant="subtle"
                onClick={() => spotlight.open()}
                size="lg"
              >
                <IconSearch size={20} />
              </ActionIcon>
            </Tooltip>
            <Tooltip label={controller.getFetchTooltip()}>
              <ActionIcon
                variant="subtle"
                onClick={() => {
                  controller.loadEvents();
                  controller.loadClasses();
                  controller.fetchCanvasAssignments();
                  controller.fetchTodoistTasks();
                }}
                loading={controller.loading}
                size="lg"
              >
                <IconRefresh size={20} />
              </ActionIcon>
            </Tooltip>
            <Tooltip label={`Toggle theme (${modKey}+J)`}>
              <ActionIcon
                variant="subtle"
                onClick={toggleColorScheme}
                size="lg"
              >
                {colorScheme === "dark" ? (
                  <IconSun size={20} />
                ) : (
                  <IconMoon size={20} />
                )}
              </ActionIcon>
            </Tooltip>
          </Group>
        </OnboardingTour.Target>
        <OnboardingTour.Target id="settings-button">
          <Tooltip label={`Settings (${modKey}+,)`}>
            <ActionIcon
              variant="subtle"
              onClick={() => controller.setSettingsOpen(true)}
              size="lg"
            >
              <IconSettings size={20} />
            </ActionIcon>
          </Tooltip>
        </OnboardingTour.Target>
        {isGuest ? (
          <Button size="xs" variant="filled" onClick={() => openSignIn()}>
            Sign In
          </Button>
        ) : (
          <UserButton />
        )}
      </Group>
    </Group>
  );
}
