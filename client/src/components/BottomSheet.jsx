import { useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Box, Text, CloseButton, Group } from "@mantine/core";

const backdropVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.2 } },
  exit: { opacity: 0, transition: { duration: 0.25, ease: "easeInOut" } },
};

const sheetVariants = {
  hidden: { y: "100%", opacity: 0.8 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      type: "spring",
      damping: 28,
      stiffness: 300,
    },
  },
  exit: {
    y: "100%",
    opacity: 0,
    transition: {
      duration: 0.25,
      ease: "easeInOut",
    },
  },
};

export default function BottomSheet({
  opened,
  onClose,
  title,
  children,
  size = "md",
  closeOnClickOutside = true,
  closeOnEscape = true,
  withCloseButton = false,
}) {
  const sheetRef = useRef(null);

  // Lock body scroll when open
  useEffect(() => {
    if (opened) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
  }, [opened]);

  // Handle escape key
  useEffect(() => {
    if (!opened || !closeOnEscape) return;
    const handleEscape = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [opened, onClose, closeOnEscape]);

  const maxWidth =
    size === "xl"
      ? "900px"
      : size === "lg"
        ? "700px"
        : size === "md"
          ? "560px"
          : "400px";

  const content = (
    <AnimatePresence>
      {opened && (
        <motion.div
          key="bottom-sheet-backdrop"
          variants={backdropVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0, 0, 0, 0.6)",
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center",
            zIndex: 200,
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget && closeOnClickOutside) onClose();
          }}
        >
          <motion.div
            ref={sheetRef}
            variants={sheetVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            drag={closeOnClickOutside ? "y" : false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.4 }}
            onDragEnd={(_, info) => {
              if (!closeOnClickOutside) return;
              const sheetHeight = sheetRef.current?.offsetHeight || 0;
              // Dismiss if dragged down more than 30% of height or with velocity
              if (info.offset.y > sheetHeight * 0.3 || info.velocity.y > 500) {
                onClose();
              }
            }}
            style={{
              background: "var(--card)",
              borderRadius: "12px 12px 0 0",
              width: "100%",
              maxWidth,
              maxHeight: "90vh",
              overflow: "hidden",
              boxShadow: "var(--shadow-lift)",
              border: "1px solid var(--rule)",
              borderBottom: "none",
              touchAction: "none",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drag Handle */}
            <Box
              style={{
                display: "flex",
                justifyContent: "center",
                paddingTop: 12,
                paddingBottom: 8,
                cursor: "grab",
              }}
            >
              <Box
                style={{
                  width: 40,
                  height: 4,
                  backgroundColor: "var(--rule-strong)",
                  borderRadius: 2,
                }}
              />
            </Box>

            {/* Header */}
            {title && (
              <Box
                style={{
                  padding: "4px 24px 16px 24px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <Text
                  fw={600}
                  size="lg"
                  style={{ color: "var(--ink)", letterSpacing: "-0.01em" }}
                >
                  {title}
                </Text>
                {withCloseButton && (
                  <CloseButton
                    onClick={onClose}
                    style={{ color: "var(--graphite)" }}
                  />
                )}
              </Box>
            )}

            {/* Content */}
            <Box
              style={{
                padding: "0 24px 24px 24px",
                overflowY: "auto",
                maxHeight: title ? "calc(90vh - 80px)" : "calc(90vh - 40px)",
              }}
            >
              {children}
            </Box>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return createPortal(content, document.body);
}
