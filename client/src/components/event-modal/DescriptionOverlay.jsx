import { Box, Button, Group, Text, TypographyStylesProvider } from "@mantine/core";
import { AnimatePresence, motion } from "framer-motion";
import { Portal } from "@mantine/core";
import useIsMobile from "../../hooks/useIsMobile";

export default function DescriptionOverlay({
  opened,
  onClose,
  title,
  descriptionHtml,
  layoutId,
}) {
  const isMobile = useIsMobile();

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
              alignItems: isMobile ? "flex-end" : "center",
              justifyContent: "center",
              padding: isMobile ? 0 : 24,
            }}
            onClick={onClose}
          >
            <motion.div
              layoutId={layoutId}
              initial={{ opacity: 0, scale: isMobile ? 1 : 0.92, y: isMobile ? "100%" : 0 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: isMobile ? 1 : 0.7, y: isMobile ? "100%" : 0 }}
              transition={{
                type: "spring",
                stiffness: 260,
                damping: 22,
              }}
              style={{
                width: isMobile ? "100vw" : "70vw",
                height: isMobile ? "85dvh" : "70vh",
                maxWidth: isMobile ? "100vw" : "1100px",
                maxHeight: isMobile ? "85dvh" : "80vh",
                backgroundColor: "var(--mantine-color-body)",
                borderRadius: isMobile ? "12px 12px 0 0" : 12,
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
