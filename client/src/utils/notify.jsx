import { Box, Button, Text } from "@mantine/core";
import { notifications } from "@mantine/notifications";

const BASE_NOTIFICATION_PROPS = {
  closeButtonProps: { iconSize: 40 },
};

const formatUndoMessage = (title, message, label, color, onUndo, disabled) => (
	<Box
		style={{
			display: "flex",
			alignItems: "center",
			justifyContent: "space-between",
			gap: 16,
			width: "100%",
		}}
	>
		<Box
			style={{
				display: "flex",
				flexDirection: "column",
				gap: 4,
			}}
		>
			{title ? (
				<Text size="sm" fw={600}>
					{title}
				</Text>
			) : null}
			{message ? <Text size="sm">{message}</Text> : null}
		</Box>
		<Button
			variant="light"
			color={color}
			size="xs"
			onClick={onUndo}
			disabled={disabled}
		>
			{label}
		</Button>
	</Box>
);

const undoNotificationStyles = {
	root: {
		alignItems: "center",
	},
	body: {
		width: "100%",
		alignItems: "center",
	},
};

export const notifySuccess = (message, options = {}) => {
  notifications.show({
    message,
    color: "green",
    ...BASE_NOTIFICATION_PROPS,
    ...options,
  });
};

export const notifyError = (message, options = {}) => {
  notifications.show({
    message,
    color: "red",
    ...BASE_NOTIFICATION_PROPS,
    ...options,
  });
};

export const notifyUndo = ({
  title,
  message,
  onUndo,
  duration = 7000,
  undoLabel = "Undo",
  color = "red",
}) => {
  const id = `undo-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const totalSeconds = Math.max(1, Math.ceil(duration / 1000));
  let remainingSeconds = totalSeconds;
  let intervalId = null;
  let cleanupTimeoutId = null;

  const handleCleanup = () => {
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
    if (cleanupTimeoutId) {
      clearTimeout(cleanupTimeoutId);
      cleanupTimeoutId = null;
    }
  };

  const handleUndo = () => {
    handleCleanup();
    onUndo?.();
    notifications.hide(id);
  };

  notifications.show({
    id,
		title: null,
		color,
		autoClose: duration,
		message: formatUndoMessage(
			title,
			message,
			`${undoLabel} (${remainingSeconds})`,
			color,
			handleUndo,
			false,
		),
		styles: undoNotificationStyles,
		onClose: handleCleanup,
		...BASE_NOTIFICATION_PROPS,
	});

  cleanupTimeoutId = setTimeout(() => {
    handleCleanup();
  }, duration + 250);

  intervalId = setInterval(() => {
    const nextRemaining = remainingSeconds - 1;
    if (nextRemaining < 0) {
      handleCleanup();
      return;
    }
    remainingSeconds = nextRemaining;
    const isExpired = remainingSeconds === 0;
		notifications.update({
			id,
			message: formatUndoMessage(
				title,
				message,
				isExpired ? undoLabel : `${undoLabel} (${remainingSeconds})`,
				color,
				handleUndo,
				isExpired,
			),
			styles: undoNotificationStyles,
		});
    if (isExpired) {
      handleCleanup();
    }
  }, 1000);

  return () => {
    clearTimeout(cleanupTimeoutId);
    handleCleanup();
  };
};
