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
  return (
    <div
      style={{
        height: SLOT_HEIGHT,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: "100%",
        fontSize: isCurrent ? 16 : 12,
        fontWeight: isCurrent ? 700 : 400,
        color: isCurrent
          ? "#fff"
          : `rgba(255, 255, 255, ${Math.max(0.15, 0.5 - distance * 0.1)})`,
        position: "relative",
        fontVariantNumeric: "tabular-nums",
        letterSpacing: "0.02em",
      }}
    >
      {isCurrent && (
        <div
          style={{
            position: "absolute",
            inset: "0 8px",
            background:
              "linear-gradient(135deg, rgba(34, 139, 230, 0.35), rgba(34, 139, 230, 0.15))",
            borderRadius: 6,
            border: "1px solid rgba(34, 139, 230, 0.5)",
            boxShadow: "0 0 12px rgba(34, 139, 230, 0.2)",
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
            right: 8,
            top: "50%",
            transform: "translateY(-50%)",
            fontSize: 8,
            color: "rgba(255,255,255,0.3)",
            letterSpacing: "0.05em",
            textTransform: "uppercase",
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
        background: "rgba(0, 0, 0, 0.75)",
        backdropFilter: "blur(8px)",
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
          bottom: 4,
          fontSize: 9,
          color: "rgba(255, 255, 255, 0.3)",
          letterSpacing: "0.05em",
          textTransform: "uppercase",
        }}
      >
        scroll or drag
      </div>
    </motion.div>
  );
}
