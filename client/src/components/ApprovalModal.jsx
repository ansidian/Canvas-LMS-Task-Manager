import { useEffect, useRef, useMemo } from "react";
import { Stack, Paper } from "@mantine/core";
import { motion, AnimatePresence, useAnimation } from "framer-motion";
import dayjs from "dayjs";
import { parseDueDate, toUTCString } from "../utils/datetime";
import useApprovalModalState from "../hooks/useApprovalModalState";
import {
  ApprovalActionButtons,
  ApprovalCardHeader,
  ApprovalClassSelect,
  ApprovalDescriptionPreview,
  ApprovalDueDateField,
  ApprovalEventTypeSelect,
  ApprovalNotesField,
  ApprovalPointsBadge,
  ApprovalUrlField,
} from "./approval/ApprovalCardParts";
import {
  ApprovalDescriptionFullscreen,
  ApprovalNavigationControls,
  ApprovalPositionBadge,
} from "./approval/ApprovalModalShell";

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

function Card({
  item,
  config,
  handlers,
  formData,
  setFormData,
  exitDirection,
  showDescriptionFullscreen,
  setShowDescriptionFullscreen,
  eventTypePulse,
  shakeSignal,
}) {
  const isCanvasLinked = Boolean(item?.canvas_id);
  const isSyncLocked = isCanvasLinked && !formData.canvas_due_date_override;
  const shakeControls = useAnimation();
  const prevShakeSignalRef = useRef(shakeSignal);

  useEffect(() => {
    // shake when shakeSignal increases (not on initial mount)
    if (shakeSignal > 0 && shakeSignal !== prevShakeSignalRef.current) {
      shakeControls.start({
        x: [0, -8, 8, -6, 6, 0],
        transition: { duration: 0.35 },
      });
    }
    prevShakeSignalRef.current = shakeSignal;
  }, [shakeSignal, shakeControls]);

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
    <motion.div
      style={{
        position: "absolute",
        width: "100%",
        maxWidth: "500px",
      }}
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{
        x:
          exitDirection === "right" ? 500 : exitDirection === "left" ? -500 : 0,
        opacity: 0,
        rotate:
          exitDirection === "right" ? 25 : exitDirection === "left" ? -25 : 0,
        transition: { duration: 0.2 },
      }}
      transition={{ type: "spring", stiffness: 250, damping: 30 }}
    >
      <motion.div animate={shakeControls}>
        <Paper
          shadow="xl"
          p="xl"
          radius="md"
          style={{
            backgroundColor: "var(--mantine-color-body)",
            border: "1px solid var(--mantine-color-default-border)",
            position: "relative",
          }}
        >
          <Stack gap="md">
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
              classes={config.classes}
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

            <ApprovalDescriptionPreview
              item={item}
              showDescriptionFullscreen={showDescriptionFullscreen}
              setShowDescriptionFullscreen={setShowDescriptionFullscreen}
            />

            <ApprovalNotesField
              formData={formData}
              setFormData={setFormData}
              onUserEdit={handlers.onUserEdit}
              events={config.events}
              classes={config.classes}
              unassignedColor={config.unassignedColor}
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
    </motion.div>
  );
}

export default function ApprovalModal({
  opened,
  onClose,
  item,
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

  useEffect(() => {
    if (eventTypePulseTimeoutRef.current) {
      clearTimeout(eventTypePulseTimeoutRef.current);
      eventTypePulseTimeoutRef.current = null;
    }
    setEventTypePulse(false);

    if (item) {
      // Auto-select class if course name matches
      const matchingClass = classes.find(
        (c) => c.name.toLowerCase() === item.course_name?.toLowerCase(),
      );
      const detectedType = detectEventTypeFromTitle(item.title);

      // Parse the due_date (handles both date-only and datetime)
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

  // Handle Enter key to approve/submit
  useEffect(() => {
    if (!opened) return;

    const handleKeyDown = (e) => {
      if (e.key !== "Enter") return;

      // Don't submit if typing in an input, textarea, or if DateTimePicker is open
      const target = e.target;
      const isInInput =
        target.tagName === "INPUT" || target.tagName === "TEXTAREA";

      if (isInInput) return;

      e.preventDefault();
      handleApproveClick();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [opened, formData, item]);

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
  const shouldBlockClose = hasUserEdited && isDirty;

  const triggerDirtyShake = () => {
    setShakeCount((prev) => prev + 1);
  };

  const handleAttemptClose = () => {
    if (shouldBlockClose) {
      triggerDirtyShake();
      return;
    }
    onClose();
  };

  const handleDiscard = () => {
    onClose();
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
  const handleOpenMentionEvent = (eventItem) => {
    if (shouldBlockClose) {
      triggerDirtyShake();
      return;
    }
    onOpenEvent?.(eventItem);
  };

  const canGoPrev = currentIndex > 0;
  const canGoNext = currentIndex < pendingCount - 1;

  if (!opened) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.75)",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        zIndex: 200,
        padding: "8dvh 8vw",
        overflowY: "auto",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) handleAttemptClose();
      }}
    >
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
      {/* Position badge */}
      <ApprovalPositionBadge config={{ currentIndex, pendingCount }} />

      <ApprovalDescriptionFullscreen
        config={{ item, showDescriptionFullscreen }}
        handlers={{
          onClose: () => setShowDescriptionFullscreen(false),
        }}
      />

      {/* Card container */}
      <div
        style={{
          position: "relative",
          width: "100%",
          maxWidth: "600px",
          height: "600px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {/* Navigation buttons - positioned relative to card */}
        <ApprovalNavigationControls
          config={{ canGoPrev, canGoNext }}
          handlers={{ onNavigate: handleNavigate }}
        />

        <AnimatePresence mode="wait">
          {item && (
            <Card
              key={item.canvas_id}
              item={item}
              config={{ classes, events, unassignedColor }}
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
              exitDirection={exitDirection}
              eventTypePulse={eventTypePulse}
              showDescriptionFullscreen={showDescriptionFullscreen}
              setShowDescriptionFullscreen={setShowDescriptionFullscreen}
              shakeSignal={shakeCount}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
