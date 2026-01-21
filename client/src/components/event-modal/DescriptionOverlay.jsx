import { Box, Button, Group, Text, TypographyStylesProvider } from "@mantine/core";
import { AnimatePresence, motion } from "framer-motion";
import { Portal } from "@mantine/core";

export default function DescriptionOverlay({
  opened,
  onClose,
  title,
  descriptionHtml,
  layoutId,
}) {
  return (
    <Portal>
      <AnimatePresence>
        {opened && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: "fixed",
              inset: 0,
              backgroundColor: "rgba(0, 0, 0, 0.7)",
              zIndex: 210,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 24,
            }}
            onClick={onClose}
          >
            <motion.div
              layoutId={layoutId}
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
                  <Text fw={600}>{title}</Text>
                  <Button size="xs" variant="subtle" onClick={onClose}>
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
                      __html: descriptionHtml,
                    }}
                  />
                </TypographyStylesProvider>
              </Box>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </Portal>
  );
}
