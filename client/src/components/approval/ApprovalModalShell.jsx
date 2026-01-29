import { ActionIcon, Badge } from "@mantine/core";
import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";

export function ApprovalPositionBadge({ config }) {
  return (
    <Badge
      variant="filled"
      color="blue"
      size="lg"
      style={{
        position: "absolute",
        top: "20px",
        left: "50%",
        transform: "translateX(-50%)",
      }}
    >
      {config.currentIndex + 1} of {config.pendingCount}
    </Badge>
  );
}

export function ApprovalNavigationControls({ config, handlers }) {
  return (
    <>
      <ActionIcon
        variant="filled"
        size="xl"
        onClick={() => handlers.onNavigate(-1)}
        disabled={!config.canGoPrev}
        style={{
          position: "absolute",
          left: "-25px",
          top: "50%",
          transform: "translateY(-50%)",
          zIndex: 10,
        }}
      >
        <IconChevronLeft size={24} />
      </ActionIcon>

      <ActionIcon
        variant="filled"
        size="xl"
        onClick={() => handlers.onNavigate(1)}
        disabled={!config.canGoNext}
        style={{
          position: "absolute",
          right: "-25px",
          top: "50%",
          transform: "translateY(-50%)",
          zIndex: 10,
        }}
      >
        <IconChevronRight size={24} />
      </ActionIcon>
    </>
  );
}
