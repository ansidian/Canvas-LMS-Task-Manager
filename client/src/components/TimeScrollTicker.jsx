import { useMemo, useRef, useEffect } from "react";
import { motion, useSpring, useTransform } from "framer-motion";

// Generate all 96 time slots (15-min increments)
const TIME_SLOTS = Array.from({ length: 96 }, (_, i) => {
  const hours = Math.floor(i / 4);
  const minutes = (i % 4) * 15;
  const hh = String(hours).padStart(2, "0");
  const mm = String(minutes).padStart(2, "0");
  const time24 = `${hh}:${mm}`;
  const period = hours >= 12 ? "PM" : "AM";
  const hours12 = hours % 12 || 12;
  const display = `${hours12}:${mm} ${period}`;
  return { time24, display, index: i };
});

const SLOT_HEIGHT = 22; // px per slot row
const VISIBLE_SLOTS = 7;
const HALF = Math.floor(VISIBLE_SLOTS / 2);

function timeToIndex(time24) {
  if (!time24) return 36; // default to 9:00 AM
  const [h, m] = time24.split(":").map(Number);
  return Math.round((h * 60 + m) / 15);
}

function SlotRow({ slot, isCurrent, isOriginal, distance }) {
  // Smooth opacity falloff — close slots are legible, far ones dissolve
  const farOpacity = Math.max(0.08, 0.55 - distance * 0.12);

  return (
    <div
      style={{
        height: SLOT_HEIGHT,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: "100%",
        fontSize: isCurrent ? 15 : 12,
        fontWeight: isCurrent ? 600 : 400,
        color: isCurrent
          ? "var(--ink)"
          : `rgba(255, 255, 255, ${farOpacity})`,
        position: "relative",
        fontVariantNumeric: "tabular-nums",
        letterSpacing: isCurrent ? "0.04em" : "0.02em",
        transition: "font-size 0.15s ease, font-weight 0.15s ease",
      }}
    >
      {isCurrent && (
        <div
          style={{
            position: "absolute",
            inset: "1px 10px",
            background: "var(--ink-blue-light)",
            borderRadius: 5,
            border: "1px solid rgba(91, 141, 217, 0.35)",
            boxShadow:
              "inset 0 1px 2px rgba(0, 0, 0, 0.15), 0 0 8px rgba(91, 141, 217, 0.12)",
          }}
        />
      )}
      <span style={{ position: "relative", zIndex: 1 }}>
        {slot.display}
      </span>
      {isOriginal && !isCurrent && (
        <span
          style={{
            position: "absolute",
            right: 10,
            top: "50%",
            transform: "translateY(-50%)",
            fontSize: 7,
            fontWeight: 500,
            color: "var(--pencil)",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            opacity: 0.7,
          }}
        >
          now
        </span>
      )}
    </div>
  );
}

export default function TimeScrollTicker({ selectedTime, originalTime }) {
  const selectedIndex = useMemo(() => timeToIndex(selectedTime), [selectedTime]);
  const originalIndex = useMemo(() => timeToIndex(originalTime), [originalTime]);

  // Spring-animated Y offset for smooth scrolling
  const targetY = -selectedIndex * SLOT_HEIGHT;
  const springY = useSpring(targetY, { stiffness: 300, damping: 28 });

  // Update spring target when selection changes
  useEffect(() => {
    springY.set(targetY);
  }, [targetY, springY]);

  // Visible window height
  const windowHeight = VISIBLE_SLOTS * SLOT_HEIGHT;
  // Center offset so the selected slot sits in the middle
  const centerOffset = HALF * SLOT_HEIGHT;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.92 }}
      transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 20,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(23, 26, 31, 0.82)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        borderRadius: "inherit",
        overflow: "hidden",
        userSelect: "none",
        pointerEvents: "none",
      }}
    >
      {/* Scrolling drum viewport */}
      <div
        style={{
          height: windowHeight,
          width: "100%",
          overflow: "hidden",
          position: "relative",
        }}
      >
        {/* Top fade mask */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: SLOT_HEIGHT * 2,
            background:
              "linear-gradient(to bottom, rgba(23, 26, 31, 0.9), transparent)",
            zIndex: 2,
            pointerEvents: "none",
          }}
        />
        {/* Bottom fade mask */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: SLOT_HEIGHT * 2,
            background:
              "linear-gradient(to top, rgba(23, 26, 31, 0.9), transparent)",
            zIndex: 2,
            pointerEvents: "none",
          }}
        />

        <motion.div
          style={{
            y: useTransform(springY, (v) => v + centerOffset),
            position: "absolute",
            width: "100%",
            left: 0,
          }}
        >
          {TIME_SLOTS.map((slot) => {
            const distance = Math.abs(slot.index - selectedIndex);
            return (
              <SlotRow
                key={slot.index}
                slot={slot}
                isCurrent={slot.index === selectedIndex}
                isOriginal={slot.index === originalIndex}
                distance={distance}
              />
            );
          })}
        </motion.div>
      </div>

      {/* Drag hint */}
      <div
        style={{
          position: "absolute",
          bottom: 5,
          fontSize: 8,
          fontWeight: 500,
          color: "var(--pencil)",
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          opacity: 0.6,
        }}
      >
        scroll · drag
      </div>
    </motion.div>
  );
}
