import { useRef, useEffect, useState, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence, useDragControls } from "framer-motion";
import { Box, Text, CloseButton, Group } from "@mantine/core";
import { IconGripVertical } from "@tabler/icons-react";

const PANEL_WIDTH = 400;
const GAP = 12;
const MARGIN = 16;

function computePosition(anchorRect, panelHeight) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  let left, top;

  if (anchorRect) {
    // Try right side
    left = anchorRect.right + GAP;
    if (left + PANEL_WIDTH + MARGIN > vw) {
      // Flip to left
      left = anchorRect.left - GAP - PANEL_WIDTH;
    }
    // Clamp horizontal
    left = Math.max(MARGIN, Math.min(left, vw - PANEL_WIDTH - MARGIN));

    // Vertically center on anchor
    top = anchorRect.top + anchorRect.height / 2 - panelHeight / 2;
  } else {
    // No anchor — center on screen
    left = (vw - PANEL_WIDTH) / 2;
    top = (vh - panelHeight) / 2;
  }

  // Clamp vertical
  top = Math.max(MARGIN, Math.min(top, vh - panelHeight - MARGIN));

  return { left, top };
}

export default function FloatingPanel({
  opened,
  onClose,
  title,
  children,
  anchorRect = null,
  closeOnEscape = true,
}) {
  const panelRef = useRef(null);
  const dragControls = useDragControls();
  const [panelHeight, setPanelHeight] = useState(400);
  const [userDragged, setUserDragged] = useState(false);
  const [position, setPosition] = useState({ left: 0, top: 0 });

  // Compute position when opened or anchor changes
  useLayoutEffect(() => {
    if (!opened || userDragged) return;
    setPosition(computePosition(anchorRect, panelHeight));
  }, [opened, anchorRect, panelHeight, userDragged]);

  // Measure panel height after render
  useLayoutEffect(() => {
    if (!opened || !panelRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setPanelHeight(entry.contentRect.height);
      }
    });
    observer.observe(panelRef.current);
    return () => observer.disconnect();
  }, [opened]);

  // Reposition on window resize (unless user dragged)
  useEffect(() => {
    if (!opened || userDragged) return;
    const handleResize = () => {
      setPosition(computePosition(anchorRect, panelHeight));
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [opened, anchorRect, panelHeight, userDragged]);

  // Reset drag state when panel closes
  useEffect(() => {
    if (!opened) setUserDragged(false);
  }, [opened]);

  // Escape key
  useEffect(() => {
    if (!opened || !closeOnEscape) return;
    const handleEscape = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [opened, onClose, closeOnEscape]);

  // Determine caret side (points toward anchor)
  const caretSide = anchorRect
    ? position.left > anchorRect.right ? "left" : "right"
    : null;
  const caretTop = anchorRect
    ? Math.max(20, Math.min(
        anchorRect.top + anchorRect.height / 2 - position.top,
        panelHeight - 20
      ))
    : null;

  const content = (
    <AnimatePresence>
      {opened && (
        <motion.div
          ref={panelRef}
          key="floating-panel"
          initial={{ opacity: 0, scale: 0.95, left: position.left, top: position.top }}
          animate={{ opacity: 1, scale: 1, left: position.left, top: position.top }}
          exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.15, ease: "easeOut" } }}
          transition={{
            type: "spring",
            damping: 28,
            stiffness: 280,
            left: { type: "spring", damping: 26, stiffness: 240 },
            top: { type: "spring", damping: 26, stiffness: 240 },
          }}
          drag
          dragControls={dragControls}
          dragListener={false}
          dragMomentum={false}
          onDragStart={() => setUserDragged(true)}
          style={{
            position: "fixed",
            width: PANEL_WIDTH,
            maxHeight: "80vh",
            background: "var(--card)",
            borderRadius: 12,
            border: "1px solid var(--rule)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.1)",
            zIndex: 200,
            overflow: "hidden",
            touchAction: "none",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Caret pointing toward anchor */}
          {caretSide && caretTop != null && (
            <div
              style={{
                position: "absolute",
                top: caretTop - 8,
                [caretSide === "left" ? "left" : "right"]: -8,
                width: 0,
                height: 0,
                borderTop: "8px solid transparent",
                borderBottom: "8px solid transparent",
                [caretSide === "left" ? "borderRight" : "borderLeft"]: "8px solid var(--card)",
                filter: "drop-shadow(-1px 0 0 var(--rule))",
                zIndex: 1,
                pointerEvents: "none",
              }}
            />
          )}

          {/* Header — drag handle */}
          <div
            onPointerDown={(e) => dragControls.start(e)}
            style={{ cursor: "grab", userSelect: "none" }}
          >
            <Box
              style={{
                padding: "12px 16px 8px 16px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Group gap={8} wrap="nowrap">
                <IconGripVertical size={16} style={{ opacity: 0.3, flexShrink: 0 }} />
                <Text
                  fw={600}
                  size="lg"
                  style={{ color: "var(--ink)", letterSpacing: "-0.01em" }}
                >
                  {title}
                </Text>
              </Group>
              <CloseButton
                onClick={onClose}
                onPointerDown={(e) => e.stopPropagation()}
                style={{ color: "var(--graphite)" }}
              />
            </Box>
          </div>

          {/* Content */}
          <Box
            style={{
              padding: "0 16px 16px 16px",
              overflowY: "auto",
              maxHeight: "calc(80vh - 52px)",
            }}
          >
            {children}
          </Box>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return createPortal(content, document.body);
}
