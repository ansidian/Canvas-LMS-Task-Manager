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
  const [removingId, setRemovingId] = useState(null);
  const [statusFilters, setStatusFilters] = useState(() => {
    const saved = localStorage.getItem(STATUS_FILTERS_KEY);
    return saved ? JSON.parse(saved) : [...ALL_STATUSES];
  });
  const [classFilters, setClassFilters] = useState(() => {
    const saved = localStorage.getItem(CLASS_FILTERS_KEY);
    return saved ? JSON.parse(saved) : [];
  });

  // Current approval item based on index
  const approvalItem = approvalIndex >= 0 ? pendingItems[approvalIndex] : null;

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
        leftSection: <StatusIcon size={20} color={cls?.color || "#868e96"} />,
        onClick: () => setSelectedEvent(event),
      };
    });
  }, [events, classes]);

  // Keyboard shortcuts
  useHotkeys([
    ["n", () => setCurrentDate((d) => d.add(1, "month"))],
    ["p", () => setCurrentDate((d) => d.subtract(1, "month"))],
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

  // Auto-create classes from course names
  const ensureClassesExist = async (courseNames) => {
    const existingNames = new Set(classes.map((c) => c.name.toLowerCase()));
    const newCourses = [...new Set(courseNames)].filter(
      (name) => name && !existingNames.has(name.toLowerCase())
    );

    const colors = [
      "#228be6",
      "#fa5252",
      "#fab005",
      "#15aabf",
      "#e64980",
      "#fd7e14",
      "#20c997",
    ];
    for (const courseName of newCourses) {
      try {
        await api("/classes", {
          method: "POST",
          body: JSON.stringify({
            name: courseName,
            color: colors[Math.floor(Math.random() * colors.length)],
          }),
        });
      } catch (err) {
        console.error("Failed to create class:", err);
      }
    }

    if (newCourses.length > 0) {
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

      const courseNames = data.map((item) => item.course_name);
      await ensureClassesExist(courseNames);

      setPendingItems(data);
    } catch (err) {
      console.error("Failed to fetch Canvas assignments:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (item, formData) => {
    // Trigger animation
    setRemovingId(item.canvas_id);

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
        setRemovingId(null);

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
      }, 300);
    } catch (err) {
      console.error("Failed to approve item:", err);
      setRemovingId(null);
    }
  };

  const handleReject = async (item) => {
    // Trigger animation
    setRemovingId(item.canvas_id);

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
        setRemovingId(null);

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
      }, 300);
    } catch (err) {
      console.error("Failed to reject item:", err);
      setRemovingId(null);
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
      const updated = await api(`/events/${eventId}`, {
        method: "PATCH",
        body: JSON.stringify({ due_date: newDate }),
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

  return (
    <>
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
          collapsed: { mobile: pendingItems.length === 0 },
        }}
        padding="md"
      >
        <AppShell.Header>
          <Group h="100%" px="md" justify="space-between">
            <Group>
              <Title order={3}>Canvas Task Manager</Title>
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
                >
                  <IconSettings size={20} />
                </ActionIcon>
              </Tooltip>
              {pendingItems.length > 0 && (
                <Badge color="red" variant="filled">
                  {pendingItems.length} pending
                </Badge>
              )}
              <UserButton />
            </Group>
          </Group>
        </AppShell.Header>

        <AppShell.Main>
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
              removingId={removingId}
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
          pendingCount={pendingItems.length}
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
    </>
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
