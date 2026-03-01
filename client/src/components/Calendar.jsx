import { useMemo, useState, useEffect, useRef, useLayoutEffect, useCallback } from "react";
import { SimpleGrid, Text, Stack, Box, Menu } from "@mantine/core";
import {
  IconPencil,
  IconTrash,
  IconCircleDot,
  IconProgress,
  IconCircleCheckFilled,
  IconPlus,
  IconChecklist,
} from "@tabler/icons-react";
import {
  DndContext,
  DragOverlay,
  useSensor,
  useSensors,
  PointerSensor,
  closestCenter,
} from "@dnd-kit/core";
import { motion, AnimatePresence } from "framer-motion";
import dayjs from "dayjs";
import CalendarDay from "./CalendarDay";
import EventCard from "./EventCard";
import { expandRecurrence } from "../utils/expand-recurrence";
import { hasTimeComponent, extractTime } from "../utils/datetime";

const PIXELS_PER_SLOT = 8; // mouse Y pixels per 15-min slot
const HOLD_DELAY_MS = 400;
const IS_COARSE_POINTER = typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const STATUS_MENU_ITEMS = [
  { value: "incomplete", label: "Incomplete", icon: IconCircleDot },
  { value: "in_progress", label: "In Progress", icon: IconProgress },
  { value: "complete", label: "Complete", icon: IconCircleCheckFilled },
];

// Convert slot index (0–95) to "HH:mm" string
function slotToTime(index) {
  const clamped = ((index % 96) + 96) % 96;
  const h = Math.floor(clamped / 4);
  const m = (clamped % 4) * 15;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

// Convert "HH:mm" to slot index
function timeToSlot(time24) {
  if (!time24) return 36; // 9:00 AM default
  const [h, m] = time24.split(":").map(Number);
  return Math.round((h * 60 + m) / 15);
}

export default function Calendar({
  currentDate,
  events,
  classes,
  onEventClick,
  onEventDrop,
  onEventTimeChange,
  onDayDoubleClick,
  onDayClick,
  onEventDelete,
  onEventStatusChange,
  onCreateTodoistTask,
  hasTodoistToken = false,
  unassignedColor = "#a78b71",
  ghostEvent = null,
}) {
  const [activeEvent, setActiveEvent] = useState(null);
  const [slideDirection, setSlideDirection] = useState("");
  const [prevDate, setPrevDate] = useState(currentDate);
  const [ghostAnimation, setGhostAnimation] = useState(null);
  const sourceRectRef = useRef(null);

  // Time-scroll state
  const [timeScrollState, setTimeScrollState] = useState(null);
  const timeScrollRef = useRef(null); // mirror of timeScrollState for hot-path reads
  const sourceDateKeyRef = useRef(null);
  const holdTimerRef = useRef(null);
  const dragMoveYRef = useRef(null);
  const wheelVelocityRef = useRef(0);   // slots per frame
  const wheelPositionRef = useRef(0);   // fractional slot accumulator
  const wheelRafRef = useRef(null);

  // Keep ref in sync with state
  timeScrollRef.current = timeScrollState;

  // Context menu state
  const [contextMenu, setContextMenu] = useState(null);
  const contextMenuAnchorRef = useRef(null);
  const lastContextEventRef = useRef(null);

  // Keep a stable reference to the last right-clicked event so menu content
  // doesn't flash during the close animation when contextMenu becomes null
  if (contextMenu?.event) {
    lastContextEventRef.current = contextMenu.event;
  }
  const contextEvent = contextMenu?.event ?? lastContextEventRef.current;

  const handleEventContextMenu = useCallback((event, mouseEvent) => {
    mouseEvent.preventDefault();
    if (activeEvent) return; // suppress during drag
    setContextMenu({ event, x: mouseEvent.clientX, y: mouseEvent.clientY });
  }, [activeEvent]);

  const handleContextMenuEdit = useCallback(() => {
    if (!contextMenu) return;
    onEventClick(contextMenu.event);
    setContextMenu(null);
  }, [contextMenu, onEventClick]);

  const handleContextMenuDelete = useCallback(() => {
    if (!contextMenu) return;
    onEventDelete(contextMenu.event.id);
    setContextMenu(null);
  }, [contextMenu, onEventDelete]);

  const handleContextMenuStatus = useCallback((status) => {
    if (!contextMenu) return;
    onEventStatusChange(contextMenu.event.id, status);
    setContextMenu(null);
  }, [contextMenu, onEventStatusChange]);

  // Day (empty space) context menu state
  const [dayContextMenu, setDayContextMenu] = useState(null);

  const handleDayContextMenu = useCallback((dateKey, mouseEvent, anchorRect) => {
    if (activeEvent) return;
    setDayContextMenu({ dateKey, x: mouseEvent.clientX, y: mouseEvent.clientY, anchorRect });
  }, [activeEvent]);

  const handleDayAddEvent = useCallback(() => {
    if (!dayContextMenu) return;
    onDayDoubleClick(dayContextMenu.dateKey, dayContextMenu.anchorRect);
    setDayContextMenu(null);
  }, [dayContextMenu, onDayDoubleClick]);

  const handleDayAddTodoistTask = useCallback(() => {
    if (!dayContextMenu) return;
    onCreateTodoistTask(dayContextMenu.dateKey, dayContextMenu.anchorRect);
    setDayContextMenu(null);
  }, [dayContextMenu, onCreateTodoistTask]);

  // Detect month change direction for slide animation
  useEffect(() => {
    if (!prevDate.isSame(currentDate, "month")) {
      if (currentDate.isAfter(prevDate, "month")) {
        setSlideDirection("calendar-slide-right");
      } else {
        setSlideDirection("calendar-slide-left");
      }
      setPrevDate(currentDate);

      // Clear animation class after animation completes
      const timer = setTimeout(() => setSlideDirection(""), 300);
      return () => clearTimeout(timer);
    }
  }, [currentDate, prevDate]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 10,
      },
    }),
  );

  const calendarDays = useMemo(() => {
    const startOfMonth = currentDate.startOf("month");
    const endOfMonth = currentDate.endOf("month");
    const startDay = startOfMonth.day();
    const daysInMonth = endOfMonth.date();

    const days = [];

    // Previous month's trailing days
    for (let i = 0; i < startDay; i++) {
      const date = startOfMonth.subtract(startDay - i, "day");
      days.push({ date, isCurrentMonth: false });
    }

    // Current month's days
    for (let i = 1; i <= daysInMonth; i++) {
      const date = startOfMonth.date(i);
      days.push({ date, isCurrentMonth: true });
    }

    // Next month's leading days to complete the grid
    const remaining = 42 - days.length; // 6 rows * 7 days
    for (let i = 1; i <= remaining; i++) {
      const date = endOfMonth.add(i, "day");
      days.push({ date, isCurrentMonth: false });
    }

    return days;
  }, [currentDate]);

  const eventsByDate = useMemo(() => {
    const map = {};
    events.forEach((event) => {
      const dateKey = dayjs(event.due_date).format("YYYY-MM-DD");
      if (!map[dateKey]) map[dateKey] = [];
      map[dateKey].push(event);
    });
    // Inject ghost event(s)
    if (ghostEvent?.recurrence && calendarDays.length) {
      // Recurring ghost: expand into all matching dates in the visible grid
      const rangeStart = calendarDays[0].date.format("YYYY-MM-DD");
      const rangeEnd = calendarDays[calendarDays.length - 1].date.format("YYYY-MM-DD");
      expandRecurrence(ghostEvent.recurrence, rangeStart, rangeEnd).forEach((dateStr) => {
        const dateKey = dateStr.slice(0, 10); // "YYYY-MM-DD" portion
        if (!map[dateKey]) map[dateKey] = [];
        map[dateKey].push({ ...ghostEvent, id: `__ghost__${dateKey}`, due_date: dateStr });
      });
    } else if (ghostEvent?.due_date) {
      const ghostKey = dayjs(ghostEvent.due_date).format("YYYY-MM-DD");
      if (!map[ghostKey]) map[ghostKey] = [];
      map[ghostKey].push(ghostEvent);
    }
    // Sort each day's events by time (earliest first, midnight/all-day at bottom)
    Object.values(map).forEach((dayEvents) => {
      dayEvents.sort((a, b) => {
        // Ghost always last
        if (a.isGhost) return 1;
        if (b.isGhost) return -1;
        const timeA = dayjs(a.due_date);
        const timeB = dayjs(b.due_date);
        const isMidnightA = timeA.hour() === 0 && timeA.minute() === 0;
        const isMidnightB = timeB.hour() === 0 && timeB.minute() === 0;

        // Push midnight (all-day) events to the bottom
        if (isMidnightA && !isMidnightB) return 1;
        if (!isMidnightA && isMidnightB) return -1;

        return timeA.valueOf() - timeB.valueOf();
      });
    });
    return map;
  }, [events, ghostEvent, calendarDays]);

  const handleDragStart = (event) => {
    const eventData = events.find((e) => e.id === event.active.id);
    setActiveEvent(eventData);
    setContextMenu(null);
    setDayContextMenu(null);

    // Track source dateKey for same-day detection
    if (eventData?.due_date) {
      sourceDateKeyRef.current = dayjs(eventData.due_date).format("YYYY-MM-DD");
    }

    // Capture source position for ghost animation
    const element = document.querySelector(
      `[data-event-id="${event.active.id}"]`,
    );
    if (element) {
      sourceRectRef.current = element.getBoundingClientRect();
    }
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    clearTimeout(holdTimerRef.current);

    // If in time-scroll mode, commit the selected time
    if (timeScrollState?.active && onEventTimeChange) {
      onEventTimeChange(active.id, timeScrollState.dateKey, timeScrollState.selectedTime);
      setTimeScrollState(null);
      sourceDateKeyRef.current = null;
      dragMoveYRef.current = null;
      setActiveEvent(null);
      sourceRectRef.current = null;
      return;
    }

    if (over && active.id !== over.id && sourceRectRef.current) {
      const eventData = events.find((e) => e.id === active.id);
      const newDate = over.id;

      // Skip if dropped on the same day (no-op)
      if (newDate === sourceDateKeyRef.current) {
        setTimeScrollState(null);
        setActiveEvent(null);
        sourceRectRef.current = null;
        sourceDateKeyRef.current = null;
        dragMoveYRef.current = null;
        return;
      }

      // Start ghost animation
      setGhostAnimation({
        sourceRect: sourceRectRef.current,
        event: eventData,
        color: getClassColor(eventData?.class_id),
        targetDate: newDate,
        destinationRect: null,
      });

      // Trigger the actual state update
      onEventDrop(active.id, newDate);
    }

    setTimeScrollState(null);
    setActiveEvent(null);
    sourceRectRef.current = null;
    sourceDateKeyRef.current = null;
    dragMoveYRef.current = null;
  };

  const handleDragCancel = () => {
    clearTimeout(holdTimerRef.current);
    setTimeScrollState(null);
    setActiveEvent(null);
    sourceRectRef.current = null;
    sourceDateKeyRef.current = null;
    dragMoveYRef.current = null;
  };

  // Detect same-day hover during drag → start 400ms hold timer
  const handleDragOver = useCallback((event) => {
    if (IS_COARSE_POINTER) return;
    const { over } = event;
    const overDateKey = over?.id;
    const srcKey = sourceDateKeyRef.current;

    if (overDateKey && overDateKey === srcKey && !timeScrollRef.current?.active) {
      // Hovering over the same day — start hold timer (if not already running)
      if (!holdTimerRef.current) {
        holdTimerRef.current = setTimeout(() => {
          // Determine initial time from the event
          const eventData = events.find((e) => e.id === event.active.id);
          let originalTime = null;
          if (eventData && hasTimeComponent(eventData.due_date)) {
            const t = extractTime(eventData.due_date);
            if (t !== "00:00") originalTime = t;
          }
          const initialTime = originalTime || "09:00";
          const initialSlot = timeToSlot(initialTime);

          setTimeScrollState({
            active: true,
            dateKey: srcKey,
            eventId: event.active.id,
            selectedTime: initialTime,
            originalTime,
            slotIndex: initialSlot,
            originY: dragMoveYRef.current ?? 0,
          });
          holdTimerRef.current = null;
        }, HOLD_DELAY_MS);
      }
    } else {
      // Moved off the same day — cancel any pending timer
      if (holdTimerRef.current) {
        clearTimeout(holdTimerRef.current);
        holdTimerRef.current = null;
      }
      // If time-scroll was active but user moved to a different day, cancel it
      if (timeScrollRef.current?.active && overDateKey !== srcKey) {
        setTimeScrollState(null);
      }
    }
  }, [events]);

  // Track mouse Y during drag for time-scroll scrubbing
  const handleDragMove = useCallback((event) => {
    const currentY = event.delta.y;
    dragMoveYRef.current = currentY;

    const ts = timeScrollRef.current;
    if (!ts?.active) return;

    const yDelta = currentY - ts.originY;
    const slotDelta = Math.round(yDelta / PIXELS_PER_SLOT);
    const newSlot = ts.slotIndex + slotDelta;
    const newTime = slotToTime(newSlot);

    if (newTime !== ts.selectedTime) {
      setTimeScrollState((prev) => prev ? { ...prev, selectedTime: newTime, slotIndex: newSlot, originY: currentY } : null);
    }
  }, []);

  // Escape key → cancel time-scroll mode
  // Mouse wheel → scroll through time slots
  useEffect(() => {
    if (!timeScrollState?.active) return;

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        setTimeScrollState(null);
      }
    };

    const FRICTION = 0.82;          // velocity multiplier per frame (lower = more drag)
    const MIN_VELOCITY = 0.05;     // stop threshold
    const IMPULSE_SCALE = 0.004;   // wheel delta → velocity conversion

    const applySlots = (slots) => {
      setTimeScrollState((prev) => {
        if (!prev) return null;
        const newSlot = prev.slotIndex + slots;
        const newTime = slotToTime(newSlot);
        return { ...prev, slotIndex: newSlot, selectedTime: newTime, originY: dragMoveYRef.current ?? prev.originY };
      });
    };

    // Momentum animation loop
    const tick = () => {
      wheelVelocityRef.current *= FRICTION;
      wheelPositionRef.current += wheelVelocityRef.current;

      const slots = Math.trunc(wheelPositionRef.current);
      if (slots !== 0) {
        wheelPositionRef.current -= slots;
        applySlots(slots);
      }

      if (Math.abs(wheelVelocityRef.current) > MIN_VELOCITY) {
        wheelRafRef.current = requestAnimationFrame(tick);
      } else {
        wheelVelocityRef.current = 0;
        wheelPositionRef.current = 0;
        wheelRafRef.current = null;
      }
    };

    const handleWheel = (e) => {
      e.preventDefault();
      // Add impulse to velocity
      wheelVelocityRef.current += e.deltaY * IMPULSE_SCALE;
      // Start the momentum loop if not already running
      if (!wheelRafRef.current) {
        wheelRafRef.current = requestAnimationFrame(tick);
      }
    };

    window.addEventListener("keydown", handleKeyDown, true);
    window.addEventListener("wheel", handleWheel, { passive: false });
    return () => {
      window.removeEventListener("keydown", handleKeyDown, true);
      window.removeEventListener("wheel", handleWheel);
      if (wheelRafRef.current) {
        cancelAnimationFrame(wheelRafRef.current);
        wheelRafRef.current = null;
      }
      wheelVelocityRef.current = 0;
      wheelPositionRef.current = 0;
    };
  }, [timeScrollState?.active]);

  // Capture destination rect after the event moves to new position
  useLayoutEffect(() => {
    if (ghostAnimation && !ghostAnimation.destinationRect) {
      // Wait a frame for the new card to render in its new position
      requestAnimationFrame(() => {
        const element = document.querySelector(
          `[data-event-id="${ghostAnimation.event?.id}"]`,
        );
        if (element) {
          const destRect = element.getBoundingClientRect();
          setGhostAnimation((prev) => ({
            ...prev,
            destinationRect: destRect,
          }));
        } else {
          // Card not visible (e.g., moved to different month), skip animation
          setGhostAnimation(null);
        }
      });
    }
  }, [ghostAnimation, events]);

  const handleGhostAnimationComplete = () => {
    setGhostAnimation(null);
  };

  const getClassColor = (classId) => {
    const cls = classes.find((c) => c.id === classId);
    return cls?.color || unassignedColor;
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
      onDragOver={handleDragOver}
      onDragMove={handleDragMove}
    >
      <Box
          style={{
            height: "100%",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          <Stack gap="xs" style={{ flex: 1, minHeight: 0 }}>
            <SimpleGrid cols={7} spacing={0}>
              {WEEKDAYS.map((day) => (
                <Box key={day} p="xs" ta="center">
                  <Text size="sm" fw={600} c="dimmed">
                    {day}
                  </Text>
                </Box>
              ))}
            </SimpleGrid>
            <Box
              style={{
                flex: 1,
                minHeight: 0,
                display: "grid",
                gridTemplateColumns: "repeat(7, 1fr)",
                gridTemplateRows: "repeat(6, 1fr)",
                gap: "3px",
              }}
              className={slideDirection}
            >
              {calendarDays.map(({ date, isCurrentMonth }) => {
                const dateKey = date.format("YYYY-MM-DD");
                const dayEvents = eventsByDate[dateKey] || [];
                const isToday = date.isSame(dayjs(), "day");

                const isTimeScrollTarget = timeScrollState?.active && timeScrollState.dateKey === dateKey;

                return (
                  <CalendarDay
                    key={dateKey}
                    date={date}
                    dateKey={dateKey}
                    isCurrentMonth={isCurrentMonth}
                    isToday={isToday}
                    events={dayEvents}
                    classes={classes}
                    onEventClick={onEventClick}
                    onEventContextMenu={handleEventContextMenu}
                    onDayContextMenu={handleDayContextMenu}
                    onDayClick={onDayClick}
                    onDoubleClick={(e) => {
                      const cell = e.currentTarget.closest('.calendar-day');
                      const rect = cell ? cell.getBoundingClientRect() : null;
                      onDayDoubleClick(dateKey, rect);
                    }}
                    unassignedColor={unassignedColor}
                    timeScrollActive={isTimeScrollTarget}
                    timeScrollTime={isTimeScrollTarget ? timeScrollState.selectedTime : null}
                    timeScrollOriginalTime={isTimeScrollTarget ? timeScrollState.originalTime : null}
                  />
                );
              })}
            </Box>
          </Stack>
        </Box>

      <DragOverlay dropAnimation={null}>
        {activeEvent && (
          <EventCard
            event={activeEvent}
            color={getClassColor(activeEvent.class_id)}
            isDragging
          />
        )}
      </DragOverlay>

      {/* Ghost trail animation for rescheduling */}
      <AnimatePresence>
        {ghostAnimation?.destinationRect && (
          <motion.div
            key="ghost-card"
            initial={{
              left: ghostAnimation.sourceRect.left,
              top: ghostAnimation.sourceRect.top,
              width: ghostAnimation.sourceRect.width,
              height: ghostAnimation.sourceRect.height,
              opacity: 1,
              scale: 1.05,
            }}
            animate={{
              left: ghostAnimation.destinationRect.left,
              top: ghostAnimation.destinationRect.top,
              width: ghostAnimation.destinationRect.width,
              height: ghostAnimation.destinationRect.height,
              opacity: [1, 1, 0],
              scale: [1.05, 1.02, 1],
            }}
            transition={{
              duration: 0.35,
              ease: [0.25, 0.1, 0.25, 1],
              opacity: { times: [0, 0.7, 1] },
              scale: { times: [0, 0.7, 1] },
            }}
            onAnimationComplete={handleGhostAnimationComplete}
            style={{
              position: "fixed",
              zIndex: 1000,
              pointerEvents: "none",
              filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.3))",
            }}
          >
            <EventCard
              event={ghostAnimation.event}
              color={ghostAnimation.color}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Right-click context menu for event cards */}
      <Menu
        opened={contextMenu !== null}
        onChange={(opened) => { if (!opened) setContextMenu(null); }}
        position="bottom-start"
        withinPortal
        transitionProps={{ duration: 0 }}
      >
        <Menu.Target>
          <div
            ref={contextMenuAnchorRef}
            style={{
              position: "fixed",
              left: contextMenu?.x ?? 0,
              top: contextMenu?.y ?? 0,
              width: 0,
              height: 0,
              pointerEvents: "none",
            }}
          />
        </Menu.Target>
        <Menu.Dropdown>
          <Menu.Item
            leftSection={<IconPencil size={14} />}
            onClick={handleContextMenuEdit}
          >
            Edit
          </Menu.Item>
          <Menu.Item
            color="red"
            leftSection={<IconTrash size={14} />}
            onClick={handleContextMenuDelete}
          >
            Delete
          </Menu.Item>
          <Menu.Divider />
          <Menu.Label>Status</Menu.Label>
          {STATUS_MENU_ITEMS.map(({ value, label, icon: Icon }) => (
            <Menu.Item
              key={value}
              leftSection={<Icon size={14} />}
              disabled={contextEvent?.status === value}
              onClick={() => handleContextMenuStatus(value)}
            >
              {label}
            </Menu.Item>
          ))}
        </Menu.Dropdown>
      </Menu>

      {/* Right-click context menu for empty day space */}
      <Menu
        opened={dayContextMenu !== null}
        onChange={(opened) => { if (!opened) setDayContextMenu(null); }}
        position="bottom-start"
        withinPortal
        transitionProps={{ duration: 0 }}
      >
        <Menu.Target>
          <div
            style={{
              position: "fixed",
              left: dayContextMenu?.x ?? 0,
              top: dayContextMenu?.y ?? 0,
              width: 0,
              height: 0,
              pointerEvents: "none",
            }}
          />
        </Menu.Target>
        <Menu.Dropdown>
          <Menu.Item
            leftSection={<IconPlus size={14} />}
            onClick={handleDayAddEvent}
          >
            Add Event
          </Menu.Item>
          {hasTodoistToken && (
            <Menu.Item
              leftSection={<IconChecklist size={14} color="#e44332" />}
              onClick={handleDayAddTodoistTask}
            >
              Add Todoist Task
            </Menu.Item>
          )}
        </Menu.Dropdown>
      </Menu>
    </DndContext>
  );
}
