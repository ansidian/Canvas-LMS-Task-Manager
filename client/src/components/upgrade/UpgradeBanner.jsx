import { Alert, Button, CloseButton, Group, Text } from "@mantine/core";
import { IconInfoCircle } from "@tabler/icons-react";
import { SignInButton } from "@clerk/clerk-react";

/**
 * Banner component encouraging guest users to sign in and save their work.
 * @param {function} onDismiss - Callback when user clicks dismiss (X) button
 */
export default function UpgradeBanner({ onDismiss }) {
	return (
		<Alert
			variant="light"
			color="blue"
			icon={<IconInfoCircle size={18} />}
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
					Sign in to save your tasks permanently and access them on any device.
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
						aria-label="Dismiss upgrade banner"
					/>
				</Group>
			</Group>
		</Alert>
	);
}
