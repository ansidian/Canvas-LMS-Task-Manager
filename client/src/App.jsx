import { useState, useEffect, useMemo } from "react";
import {
  AppShell,
  Title,
  Group,
  ActionIcon,
  Text,
  useMantineColorScheme,
  Badge,
  Tooltip,
} from "@mantine/core";
import { useHotkeys } from "@mantine/hooks";
import { Spotlight, spotlight } from "@mantine/spotlight";
import "@mantine/spotlight/styles.css";
import { OnboardingTour } from "@gfazioli/mantine-onboarding-tour";
import "@gfazioli/mantine-onboarding-tour/styles.css";
import "./onboarding-tour.css";
import {
  IconChevronLeft,
  IconChevronRight,
  IconSun,
  IconMoon,
  IconSettings,
  IconRefresh,
  IconSearch,
  IconCircle,
  IconCircleHalf2,
  IconCircleCheck,
} from "@tabler/icons-react";
import {
  SignedIn,
  SignedOut,
  SignIn,
  UserButton,
  useAuth,
} from "@clerk/clerk-react";
import dayjs from "dayjs";
import Calendar from "./components/Calendar";
import ResizableSidebar from "./components/ResizableSidebar";
import SettingsModal from "./components/SettingsModal";
import ApprovalModal from "./components/ApprovalModal";
import EventModal from "./components/EventModal";
import CreateEventModal from "./components/CreateEventModal";
import {
  CalendarSkeleton,
  PendingSidebarSkeleton,
} from "./components/SkeletonLoaders";
import { hasTimeComponent, extractTime } from "./utils/datetime";

// Main App Component
function AppContent() {
  const { getToken } = useAuth();

  // API helper with Clerk auth
  const api = async (endpoint, options = {}) => {
    const token = await getToken();
    const res = await fetch(`/api${endpoint}`, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...options.headers,
      },
      ...options,
    });
    if (!res.ok) {
      const error = await res
        .json()
        .catch(() => ({ message: "Request failed" }));
      throw new Error(error.message || "Request failed");
    }
    return res.json();
  };

  // Storage keys
  const PENDING_CACHE_KEY = "canvas_pending_items";
  const STATUS_FILTERS_KEY = "calendar_status_filters";
  const CLASS_FILTERS_KEY = "calendar_class_filters";

  const ALL_STATUSES = ["incomplete", "in_progress", "complete"];

  const { colorScheme, toggleColorScheme } = useMantineColorScheme();
  const [currentDate, setCurrentDate] = useState(dayjs());
  const [events, setEvents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [pendingItems, setPendingItems] = useState([]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [approvalIndex, setApprovalIndex] = useState(-1);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [createEventDate, setCreateEventDate] = useState(null);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [statusFilters, setStatusFilters] = useState(() => {
    const saved = localStorage.getItem(STATUS_FILTERS_KEY);
    return saved ? JSON.parse(saved) : [...ALL_STATUSES];
  });
  const [classFilters, setClassFilters] = useState(() => {
    const saved = localStorage.getItem(CLASS_FILTERS_KEY);
    return saved ? JSON.parse(saved) : [];
  });
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Current approval item based on index
  const approvalItem = approvalIndex >= 0 ? pendingItems[approvalIndex] : null;

  // Onboarding tour steps
  const tourSteps = [
    {
      id: "settings-button",
      title: "Configure Canvas",
      content:
        "First, open Settings to enter your Canvas URL and API token. This is required to fetch your assignments. You can also manage your course classes here.",
    },
    {
      id: "filter-section",
      title: "Filters",
      content:
        "Filter your calendar by class or completion status to focus on what matters most to you.",
    },
    {
      id: "pending-section",
      title: "Pending Assignments",
      content:
        "Review and approve Canvas assignments here before they appear on your calendar. Click on any item to customize it before adding.",
    },
  ];

  // Persist status filters to localStorage
  useEffect(() => {
    localStorage.setItem(STATUS_FILTERS_KEY, JSON.stringify(statusFilters));
  }, [statusFilters]);

  // Persist class filters to localStorage
  useEffect(() => {
    localStorage.setItem(CLASS_FILTERS_KEY, JSON.stringify(classFilters));
  }, [classFilters]);

  // Initialize class filters with all classes when classes load
  useEffect(() => {
    if (classes.length > 0 && classFilters.length === 0) {
      const allClassIds = classes.map((c) => String(c.id));
      setClassFilters([...allClassIds, "unassigned"]);
    }
  }, [classes, classFilters.length]);

  // Filtered events based on status and class filters
  const filteredEvents = useMemo(() => {
    return events.filter((e) => {
      const statusMatch = statusFilters.includes(e.status);
      const classMatch = e.class_id
        ? classFilters.includes(String(e.class_id))
        : classFilters.includes("unassigned");
      return statusMatch && classMatch;
    });
  }, [events, statusFilters, classFilters]);

  // Filter out pending items from unsynced classes
  const filteredPendingItems = useMemo(() => {
    const unsyncedCourseIds = new Set(
      classes
        .filter((cls) => cls.canvas_course_id && !cls.is_synced)
        .map((cls) => cls.canvas_course_id)
    );
    return pendingItems.filter(
      (item) => !unsyncedCourseIds.has(item.canvas_course_id)
    );
  }, [pendingItems, classes]);

  // Spotlight actions for searching events
  const spotlightActions = useMemo(() => {
    return events.map((event) => {
      const cls = classes.find((c) => c.id === event.class_id);
      const StatusIcon =
        event.status === "complete"
          ? IconCircleCheck
          : event.status === "in_progress"
          ? IconCircleHalf2
          : IconCircle;

      return {
        id: String(event.id),
        label: event.title,
        description: `${cls?.name || "No class"} • Due: ${dayjs(
          event.due_date
        ).format("MMM D, YYYY")}`,
        leftSection: <StatusIcon size={20} color={cls?.color || "#a78b71"} />,
        onClick: () => setSelectedEvent(event),
      };
    });
  }, [events, classes]);

  // Keyboard shortcuts
  useHotkeys([
    ["n", () => setCurrentDate((d) => d.add(1, "month"))],
    ["ArrowRight", () => setCurrentDate((d) => d.add(1, "month"))],
    ["p", () => setCurrentDate((d) => d.subtract(1, "month"))],
    ["ArrowLeft", () => setCurrentDate((d) => d.subtract(1, "month"))],
    ["t", () => setCurrentDate(dayjs())],
    ["mod+j", () => toggleColorScheme()],
    ["mod+k", () => spotlight.open()],
  ]);

  // Load initial data and cached pending items
  useEffect(() => {
    const loadInitialData = async () => {
      await Promise.all([loadEvents(), loadClasses()]);
      loadCachedPendingItems();
      setInitialLoading(false);

      // Check if this is first visit and start tour after small delay
      const hasCompleted = localStorage.getItem("hasCompletedOnboarding");
      if (!hasCompleted) {
        setTimeout(() => {
          setShowOnboarding(true);
        }, 250);
      }
    };
    loadInitialData();
  }, []);

  // Save pending items to cache when they change
  useEffect(() => {
    if (pendingItems.length > 0) {
      localStorage.setItem(PENDING_CACHE_KEY, JSON.stringify(pendingItems));
    }
  }, [pendingItems]);

  const loadCachedPendingItems = () => {
    const cached = localStorage.getItem(PENDING_CACHE_KEY);
    if (cached) {
      setPendingItems(JSON.parse(cached));
    }
  };

  const loadEvents = async () => {
    try {
      const data = await api("/events");
      setEvents(data);
    } catch (err) {
      console.error("Failed to load events:", err);
    }
  };

  const loadClasses = async () => {
    try {
      const data = await api("/classes");
      setClasses(data);
    } catch (err) {
      console.error("Failed to load classes:", err);
    }
  };

  // Auto-create classes from Canvas courses
  const ensureClassesExist = async (canvasCourses) => {
    // Build a map of existing classes by canvas_course_id
    const existingByCanvasId = new Map();
    const existingByName = new Map();
    for (const cls of classes) {
      if (cls.canvas_course_id) {
        existingByCanvasId.set(cls.canvas_course_id, cls);
      }
      existingByName.set(cls.name.toLowerCase(), cls);
    }

    const colors = [
      "#228be6",
      "#fa5252",
      "#fab005",
      "#15aabf",
      "#e64980",
      "#fd7e14",
      "#20c997",
    ];

    let needsReload = false;

    for (const course of canvasCourses) {
      const { canvas_course_id, name } = course;

      // Already linked by canvas_course_id - nothing to do
      if (existingByCanvasId.has(canvas_course_id)) {
        continue;
      }

      // Check if there's a class with matching name that needs linking
      const matchingClass = existingByName.get(name.toLowerCase());
      if (matchingClass && !matchingClass.canvas_course_id) {
        // Link existing class to Canvas course
        try {
          await api(`/classes/${matchingClass.id}`, {
            method: "PATCH",
            body: JSON.stringify({ canvas_course_id }),
          });
          needsReload = true;
        } catch (err) {
          console.error("Failed to link class:", err);
        }
      } else if (!matchingClass) {
        // Create new class for this Canvas course
        try {
          await api("/classes", {
            method: "POST",
            body: JSON.stringify({
              name,
              color: colors[Math.floor(Math.random() * colors.length)],
              canvas_course_id,
            }),
          });
          needsReload = true;
        } catch (err) {
          console.error("Failed to create class:", err);
        }
      }
    }

    if (needsReload) {
      await loadClasses();
    }
  };

  const fetchCanvasAssignments = async () => {
    const canvasUrl = localStorage.getItem("canvasUrl");
    const canvasToken = localStorage.getItem("canvasToken");

    if (!canvasUrl || !canvasToken) {
      setSettingsOpen(true);
      return;
    }

    setLoading(true);
    try {
      const data = await api("/canvas/assignments", {
        headers: {
          "X-Canvas-Url": canvasUrl,
          "X-Canvas-Token": canvasToken,
        },
      });

      // Create classes for all Canvas courses (even those without assignments)
      await ensureClassesExist(data.courses);

      setPendingItems(data.assignments);
    } catch (err) {
      console.error("Failed to fetch Canvas assignments:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (item, formData) => {
    try {
      const newEvent = await api("/events", {
        method: "POST",
        body: JSON.stringify({
          title: item.title,
          due_date: formData.dueDate || item.due_date,
          class_id: formData.classId ? parseInt(formData.classId) : null,
          event_type: formData.eventType,
          status: "incomplete",
          notes: formData.notes,
          url: formData.url || item.url,
          canvas_id: item.canvas_id,
        }),
      });
      setEvents((prev) => [...prev, newEvent]);

      // Wait for animation to complete before removing
      setTimeout(() => {
        const remaining = pendingItems.filter(
          (p) => p.canvas_id !== item.canvas_id
        );
        setPendingItems(remaining);

        // Update cache
        if (remaining.length > 0) {
          localStorage.setItem(PENDING_CACHE_KEY, JSON.stringify(remaining));
          // Stay at same index if possible, otherwise go to previous
          if (approvalIndex >= remaining.length) {
            setApprovalIndex(remaining.length - 1);
          }
        } else {
          localStorage.removeItem(PENDING_CACHE_KEY);
          setApprovalIndex(-1);
        }
      }, 200);
    } catch (err) {
      console.error("Failed to approve item:", err);
    }
  };

  const handleReject = async (item) => {
    try {
      await api("/rejected", {
        method: "POST",
        body: JSON.stringify({ canvas_id: item.canvas_id }),
      });

      // Wait for animation to complete before removing
      setTimeout(() => {
        const remaining = pendingItems.filter(
          (p) => p.canvas_id !== item.canvas_id
        );
        setPendingItems(remaining);

        // Update cache
        if (remaining.length > 0) {
          localStorage.setItem(PENDING_CACHE_KEY, JSON.stringify(remaining));
          // Stay at same index if possible, otherwise go to previous
          if (approvalIndex >= remaining.length) {
            setApprovalIndex(remaining.length - 1);
          }
        } else {
          localStorage.removeItem(PENDING_CACHE_KEY);
          setApprovalIndex(-1);
        }
      }, 200);
    } catch (err) {
      console.error("Failed to reject item:", err);
    }
  };

  const handleEventUpdate = async (eventId, updates) => {
    console.log("[App] handleEventUpdate called:", { eventId, updates });
    try {
      const updated = await api(`/events/${eventId}`, {
        method: "PATCH",
        body: JSON.stringify(updates),
      });
      console.log("[App] Server response:", updated);
      setEvents((prev) => prev.map((e) => (e.id === eventId ? updated : e)));
      setSelectedEvent(null);
    } catch (err) {
      console.error("Failed to update event:", err);
    }
  };

  const handleEventDelete = async (eventId) => {
    try {
      await api(`/events/${eventId}`, { method: "DELETE" });
      setEvents((prev) => prev.filter((e) => e.id !== eventId));
      setSelectedEvent(null);
    } catch (err) {
      console.error("Failed to delete event:", err);
    }
  };

  const handleEventDrop = async (eventId, newDate) => {
    try {
      // Find the original event to preserve time component if it exists
      const originalEvent = events.find((e) => e.id === eventId);
      let updatedDueDate = newDate;

      // If the original event has a time component, preserve it
      if (originalEvent && hasTimeComponent(originalEvent.due_date)) {
        const timeString = extractTime(originalEvent.due_date);
        // Combine new date (YYYY-MM-DD) with existing time (HH:mm)
        updatedDueDate = `${newDate}T${timeString}:00`;
      }

      const updated = await api(`/events/${eventId}`, {
        method: "PATCH",
        body: JSON.stringify({ due_date: updatedDueDate }),
      });
      setEvents((prev) => prev.map((e) => (e.id === eventId ? updated : e)));
    } catch (err) {
      console.error("Failed to move event:", err);
    }
  };

  const handleCreateEvent = async (eventData) => {
    try {
      const newEvent = await api("/events", {
        method: "POST",
        body: JSON.stringify({ ...eventData, status: "incomplete" }),
      });
      setEvents((prev) => [...prev, newEvent]);
      setCreateEventDate(null);
    } catch (err) {
      console.error("Failed to create event:", err);
    }
  };

  const handleDayDoubleClick = (date) => {
    setCreateEventDate(date);
  };

  const openApprovalModal = (item) => {
    const index = pendingItems.findIndex((p) => p.canvas_id === item.canvas_id);
    setApprovalIndex(index);
  };

  const navigateApproval = (direction) => {
    const newIndex = approvalIndex + direction;
    if (newIndex >= 0 && newIndex < pendingItems.length) {
      setApprovalIndex(newIndex);
    }
  };

  const prevMonth = () => setCurrentDate((d) => d.subtract(1, "month"));
  const nextMonth = () => setCurrentDate((d) => d.add(1, "month"));
  const goToToday = () => setCurrentDate(dayjs());

  // Toggle body class for onboarding CSS
  useEffect(() => {
    if (showOnboarding) {
      document.body.classList.add("onboarding-active");
    } else {
      document.body.classList.remove("onboarding-active");
    }
    return () => {
      document.body.classList.remove("onboarding-active");
    };
  }, [showOnboarding]);

  const handleTourComplete = () => {
    localStorage.setItem("hasCompletedOnboarding", "true");
    setShowOnboarding(false);
  };

  return (
    <OnboardingTour
      tour={tourSteps}
      started={showOnboarding}
      onOnboardingTourEnd={handleTourComplete}
      onOnboardingTourClose={handleTourComplete}
      withSkipButton
      withPrevButton
      withNextButton
      withStepper
      focusRevealProps={{
        withOverlay: true,
        disableTargetInteraction: true,
        overlayProps: {
          backgroundOpacity: 0.6,
          blur: 0,
          zIndex: 100,
        },
        popoverProps: {
          zIndex: 200,
          offset: 16,
        },
      }}
    >
      <Spotlight
        actions={spotlightActions}
        nothingFound="No assignments found"
        searchProps={{
          leftSection: <IconSearch size={20} />,
          placeholder: "Search assignments...",
        }}
        highlightQuery
      />

      <AppShell
        header={{ height: 60 }}
        aside={{
          width: 320,
          breakpoint: "sm",
          collapsed: { mobile: filteredPendingItems.length === 0 },
        }}
        padding="md"
      >
        <AppShell.Header>
          <Group h="100%" px="md" justify="space-between">
            <Group>
              <Title order={3}>Canvas Task Manager (CTM)</Title>
            </Group>
            <Group gap="xs">
              <Tooltip label="Previous month (P)">
                <ActionIcon variant="subtle" onClick={prevMonth} size="lg">
                  <IconChevronLeft size={20} />
                </ActionIcon>
              </Tooltip>
              <Tooltip label="Today (T)">
                <Text
                  fw={500}
                  size="lg"
                  w={180}
                  ta="center"
                  style={{ cursor: "pointer" }}
                  onClick={goToToday}
                >
                  {currentDate.format("MMMM YYYY")}
                </Text>
              </Tooltip>
              <Tooltip label="Next month (N)">
                <ActionIcon variant="subtle" onClick={nextMonth} size="lg">
                  <IconChevronRight size={20} />
                </ActionIcon>
              </Tooltip>
            </Group>
            <Group>
              <Tooltip label="Search (Ctrl+K)">
                <ActionIcon
                  variant="subtle"
                  onClick={() => spotlight.open()}
                  size="lg"
                >
                  <IconSearch size={20} />
                </ActionIcon>
              </Tooltip>
              <Tooltip label="Fetch Canvas assignments">
                <ActionIcon
                  variant="subtle"
                  onClick={fetchCanvasAssignments}
                  loading={loading}
                  size="lg"
                >
                  <IconRefresh size={20} />
                </ActionIcon>
              </Tooltip>
              <Tooltip label="Toggle theme (Ctrl+J)">
                <ActionIcon
                  variant="subtle"
                  onClick={toggleColorScheme}
                  size="lg"
                >
                  {colorScheme === "dark" ? (
                    <IconSun size={20} />
                  ) : (
                    <IconMoon size={20} />
                  )}
                </ActionIcon>
              </Tooltip>
              <Tooltip label="Settings">
                <ActionIcon
                  variant="subtle"
                  onClick={() => setSettingsOpen(true)}
                  size="lg"
                  data-onboarding-tour-id="settings-button"
                >
                  <IconSettings size={20} />
                </ActionIcon>
              </Tooltip>
              {filteredPendingItems.length > 0 && (
                <Badge color="red" variant="filled">
                  {filteredPendingItems.length} pending
                </Badge>
              )}
              <UserButton />
            </Group>
          </Group>
        </AppShell.Header>

        <AppShell.Main
          style={{
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            height: "calc(100vh - 60px)",
          }}
        >
          {initialLoading ? (
            <CalendarSkeleton />
          ) : (
            <Calendar
              currentDate={currentDate}
              events={filteredEvents}
              classes={classes}
              onEventClick={setSelectedEvent}
              onEventDrop={handleEventDrop}
              onDayDoubleClick={handleDayDoubleClick}
            />
          )}
        </AppShell.Main>

        <AppShell.Aside p={0}>
          {loading ? (
            <PendingSidebarSkeleton />
          ) : (
            <ResizableSidebar
              pendingItems={pendingItems}
              onPendingItemClick={openApprovalModal}
              statusFilters={statusFilters}
              onStatusFiltersChange={setStatusFilters}
              classFilters={classFilters}
              onClassFiltersChange={setClassFilters}
              classes={classes}
            />
          )}
        </AppShell.Aside>

        <SettingsModal
          opened={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          classes={classes}
          onClassesChange={loadClasses}
        />

        <ApprovalModal
          opened={approvalIndex >= 0}
          onClose={() => setApprovalIndex(-1)}
          item={approvalItem}
          classes={classes}
          onApprove={handleApprove}
          onReject={handleReject}
          pendingCount={filteredPendingItems.length}
          currentIndex={approvalIndex}
          onNavigate={navigateApproval}
        />

        <EventModal
          opened={!!selectedEvent}
          onClose={() => setSelectedEvent(null)}
          event={selectedEvent}
          classes={classes}
          onUpdate={handleEventUpdate}
          onDelete={handleEventDelete}
        />

        <CreateEventModal
          opened={!!createEventDate}
          onClose={() => setCreateEventDate(null)}
          date={createEventDate}
          classes={classes}
          onCreate={handleCreateEvent}
        />
      </AppShell>
    </OnboardingTour>
  );
}

// Sign-in page wrapper component
function SignInPage() {
  const { colorScheme } = useMantineColorScheme();

  const backgroundStyle = {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "100vh",
    background:
      colorScheme === "dark"
        ? "linear-gradient(135deg, #1f2937 0%, #1e293b 50%, #0f172a 100%)"
        : "linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)",
  };

  return (
    <div style={backgroundStyle}>
      <SignIn />
    </div>
  );
}

// Main export with authentication
export default function App() {
  return (
    <>
      <SignedOut>
        <SignInPage />
      </SignedOut>

      <SignedIn>
        <AppContent />
      </SignedIn>
    </>
  );
}
