import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Stack, Paper, Box, Text } from "@mantine/core";
import { motion, AnimatePresence, useAnimation } from "framer-motion";
import useApprovalModalState from "../hooks/useApprovalModalState";
import useFormInitialization from "../hooks/useFormInitialization";
import useApprovalHandlers from "../hooks/useApprovalHandlers";
import useModalLifecycle from "../hooks/useModalLifecycle";
import useCardDeck, { getCardAnimationProps } from "../hooks/useCardDeck";
import {
  ApprovalActionButtons,
  ApprovalCardHeader,
  ApprovalCardPreview,
  ApprovalClassSelect,
  ApprovalDescriptionPreview,
  ApprovalDueDateField,
  ApprovalEventTypeSelect,
  ApprovalLockStatus,
  ApprovalNotesField,
  ApprovalPointsBadge,
  ApprovalUrlField,
} from "./approval/ApprovalCardParts";
import DescriptionOverlay from "./event-modal/DescriptionOverlay";

const backdropVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.2 } },
  exit: { opacity: 0, transition: { duration: 0.25, ease: "easeInOut" } },
};

/**
 * Full card component - only rendered for the active card.
 * Contains all interactive form elements.
 */
function ActiveCardContent({
  item,
  classes,
  events,
  unassignedColor,
  handlers,
  formData,
  setFormData,
  showDescriptionFullscreen,
  setShowDescriptionFullscreen,
  eventTypePulse,
  shakeControls,
  onHeightChange,
}) {
  const contentRef = useRef(null);
  const isCanvasLinked = Boolean(item?.canvas_id);
  const isSyncLocked = isCanvasLinked && !formData?.canvas_due_date_override;

  const matchingClass = classes?.find(
    (c) => c.name.toLowerCase() === item.course_name?.toLowerCase(),
  );
  const classColor = matchingClass?.color || null;

  // Report height when content mounts or changes
  // Use double RAF to ensure layout is complete before measuring
  useEffect(() => {
    if (!contentRef.current || !onHeightChange) return;

    const measureHeight = () => {
      if (contentRef.current) {
        const height = contentRef.current.offsetHeight;
        if (height > 0) {
          onHeightChange(height);
        }
      }
    };

    // Double RAF to ensure browser has completed layout
    const rafId = requestAnimationFrame(() => {
      requestAnimationFrame(measureHeight);
    });

    // Set up ResizeObserver for dynamic content changes
    const resizeObserver = new ResizeObserver(measureHeight);
    resizeObserver.observe(contentRef.current);

    return () => {
      cancelAnimationFrame(rafId);
      resizeObserver.disconnect();
    };
  }, [onHeightChange]);

  return (
    <motion.div ref={contentRef} animate={shakeControls}>
      <Paper
        className="modal-card"
        p="xl"
        style={{
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Class color accent bar */}
        {classColor && (
          <Box
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              bottom: 0,
              width: 4,
              backgroundColor: classColor,
              borderRadius: "12px 0 0 12px",
            }}
          />
        )}

        <Stack gap={16}>
          <ApprovalCardHeader
            item={item}
            onAttemptClose={handlers.onAttemptClose}
          />

          <ApprovalDueDateField
            formData={formData}
            setFormData={setFormData}
            onUserEdit={handlers.onUserEdit}
            isCanvasLinked={isCanvasLinked}
            isSyncLocked={isSyncLocked}
          />

          <ApprovalClassSelect
            classes={classes}
            formData={formData}
            setFormData={setFormData}
            onUserEdit={handlers.onUserEdit}
            unassignedColor={unassignedColor}
          />

          <ApprovalEventTypeSelect
            formData={formData}
            setFormData={setFormData}
            onUserEdit={handlers.onUserEdit}
            eventTypePulse={eventTypePulse}
          />

          <ApprovalUrlField
            formData={formData}
            setFormData={setFormData}
            onUserEdit={handlers.onUserEdit}
          />

          <ApprovalPointsBadge item={item} />

          <ApprovalLockStatus item={item} />

          <ApprovalDescriptionPreview
            item={item}
            showDescriptionFullscreen={showDescriptionFullscreen}
            setShowDescriptionFullscreen={setShowDescriptionFullscreen}
          />

          <ApprovalNotesField
            formData={formData}
            setFormData={setFormData}
            onUserEdit={handlers.onUserEdit}
            events={events}
            classes={classes}
            unassignedColor={unassignedColor}
            onOpenEvent={handlers.onOpenEvent}
          />

          <ApprovalActionButtons
            item={item}
            onReject={handlers.onReject}
            onDiscard={handlers.onDiscard}
            onApprove={handlers.onApprove}
          />
        </Stack>
      </Paper>
    </motion.div>
  );
}

/**
 * Wrapper that renders either full content (active) or lightweight preview (background).
 * This avoids mounting expensive form components for non-interactive cards.
 */
function CardWrapper({
  item,
  classes,
  events,
  unassignedColor,
  isActive,
  isReady,
  onClick,
  handlers,
  formData,
  setFormData,
  showDescriptionFullscreen,
  setShowDescriptionFullscreen,
  eventTypePulse,
  shakeControls,
  position,
  onPeekStart,
  onPeekEnd,
  onHeightChange,
}) {
  // Background cards use lightweight preview
  if (!isActive) {
    return (
      <ApprovalCardPreview
        item={item}
        classes={classes}
        onClick={onClick}
        position={position}
        onPeekStart={onPeekStart}
        onPeekEnd={onPeekEnd}
      />
    );
  }

  // Active card during shuffle settle - show preview briefly for smooth transition
  if (!isReady) {
    return (
      <ApprovalCardPreview
        item={item}
        classes={classes}
        style={{ cursor: "default" }}
      />
    );
  }

  // Active card ready - render full interactive content
  return (
    <ActiveCardContent
      item={item}
      classes={classes}
      events={events}
      unassignedColor={unassignedColor}
      handlers={handlers}
      formData={formData}
      setFormData={setFormData}
      showDescriptionFullscreen={showDescriptionFullscreen}
      setShowDescriptionFullscreen={setShowDescriptionFullscreen}
      eventTypePulse={eventTypePulse}
      shakeControls={shakeControls}
      onHeightChange={onHeightChange}
    />
  );
}

export default function ApprovalModal({
  opened,
  onClose,
  item,
  items,
  classes,
  events,
  unassignedColor,
  onApprove,
  onReject,
  pendingCount,
  currentIndex,
  onNavigate,
  onOpenEvent,
}) {
  const {
    formData,
    setFormData,
    initializeFormData,
    isDirty,
    isDirtyRef,
    exitDirection,
    setExitDirection,
    showDescriptionFullscreen,
    setShowDescriptionFullscreen,
    eventTypePulse,
    setEventTypePulse,
    shakeCount,
    setShakeCount,
    hasUserEdited,
    setHasUserEdited,
  } = useApprovalModalState();
  const shakeControls = useAnimation();
  const prevShakeCountRef = useRef(shakeCount);

  // Form initialization when item changes
  useFormInitialization({
    item,
    classes,
    initializeFormData,
    setEventTypePulse,
    setExitDirection,
    setShowDescriptionFullscreen,
  });

  // Physics-based card deck management
  const {
    visibleCards,
    isShuffling,
    shuffleState,
    shuffleTo,
    getShuffleTransition,
    getTargetPosition,
    reset: resetCardDeck,
    cleanup: cleanupCardDeck,
  } = useCardDeck({
    totalCards: pendingCount,
    currentIndex,
    onNavigate,
    shouldBlockNavigation: () => hasUserEdited && isDirtyRef.current,
    onBlockedAttempt: () => setShakeCount((prev) => prev + 1),
  });

  // Track active card height for dynamic title positioning
  const [activeCardHeight, setActiveCardHeight] = useState(600);

  // Track closing state for card exit animation
  const [isClosing, setIsClosing] = useState(false);

  // Consolidated handlers
  const {
    handleAttemptClose,
    handleDiscard,
    markUserEdited,
    handleApproveClick,
    handleRejectClick,
    handleNavigate,
    handleCardClick,
    handleOpenMentionEvent,
    cancelClosing,
  } = useApprovalHandlers({
    hasUserEdited,
    isDirty,
    setShakeCount,
    setHasUserEdited,
    setIsClosing,
    resetCardDeck,
    onClose,
    setExitDirection,
    formData,
    item,
    onApprove,
    onReject,
    onNavigate,
    onOpenEvent,
    currentIndex,
    isShuffling,
    shuffleTo,
  });

  // Modal lifecycle management (reset on item change, card ready, scroll lock, peek)
  const { isCardReady, peekingCard, startPeek, endPeek } = useModalLifecycle({
    opened,
    item,
    isShuffling,
    resetCardDeck,
    cancelClosing,
    setIsClosing,
  });

  // Shake animation
  useEffect(() => {
    if (shakeCount > 0 && shakeCount !== prevShakeCountRef.current) {
      shakeControls.start({
        x: [0, -8, 8, -6, 6, 0],
        transition: { duration: 0.35 },
      });
    }
    prevShakeCountRef.current = shakeCount;
  }, [shakeCount, shakeControls]);

  // Keyboard navigation (wraps around)
  useEffect(() => {
    if (!opened) return;

    const handleKeyDown = (e) => {
      if (e.key === "ArrowLeft" && pendingCount > 1) {
        e.preventDefault();
        handleNavigate(-1);
      } else if (e.key === "ArrowRight" && pendingCount > 1) {
        e.preventDefault();
        handleNavigate(1);
      } else if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        handleApproveClick();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [opened, currentIndex, pendingCount, formData, item]);

  // Cleanup card deck on unmount
  useEffect(() => {
    return () => cleanupCardDeck();
  }, [cleanupCardDeck]);

  const content = (
    <>
      <DescriptionOverlay
        opened={showDescriptionFullscreen}
        onClose={() => setShowDescriptionFullscreen(false)}
        title={item?.title}
        descriptionHtml={item?.description}
        layoutId={item ? `description-${item.canvas_id}` : undefined}
      />

      <AnimatePresence>
        {opened && (
          <motion.div
            key="approval-backdrop"
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
              if (e.target === e.currentTarget) handleAttemptClose();
            }}
          >
            {/* Card stack container */}
            <Box
              style={{
                position: "relative",
                width: "100%",
                maxWidth: "500px",
                display: "flex",
                alignItems: "flex-end",
                justifyContent: "center",
                paddingBottom: 24,
                height: "100%",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Title with backdrop - positioned above card stack */}
              {/* Outer wrapper handles centering and vertical position */}
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={
                  isClosing ? { opacity: 0, y: -20 } : { opacity: 1, y: 0 }
                }
                exit={{ opacity: 0, y: -10 }}
                transition={
                  isClosing
                    ? { duration: 0.15, ease: "easeIn" }
                    : {
                        opacity: { duration: 0.25, delay: 0.1 },
                        y: { duration: 0.25, delay: 0.1 },
                      }
                }
                style={{
                  position: "absolute",
                  bottom: activeCardHeight + 40, // 40px spacing above active card
                  left: "50%",
                  marginLeft: -250, // Half of card width (500px) to center
                  width: 500,
                  display: "flex",
                  justifyContent: "center",
                  zIndex: 210,
                  transition: "bottom 0.3s ease-out",
                }}
              >
                <div
                  style={{
                    paddingTop: 6,
                    paddingBottom: 6,
                    paddingLeft: 20,
                    paddingRight: 20,
                    position: "relative",
                  }}
                >
                  {/* Backdrop */}
                  <Box
                    style={{
                      position: "absolute",
                      inset: 0,
                      backgroundColor: "rgba(0, 0, 0, 0.35)",
                      backdropFilter: "blur(12px)",
                      borderRadius: 12,
                      border: "1px solid rgba(255, 255, 255, 0.1)",
                    }}
                  />
                  {/* Text */}
                  <Text
                    fw={600}
                    size="sm"
                    style={{
                      position: "relative",
                      background:
                        "linear-gradient(135deg, #93c5fd 0%, #ddd6fe 100%)",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                      backgroundClip: "text",
                      letterSpacing: "0.3px",
                      whiteSpace: "nowrap",
                    }}
                  >
                    Review Assignment ({currentIndex + 1} of {pendingCount})
                  </Text>
                </div>
              </motion.div>

              {/* Card stack */}
              <Box
                style={{
                  position: "relative",
                  width: "100%",
                  display: "flex",
                  alignItems: "flex-end",
                  justifyContent: "center",
                }}
              >
                <AnimatePresence mode="popLayout">
                  {visibleCards.map(({ itemIndex, position }) => {
                    const cardItem =
                      items?.[itemIndex] ||
                      (itemIndex === currentIndex ? item : null);
                    if (!cardItem) return null;

                    const targetPosition = getTargetPosition(itemIndex);
                    const animProps = getCardAnimationProps({
                      itemIndex,
                      position,
                      targetPosition,
                      shuffleState,
                      exitDirection,
                      isClosing,
                      peekingCard,
                      isShuffling,
                      getShuffleTransition,
                    });

                    return (
                      <motion.div
                        key={cardItem.canvas_id}
                        layout
                        style={animProps.style}
                        initial={animProps.initial}
                        animate={animProps.animate}
                        exit={animProps.exit}
                        transition={animProps.transition}
                      >
                        <CardWrapper
                          item={cardItem}
                          classes={classes}
                          events={events}
                          unassignedColor={unassignedColor}
                          isActive={animProps.isActive}
                          isReady={isCardReady}
                          onClick={() => handleCardClick(itemIndex)}
                          handlers={{
                            onUserEdit: markUserEdited,
                            onApprove: handleApproveClick,
                            onReject: handleRejectClick,
                            onAttemptClose: handleAttemptClose,
                            onDiscard: handleDiscard,
                            onOpenEvent: handleOpenMentionEvent,
                          }}
                          formData={formData}
                          setFormData={setFormData}
                          showDescriptionFullscreen={showDescriptionFullscreen}
                          setShowDescriptionFullscreen={
                            setShowDescriptionFullscreen
                          }
                          eventTypePulse={eventTypePulse}
                          shakeControls={shakeControls}
                          position={targetPosition}
                          onPeekStart={() => startPeek(itemIndex)}
                          onPeekEnd={() => endPeek(itemIndex)}
                          onHeightChange={
                            animProps.isActive ? setActiveCardHeight : undefined
                          }
                        />
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </Box>
            </Box>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );

  return createPortal(content, document.body);
}
