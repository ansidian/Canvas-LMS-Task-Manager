import { ActionIcon, Badge, Box, Button, Group, Text, TypographyStylesProvider } from "@mantine/core";
import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";
import { AnimatePresence, motion } from "framer-motion";

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

export function ApprovalDescriptionFullscreen({ config, handlers }) {
  const { item, showDescriptionFullscreen } = config;

  if (!item) return null;

  return (
    <AnimatePresence>
      {showDescriptionFullscreen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0, 0, 0, 0.7)",
            zIndex: 250,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
          }}
          onClick={handlers.onClose}
        >
          <motion.div
            layoutId={`description-${item.canvas_id}`}
            transition={{
              type: "spring",
              stiffness: 260,
              damping: 22,
            }}
            style={{
              width: "70vw",
              height: "70vh",
              maxWidth: "1100px",
              maxHeight: "80vh",
              backgroundColor: "var(--mantine-color-body)",
              borderRadius: 12,
              border: "1px solid var(--mantine-color-default-border)",
              overflow: "hidden",
              boxShadow:
                "0 30px 80px rgba(0, 0, 0, 0.35), 0 8px 24px rgba(0, 0, 0, 0.25)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <Box
              style={{
                padding: 16,
                borderBottom: "1px solid var(--mantine-color-default-border)",
              }}
            >
              <Group justify="space-between">
                <Text fw={600}>{item.title}</Text>
                <Button size="xs" variant="subtle" onClick={handlers.onClose}>
                  Close
                </Button>
              </Group>
            </Box>
            <Box
              style={{
                padding: 16,
                maxHeight: "calc(90vh - 60px)",
                overflowY: "auto",
              }}
            >
              <TypographyStylesProvider>
                <div
                  dangerouslySetInnerHTML={{
                    __html: item.description,
                  }}
                />
              </TypographyStylesProvider>
            </Box>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
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
