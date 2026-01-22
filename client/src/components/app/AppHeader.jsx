import {
	ActionIcon,
	Badge,
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
import { UserButton } from "@clerk/clerk-react";
import { spotlight } from "@mantine/spotlight";
import { useAppControllerContext } from "../../contexts/AppControllerContext";

const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
const modKey = isMac ? "⌘" : "Ctrl";

export default function AppHeader({ pendingCount }) {
	const controller = useAppControllerContext();
	const { colorScheme, toggleColorScheme } = useMantineColorScheme();

	return (
		<Group h="100%" px="md" justify="space-between">
			<Group>
				<Title order={3}>Canvas Task Manager (CTM)</Title>
			</Group>
			<Group gap="xs">
				<Tooltip label="Previous month (P)">
					<ActionIcon
						variant="subtle"
						onClick={controller.prevMonth}
						size="lg"
					>
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
					<ActionIcon
						variant="subtle"
						onClick={controller.nextMonth}
						size="lg"
					>
						<IconChevronRight size={20} />
					</ActionIcon>
				</Tooltip>
			</Group>
			<Group>
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
								onClick={() => controller.fetchCanvasAssignments()}
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
				{pendingCount > 0 && (
					<Badge color="red" variant="filled">
						{pendingCount} pending
					</Badge>
				)}
				<UserButton afterSignOutUrl="/?signedOut=1" />
			</Group>
		</Group>
	);
}
