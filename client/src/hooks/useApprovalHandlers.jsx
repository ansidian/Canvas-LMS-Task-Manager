import { useCallback, useRef } from "react";
import { toUTCString } from "../utils/datetime";

/**
 * Hook that consolidates all approval modal handlers.
 *
 * Encapsulates:
 * - Close/discard logic with dirty state protection
 * - Approve/reject actions with exit animations
 * - Navigation with dirty state checks
 * - Card click handling for deck shuffle
 * - Mention event opening
 */
export default function useApprovalHandlers({
  // Dirty state
  hasUserEdited,
  isDirty,
  setShakeCount,
  setHasUserEdited,

  // Close/exit state
  setIsClosing,
  resetCardDeck,
  onClose,

  // Exit animation
  setExitDirection,

  // Form data
  formData,
  item,

  // Action callbacks
  onApprove,
  onReject,
  onNavigate,
  onOpenEvent,

  // Card deck
  currentIndex,
  isShuffling,
  shuffleTo,
}) {
  const closingTimeoutRef = useRef(null);

  const shouldBlockClose = hasUserEdited && isDirty;

  const triggerDirtyShake = useCallback(() => {
    setShakeCount((prev) => prev + 1);
  }, [setShakeCount]);

  const triggerClose = useCallback(() => {
    resetCardDeck();
    setIsClosing(true);
    closingTimeoutRef.current = setTimeout(() => {
      onClose();
    }, 200);
  }, [resetCardDeck, setIsClosing, onClose]);

  const handleAttemptClose = useCallback(() => {
    if (shouldBlockClose) {
      triggerDirtyShake();
      return;
    }
    triggerClose();
  }, [shouldBlockClose, triggerDirtyShake, triggerClose]);

  const handleDiscard = useCallback(() => {
    triggerClose();
  }, [triggerClose]);

  const markUserEdited = useCallback(() => {
    setHasUserEdited(true);
  }, [setHasUserEdited]);

  const handleApproveClick = useCallback(() => {
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
  }, [setExitDirection, formData, item, onApprove]);

  const handleRejectClick = useCallback(() => {
    setExitDirection("left");
    setTimeout(() => {
      onReject(item);
    }, 50);
  }, [setExitDirection, item, onReject]);

  const handleNavigate = useCallback(
    (direction) => {
      if (shouldBlockClose) {
        triggerDirtyShake();
        return;
      }
      setExitDirection(direction > 0 ? "right" : "left");
      setTimeout(() => {
        onNavigate(direction);
      }, 50);
    },
    [shouldBlockClose, triggerDirtyShake, setExitDirection, onNavigate],
  );

  const handleCardClick = useCallback(
    (targetItemIndex) => {
      if (targetItemIndex === currentIndex) return;
      if (isShuffling) return;
      shuffleTo(targetItemIndex);
    },
    [currentIndex, isShuffling, shuffleTo],
  );

  const handleOpenMentionEvent = useCallback(
    (eventItem) => {
      if (shouldBlockClose) {
        triggerDirtyShake();
        return;
      }
      onOpenEvent?.(eventItem);
    },
    [shouldBlockClose, triggerDirtyShake, onOpenEvent],
  );

  // Cancel any pending close timeout (used when switching items)
  const cancelClosing = useCallback(() => {
    if (closingTimeoutRef.current) {
      clearTimeout(closingTimeoutRef.current);
      closingTimeoutRef.current = null;
    }
  }, []);

  return {
    handleAttemptClose,
    handleDiscard,
    markUserEdited,
    handleApproveClick,
    handleRejectClick,
    handleNavigate,
    handleCardClick,
    handleOpenMentionEvent,
    cancelClosing,
  };
}
