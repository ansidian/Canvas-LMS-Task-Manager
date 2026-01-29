import { useEffect, useRef, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Stack, Paper, Box, Text } from "@mantine/core";
import { motion, AnimatePresence, useAnimation } from "framer-motion";
import { parseDueDate, toUTCString } from "../utils/datetime";
import useApprovalModalState from "../hooks/useApprovalModalState";
import useCardDeck, {
  getCardTransform,
  getShuffleMotion,
  getEnterPosition,
} from "../hooks/useCardDeck";
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

const detectEventTypeFromTitle = (title) => {
  if (!title) return null;
  const normalized = title.toLowerCase();
  const rules = [
    { type: "quiz", patterns: [/\bquiz\b/, /\bqz\b/] },
    {
      type: "exam",
      patterns: [/\bexam\b/, /\bmidterm\b/, /\bfinal\b/, /\btest\b/],
    },
    {
      type: "homework",
      patterns: [/\bhomework\b/, /\bhw\b/, /\bpset\b/, /problem set/],
    },
    { type: "lab", patterns: [/\blab\b/] },
    { type: "assignment", patterns: [/\bassignment\b/, /\bassign\b/] },
  ];

  for (const rule of rules) {
    if (rule.patterns.some((pattern) => pattern.test(normalized))) {
      return rule.type;
    }
  }

  return null;
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

  const handleSubmit = () => {
    const dueDate = formData.dueDate
      ? toUTCString(formData.dueDate)
      : item.due_date;

    handlers.onApprove(item, {
      ...formData,
      dueDate,
    });
  };

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
            onApprove={handleSubmit}
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
  const eventTypePulseTimeoutRef = useRef(null);
  const initialFormDataRef = useRef(null);
  const shakeControls = useAnimation();
  const prevShakeCountRef = useRef(shakeCount);

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

  // Track isDirty in a ref for the card deck hook
  const isDirtyRef = useRef(false);

  // Track which card (by itemIndex) is being peeked via edge hover
  const [peekingCard, setPeekingCard] = useState(null);

  // Deferred mount: active card shows preview during shuffle, then mounts full content
  // This prevents heavy form components from mounting during animation
  const [isCardReady, setIsCardReady] = useState(true);
  const cardReadyTimeoutRef = useRef(null);

  // Track active card height for dynamic title positioning
  // Height is reported by ActiveCardContent via onHeightChange callback
  const [activeCardHeight, setActiveCardHeight] = useState(600); // Default to tall to avoid overlap before measurement

  // Track closing state for card exit animation
  const [isClosing, setIsClosing] = useState(false);
  const closingTimeoutRef = useRef(null);

  // Track which item we're showing to detect external navigation
  const activeItemIdRef = useRef(null);

  // Reset state when modal opens OR when switching to a different item
  // This handles the case where user clicks out, then clicks a different pending item
  // before the close animation finishes
  useEffect(() => {
    if (opened && item) {
      const itemId = item.canvas_id;
      const isNewItem = activeItemIdRef.current !== itemId;
      activeItemIdRef.current = itemId;

      if (isNewItem) {
        // Switching to a new item - cancel any in-progress close and reset state
        setIsClosing(false);
        if (closingTimeoutRef.current) {
          clearTimeout(closingTimeoutRef.current);
        }
        resetCardDeck();
        setPeekingCard(null);
        setIsCardReady(true);
        if (cardReadyTimeoutRef.current) {
          clearTimeout(cardReadyTimeoutRef.current);
        }
      }
    } else if (!opened) {
      // Modal closed - clear the tracked item so next open is treated as new
      activeItemIdRef.current = null;
    }

    return () => {
      if (closingTimeoutRef.current) {
        clearTimeout(closingTimeoutRef.current);
      }
    };
  }, [opened, item, resetCardDeck]);

  // When shuffle ends, defer full card mount slightly for smooth transition
  useEffect(() => {
    if (cardReadyTimeoutRef.current) {
      clearTimeout(cardReadyTimeoutRef.current);
    }

    if (isShuffling) {
      setIsCardReady(false);
    } else {
      // Small delay after shuffle settles before mounting heavy content
      cardReadyTimeoutRef.current = setTimeout(() => {
        setIsCardReady(true);
      }, 50);
    }

    return () => {
      if (cardReadyTimeoutRef.current) {
        clearTimeout(cardReadyTimeoutRef.current);
      }
    };
  }, [isShuffling]);

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

  useEffect(() => {
    if (eventTypePulseTimeoutRef.current) {
      clearTimeout(eventTypePulseTimeoutRef.current);
      eventTypePulseTimeoutRef.current = null;
    }
    setEventTypePulse(false);

    if (item) {
      const matchingClass = classes.find(
        (c) => c.name.toLowerCase() === item.course_name?.toLowerCase(),
      );
      const detectedType = detectEventTypeFromTitle(item.title);
      const { date } = parseDueDate(item.due_date);

      const nextFormData = {
        dueDate: date,
        classId: matchingClass ? String(matchingClass.id) : null,
        eventType: detectedType || "assignment",
        notes: "",
        url: item.url || "",
        canvas_due_date_override: 0,
      };
      setFormData(nextFormData);
      initialFormDataRef.current = nextFormData;
      setHasUserEdited(false);
      setExitDirection(null);
      setShowDescriptionFullscreen(false);

      if (detectedType && detectedType !== "assignment") {
        const rafId = requestAnimationFrame(() => {
          setEventTypePulse(true);
        });
        eventTypePulseTimeoutRef.current = setTimeout(() => {
          setEventTypePulse(false);
        }, 1200);
        return () => {
          cancelAnimationFrame(rafId);
          if (eventTypePulseTimeoutRef.current) {
            clearTimeout(eventTypePulseTimeoutRef.current);
            eventTypePulseTimeoutRef.current = null;
          }
        };
      }
    }
  }, [item, classes]);

  const isDirty = useMemo(() => {
    const initial = initialFormDataRef.current;
    if (!initial) return false;
    const sameDueDate =
      initial.dueDate === formData.dueDate ||
      (initial.dueDate &&
        formData.dueDate &&
        initial.dueDate.getTime() === formData.dueDate.getTime());
    return (
      formData.classId !== initial.classId ||
      formData.eventType !== initial.eventType ||
      formData.notes !== initial.notes ||
      formData.url !== initial.url ||
      formData.canvas_due_date_override !== initial.canvas_due_date_override ||
      !sameDueDate
    );
  }, [formData]);

  // Keep isDirtyRef in sync for the card deck hook
  isDirtyRef.current = isDirty;

  const shouldBlockClose = hasUserEdited && isDirty;

  const triggerDirtyShake = () => {
    setShakeCount((prev) => prev + 1);
  };

  const triggerClose = () => {
    resetCardDeck(); // Cancel any in-progress shuffle before closing
    setIsClosing(true);
    closingTimeoutRef.current = setTimeout(() => {
      onClose();
    }, 200); // Match card exit animation duration
  };

  const handleAttemptClose = () => {
    if (shouldBlockClose) {
      triggerDirtyShake();
      return;
    }
    triggerClose();
  };

  const handleDiscard = () => {
    triggerClose();
  };

  const markUserEdited = () => {
    setHasUserEdited(true);
  };

  const handleApproveClick = () => {
    setExitDirection("right");
    setTimeout(() => {
      const dueDate = formData.dueDate
        ? toUTCString(formData.dueDate)
        : item.due_date;

      onApprove(item, {
        ...formData,
        dueDate,
      });
    }, 50);
  };

  const handleRejectClick = () => {
    setExitDirection("left");
    setTimeout(() => {
      onReject(item);
    }, 50);
  };

  const handleNavigate = (direction) => {
    if (shouldBlockClose) {
      triggerDirtyShake();
      return;
    }
    setExitDirection(direction > 0 ? "right" : "left");
    setTimeout(() => {
      onNavigate(direction);
    }, 50);
  };

  const handleCardClick = (targetItemIndex) => {
    if (targetItemIndex === currentIndex) return;
    if (isShuffling) return; // Prevent interrupting mid-shuffle
    // The shuffleTo function handles blocking check internally
    shuffleTo(targetItemIndex);
  };

  const handleOpenMentionEvent = (eventItem) => {
    if (shouldBlockClose) {
      triggerDirtyShake();
      return;
    }
    onOpenEvent?.(eventItem);
  };

  // Cleanup card deck on unmount
  useEffect(() => {
    return () => cleanupCardDeck();
  }, [cleanupCardDeck]);

  // Lock body scroll when open
  useEffect(() => {
    if (opened) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
  }, [opened]);

  const content = (
    <>
      <DescriptionOverlay
        opened={showDescriptionFullscreen}
        onClose={() => setShowDescriptionFullscreen(false)}
        title={item?.title}
        descriptionHtml={item?.description}
        layoutId={item ? `description-${item.canvas_id}` : undefined}
      />

      <style>{`
        @keyframes eventTypePulse {
          0% {
            box-shadow: 0 0 0 0 rgba(34, 139, 230, 0.45);
            border-color: var(--mantine-color-blue-6);
          }
          70% {
            box-shadow: 0 0 0 8px rgba(34, 139, 230, 0);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(34, 139, 230, 0);
          }
        }

        .event-type-pulse {
          animation: eventTypePulse 1.1s ease-out 1;
        }
      `}</style>

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

                    // Calculate target position (changes during shuffle)
                    const targetPosition = getTargetPosition(itemIndex);
                    const isActive = targetPosition === 0;
                    const cardTransform = getCardTransform(targetPosition);

                    // Calculate arc motion during shuffle
                    const { y: arcY, rotateExtra } = getShuffleMotion(
                      itemIndex,
                      shuffleState,
                    );

                    // Initial position for cards entering the visible set
                    const enterFrom = getEnterPosition(position);

                    // Only use exit animation when card is leaving the visible set entirely
                    const isExiting = exitDirection && isActive;
                    const exitAnimation = isExiting
                      ? {
                          y: 100,
                          x: exitDirection === "right" ? 400 : -400,
                          opacity: 0,
                          rotate: exitDirection === "right" ? 15 : -15,
                          scale: 0.9,
                          transition: {
                            duration: 0.28,
                            ease: [0.4, 0, 0.2, 1],
                          },
                        }
                      : {
                          ...enterFrom, // Exit to where it would enter from
                          transition: { duration: 0.2 },
                        };

                    // Spring transition with stagger
                    const springTransition = getShuffleTransition(
                      itemIndex,
                      position,
                    );

                    // Peek state: lift in place when edge-hovering background cards
                    const isPeeking = peekingCard === itemIndex;
                    const peekY = isPeeking ? 20 : 0;
                    const peekScale = isPeeking
                      ? cardTransform.scale + 0.03
                      : cardTransform.scale;
                    const peekOpacity = isPeeking
                      ? Math.min(1, cardTransform.opacity + 0.3)
                      : cardTransform.opacity;
                    const peekZIndex = isPeeking ? 100 : cardTransform.zIndex;

                    return (
                      <motion.div
                        key={cardItem.canvas_id}
                        layout
                        style={{
                          position: "absolute",
                          width: "100%",
                          maxWidth: "500px",
                          bottom: 0,
                          // GPU acceleration hint during shuffle or peek
                          willChange:
                            isShuffling || isPeeking ? "transform" : "auto",
                        }}
                        initial={enterFrom}
                        animate={
                          isClosing
                            ? {
                                y: 150,
                                opacity: 0,
                                scale: 0.95,
                                transition: { duration: 0.2, ease: "easeIn" },
                              }
                            : {
                                y: arcY + peekY,
                                x: cardTransform.x,
                                scale: peekScale,
                                rotate: cardTransform.rotate + rotateExtra,
                                opacity: peekOpacity,
                                zIndex: peekZIndex,
                              }
                        }
                        exit={exitAnimation}
                        transition={
                          isClosing
                            ? { duration: 0.2, ease: "easeIn" }
                            : isPeeking || peekingCard === null
                              ? { duration: 0.15, ease: "easeOut" }
                              : springTransition
                        }
                      >
                        <CardWrapper
                          item={cardItem}
                          classes={classes}
                          events={events}
                          unassignedColor={unassignedColor}
                          isActive={isActive}
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
                          onPeekStart={() =>
                            !isShuffling && setPeekingCard(itemIndex)
                          }
                          onPeekEnd={() =>
                            setPeekingCard((prev) =>
                              prev === itemIndex ? null : prev,
                            )
                          }
                          onHeightChange={
                            isActive ? setActiveCardHeight : undefined
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
