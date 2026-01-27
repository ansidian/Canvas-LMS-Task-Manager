import { Box, Button, Group } from "@mantine/core";
import { IconTrash, IconCheck } from "@tabler/icons-react";

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
        borderTop: "1px solid var(--rule)",
        paddingTop: 16,
        marginTop: 16,
      }}
    >
      <Group justify="space-between">
        <Button
          color={confirmDelete ? "red" : "gray"}
          variant={confirmDelete ? "filled" : "subtle"}
          onClick={onDelete}
          leftSection={confirmDelete ? null : <IconTrash size={16} />}
          size="sm"
        >
          {confirmDelete ? "Click to Confirm" : "Delete"}
        </Button>
        <Group gap={10}>
          <Button
            variant="subtle"
            onClick={onDiscard}
            size="sm"
            color="gray"
          >
            Cancel
          </Button>
          <Button
            onClick={onSubmit}
            color={saveSuccess ? "green" : "blue"}
            className={saveSuccess ? "success-flash" : ""}
            leftSection={saveSuccess ? <IconCheck size={16} /> : null}
            size="sm"
            styles={{
              root: {
                minWidth: 120,
              },
            }}
          >
            {saveSuccess ? "Saved" : "Save Changes"}
          </Button>
        </Group>
      </Group>
    </Box>
  );
}
