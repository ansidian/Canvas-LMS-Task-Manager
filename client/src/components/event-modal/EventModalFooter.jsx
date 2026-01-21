import { Box, Button, Group } from "@mantine/core";

export default function EventModalFooter({
  confirmDelete,
  saveSuccess,
  onDelete,
  onDiscard,
  onSubmit,
}) {
  return (
    <Box
      style={{
        borderTop: "1px solid var(--mantine-color-default-border)",
        paddingTop: 16,
      }}
    >
      <Group justify="space-between">
        <Button
          color={confirmDelete ? "red" : "gray"}
          variant={confirmDelete ? "filled" : "subtle"}
          onClick={onDelete}
        >
          {confirmDelete ? "Confirm Delete" : "Delete"}
        </Button>
        <Group>
          <Button variant="subtle" onClick={onDiscard}>
            Cancel
          </Button>
          <Button
            onClick={onSubmit}
            color={saveSuccess ? "green" : "blue"}
            className={saveSuccess ? "success-flash" : ""}
          >
            {saveSuccess ? "✓ Saved" : "Save Changes"}
          </Button>
        </Group>
      </Group>
    </Box>
  );
}
