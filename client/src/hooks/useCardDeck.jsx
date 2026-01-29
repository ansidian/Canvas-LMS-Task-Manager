import { useState, useCallback, useRef, useMemo } from "react";

/**
 * Physics-based card deck hook for managing shuffle animations.
 *
 * Implements a rotation/cycle model where clicking a background card
 * brings it to front while other cards cascade to fill the gap.
 */

// Spring physics config
export const CARD_SPRING = {
  stiffness: 220, // Higher for faster settle
  damping: 26, // 26: subtle overshoot without wobble
  mass: 0.9,
};

export const CARD_SPRING_SETTLE = {
  stiffness: 200,
  damping: 28,
  mass: 0.85,
};

// Stagger delay between each card's animation start
export const STAGGER_DELAY = 0.025;

// Duration to wait before reporting navigation complete
export const SHUFFLE_DURATION = 320;

/**
 * Calculate visual properties for a card at a given deck position.
 * Position 0 = front/active, positive = to the right, negative = to the left
 */
export function getCardTransform(position) {
  const absPos = Math.abs(position);

  // Base transforms per position
  const xOffset = 90; // px per position
  const scaleStep = 0.05; // scale reduction per position
  const rotateStep = 3; // degrees per position
  const opacityStep = 0.2; // opacity reduction per position

  return {
    x: position * xOffset,
    scale: Math.max(0.82, 1 - absPos * scaleStep),
    rotate: position * rotateStep,
    opacity: absPos === 0 ? 1 : Math.max(0.35, 1 - absPos * opacityStep),
    zIndex: 50 - absPos,
  };
}

/**
 * Calculate arc Y offset and rotation boost during shuffle.
 * During 'moving' phase: cards have arc offsets
 * During 'settling' phase: arc returns to 0 via spring
 *
 * Reduced travel distances for snappier feel while maintaining the lift arc.
 */
export function getShuffleMotion(itemIndex, shuffleState) {
  if (!shuffleState) {
    return { y: 0, rotateExtra: 0 };
  }

  // During settling phase, return to neutral (spring will animate there)
  if (shuffleState.phase === "settling") {
    return { y: 0, rotateExtra: 0 };
  }

  const { fromIndex, toIndex, direction, distance } = shuffleState;

  // Card coming to front - lifts up
  if (itemIndex === toIndex) {
    const lift = Math.min(-28, -16 * distance);
    const rotateBoost = -direction * 5;
    return { y: lift, rotateExtra: rotateBoost };
  }

  // Card leaving front - pushes back
  if (itemIndex === fromIndex) {
    const push = Math.min(12, 7 * distance);
    const rotateBoost = direction * 3;
    return { y: push, rotateExtra: rotateBoost };
  }

  // Cards in between get subtle lift
  const isInPath =
    (direction > 0 && itemIndex > fromIndex && itemIndex < toIndex) ||
    (direction < 0 && itemIndex < fromIndex && itemIndex > toIndex);

  if (isInPath) {
    return { y: -8, rotateExtra: -direction * 1.5 };
  }

  return { y: 0, rotateExtra: 0 };
}

/**
 * Calculate initial position for a card entering the visible set.
 * Cards slide in from beyond the edge.
 */
export function getEnterPosition(position, direction) {
  // Card entering from the right (position > 2)
  if (position > 0) {
    return {
      x: 300, // Off to the right
      scale: 0.75,
      opacity: 0,
      rotate: 8,
    };
  }
  // Card entering from the left (position < -2)
  return {
    x: -300,
    scale: 0.75,
    opacity: 0,
    rotate: -8,
  };
}

/**
 * Hook for managing a physics-based card deck with shuffle animations.
 */
export default function useCardDeck({
  totalCards,
  currentIndex,
  onNavigate,
  shouldBlockNavigation,
  onBlockedAttempt,
}) {
  // Track if we're mid-shuffle to prevent interruption
  const [isShuffling, setIsShuffling] = useState(false);
  const shuffleTimeoutRef = useRef(null);

  // Track the shuffle animation state
  // phase: 'moving' (cards relocating) -> 'settling' (arc returning to 0) -> null
  const [shuffleState, setShuffleState] = useState(null);
  // { fromIndex, toIndex, direction, distance, phase }

  /**
   * Get which cards should be visible in the deck.
   * Returns array of { itemIndex, position } where position is relative to active.
   * Position 0 = active, -1/-2 = left, +1/+2 = right
   * Wraps around for a continuous loop effect.
   */
  const visibleCards = useMemo(() => {
    if (totalCards === 0) return [];

    const cards = [];

    // Always show the active card at position 0
    cards.push({
      itemIndex: currentIndex,
      position: 0,
    });

    // If only 1 card, we're done
    if (totalCards === 1) return cards;

    // For 2+ cards, show neighbors symmetrically up to 2 on each side
    const maxNeighbors = Math.min(2, Math.floor((totalCards - 1) / 2));

    for (let i = 1; i <= maxNeighbors; i++) {
      // Right side (positive positions)
      const rightIndex = (currentIndex + i) % totalCards;
      cards.push({
        itemIndex: rightIndex,
        position: i,
      });

      // Left side (negative positions)
      const leftIndex = (currentIndex - i + totalCards) % totalCards;
      cards.push({
        itemIndex: leftIndex,
        position: -i,
      });
    }

    // Handle odd count when we have space for one more card
    // e.g., 3 cards total: show active + 1 left + 1 right (all 3)
    const remainingCards = totalCards - cards.length;
    if (remainingCards > 0 && maxNeighbors < 2) {
      const nextPos = maxNeighbors + 1;
      const nextIndex = (currentIndex + nextPos) % totalCards;

      // Only add if not already in the deck (prevents duplicates)
      if (!cards.some(c => c.itemIndex === nextIndex)) {
        cards.push({
          itemIndex: nextIndex,
          position: nextPos,
        });
      }
    }

    return cards;
  }, [currentIndex, totalCards]);

  /**
   * Initiate a shuffle to bring a card to front.
   * @param targetItemIndex - The index in items array to bring to front
   */
  const shuffleTo = useCallback(
    (targetItemIndex) => {
      if (isShuffling) return;
      if (targetItemIndex === currentIndex) return;

      if (shouldBlockNavigation?.()) {
        onBlockedAttempt?.();
        return;
      }

      // Calculate shortest path with wrapping
      let forwardDist = targetItemIndex - currentIndex;
      if (forwardDist < 0) forwardDist += totalCards;

      let backwardDist = currentIndex - targetItemIndex;
      if (backwardDist < 0) backwardDist += totalCards;

      // Go the shorter way, prefer forward on tie
      const goForward = forwardDist <= backwardDist;
      const distance = goForward ? forwardDist : backwardDist;
      const direction = goForward ? 1 : -1;

      // Start the shuffle animation
      setIsShuffling(true);
      setShuffleState({
        fromIndex: currentIndex,
        toIndex: targetItemIndex,
        direction,
        distance,
        phase: "moving",
      });

      if (shuffleTimeoutRef.current) {
        clearTimeout(shuffleTimeoutRef.current);
      }

      // Calculate the navigation delta (respecting wrap direction)
      const navDelta = direction * distance;

      // Settling phase: arc returns to 0
      const settleDelay = SHUFFLE_DURATION - 100;
      shuffleTimeoutRef.current = setTimeout(() => {
        setShuffleState((prev) =>
          prev ? { ...prev, phase: "settling" } : null,
        );

        // 'Completion' "phase": update index and clear state
        shuffleTimeoutRef.current = setTimeout(() => {
          onNavigate(navDelta);
          setIsShuffling(false);
          setShuffleState(null);
        }, 120);
      }, settleDelay);
    },
    [
      isShuffling,
      currentIndex,
      totalCards,
      onNavigate,
      shouldBlockNavigation,
      onBlockedAttempt,
    ],
  );

  /**
   * Get animation config for a specific card during shuffle.
   * Returns the spring transition config with appropriate delay and physics.
   */
  const getShuffleTransition = useCallback(
    (itemIndex, position) => {
      if (!shuffleState) {
        return {
          type: "spring",
          ...CARD_SPRING,
        };
      }

      const { fromIndex, toIndex, direction } = shuffleState;
      const isTargetCard = itemIndex === toIndex;
      const isLeavingFront = itemIndex === fromIndex;

      // Stagger timing: target card leads, others follow based on distance from action
      let delay = 0;
      if (isTargetCard) {
        delay = 0; // Target moves first
      } else if (isLeavingFront) {
        delay = STAGGER_DELAY; // Active card moves second
      } else {
        // Other cards stagger based on their position
        const distanceFromTarget = Math.abs(itemIndex - toIndex);
        delay = STAGGER_DELAY * (1 + distanceFromTarget);
      }

      // Use slightly different spring for settling cards vs the main actors
      const spring =
        isTargetCard || isLeavingFront ? CARD_SPRING : CARD_SPRING_SETTLE;

      return {
        type: "spring",
        ...spring,
        delay,
      };
    },
    [shuffleState],
  );

  /**
   * Calculate the target position for a card during/after shuffle.
   * Returns position in range [-2, 2] accounting for wrap-around.
   */
  const getTargetPosition = useCallback(
    (itemIndex) => {
      const referenceIndex = shuffleState ? shuffleState.toIndex : currentIndex;

      // Calculate raw difference
      let diff = itemIndex - referenceIndex;

      // Wrap to find shortest path position
      if (totalCards > 0) {
        // If diff is more than half the deck, wrap around
        if (diff > totalCards / 2) {
          diff -= totalCards;
        } else if (diff < -totalCards / 2) {
          diff += totalCards;
        }
      }

      return diff;
    },
    [currentIndex, totalCards, shuffleState],
  );

  /**
   * Reset all shuffle state. Call when modal opens or item changes externally.
   * Clears any in-progress shuffle animations to prevent stale state.
   */
  const reset = useCallback(() => {
    if (shuffleTimeoutRef.current) {
      clearTimeout(shuffleTimeoutRef.current);
      shuffleTimeoutRef.current = null;
    }
    setIsShuffling(false);
    setShuffleState(null);
  }, []);

  // Cleanup on unmount
  const cleanup = useCallback(() => {
    if (shuffleTimeoutRef.current) {
      clearTimeout(shuffleTimeoutRef.current);
    }
  }, []);

  return {
    visibleCards,
    isShuffling,
    shuffleState,
    shuffleTo,
    getShuffleTransition,
    getTargetPosition,
    reset,
    cleanup,
  };
}
