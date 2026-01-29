import { useEffect, useRef, useState, useCallback } from "react";

/**
 * Hook that manages modal lifecycle state and effects.
 *
 * Consolidates:
 * - Item change detection and state reset
 * - Card ready deferral after shuffle
 * - Body scroll locking
 * - Peek state management
 */
export default function useModalLifecycle({
  opened,
  item,
  isShuffling,
  resetCardDeck,
  cancelClosing,
  setIsClosing,
}) {
  // Track which card is being peeked via edge hover
  const [peekingCard, setPeekingCard] = useState(null);

  // Deferred mount: active card shows preview during shuffle, then mounts full content
  const [isCardReady, setIsCardReady] = useState(true);
  const cardReadyTimeoutRef = useRef(null);

  // Track which item we're showing to detect external navigation
  const activeItemIdRef = useRef(null);

  // Reset state when modal opens or switches to a different item
  useEffect(() => {
    if (opened && item) {
      const itemId = item.canvas_id;
      const isNewItem = activeItemIdRef.current !== itemId;
      activeItemIdRef.current = itemId;

      if (isNewItem) {
        // Switching to a new item - cancel any in-progress close and reset state
        setIsClosing(false);
        cancelClosing();
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

    return () => cancelClosing();
  }, [opened, item, resetCardDeck, cancelClosing, setIsClosing]);

  // Defer full card mount after shuffle settles
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

  // Lock body scroll when modal is open
  useEffect(() => {
    if (opened) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
  }, [opened]);

  // Handler to start peeking a card (for edge hover)
  const startPeek = useCallback(
    (itemIndex) => {
      if (!isShuffling) {
        setPeekingCard(itemIndex);
      }
    },
    [isShuffling],
  );

  // Handler to end peeking a card
  const endPeek = useCallback((itemIndex) => {
    setPeekingCard((prev) => (prev === itemIndex ? null : prev));
  }, []);

  return {
    isCardReady,
    peekingCard,
    startPeek,
    endPeek,
  };
}
