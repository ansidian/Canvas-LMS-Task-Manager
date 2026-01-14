import { useState, useEffect, useMemo } from 'react';
import {
  AppShell,
  Title,
  Group,
  ActionIcon,
  Text,
  useMantineColorScheme,
  Badge,
  Tooltip,
  SegmentedControl,
} from '@mantine/core';
import { useHotkeys } from '@mantine/hooks';
import { Spotlight, spotlight } from '@mantine/spotlight';
import '@mantine/spotlight/styles.css';
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
} from '@tabler/icons-react';
import dayjs from 'dayjs';
import Calendar from './components/Calendar';
import PendingSidebar from './components/PendingSidebar';
import SettingsModal from './components/SettingsModal';
import ApprovalModal from './components/ApprovalModal';
import EventModal from './components/EventModal';
import CreateEventModal from './components/CreateEventModal';

// API helper
const api = async (endpoint, options = {}) => {
  const res = await fetch(`/api${endpoint}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.message || 'Request failed');
  }
  return res.json();
};

// Cache keys
const PENDING_CACHE_KEY = 'canvas_pending_items';
const PENDING_CACHE_TIME_KEY = 'canvas_pending_cache_time';
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

export default function App() {
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
  const [statusFilter, setStatusFilter] = useState('all');

  // Current approval item based on index
  const approvalItem = approvalIndex >= 0 ? pendingItems[approvalIndex] : null;

  // Filtered events based on status
  const filteredEvents = useMemo(() => {
    if (statusFilter === 'all') return events;
    return events.filter((e) => e.status === statusFilter);
  }, [events, statusFilter]);

  // Spotlight actions for searching events
  const spotlightActions = useMemo(() => {
    return events.map((event) => {
      const cls = classes.find((c) => c.id === event.class_id);
      const StatusIcon =
        event.status === 'complete'
          ? IconCircleCheck
          : event.status === 'in_progress'
          ? IconCircleHalf2
          : IconCircle;

      return {
        id: String(event.id),
        label: event.title,
        description: `${cls?.name || 'No class'} • Due: ${dayjs(event.due_date).format('MMM D, YYYY')}`,
        leftSection: <StatusIcon size={20} color={cls?.color || '#868e96'} />,
        onClick: () => setSelectedEvent(event),
      };
    });
  }, [events, classes]);

  // Keyboard shortcuts
  useHotkeys([
    ['n', () => setCurrentDate((d) => d.add(1, 'month'))],
    ['p', () => setCurrentDate((d) => d.subtract(1, 'month'))],
    ['t', () => setCurrentDate(dayjs())],
    ['mod+j', () => toggleColorScheme()],
    ['mod+k', () => spotlight.open()],
  ]);

  // Load initial data and cached pending items
  useEffect(() => {
    loadEvents();
    loadClasses();
    loadCachedPendingItems();
  }, []);

  // Save pending items to cache when they change
  useEffect(() => {
    if (pendingItems.length > 0) {
      localStorage.setItem(PENDING_CACHE_KEY, JSON.stringify(pendingItems));
      localStorage.setItem(PENDING_CACHE_TIME_KEY, Date.now().toString());
    }
  }, [pendingItems]);

  const loadCachedPendingItems = () => {
    const cached = localStorage.getItem(PENDING_CACHE_KEY);
    const cacheTime = localStorage.getItem(PENDING_CACHE_TIME_KEY);

    if (cached && cacheTime) {
      const age = Date.now() - parseInt(cacheTime);
      if (age < CACHE_DURATION) {
        setPendingItems(JSON.parse(cached));
      } else {
        // Cache expired, clear it
        localStorage.removeItem(PENDING_CACHE_KEY);
        localStorage.removeItem(PENDING_CACHE_TIME_KEY);
      }
    }
  };

  const loadEvents = async () => {
    try {
      const data = await api('/events');
      setEvents(data);
    } catch (err) {
      console.error('Failed to load events:', err);
    }
  };

  const loadClasses = async () => {
    try {
      const data = await api('/classes');
      setClasses(data);
    } catch (err) {
      console.error('Failed to load classes:', err);
    }
  };

  // Auto-create classes from course names
  const ensureClassesExist = async (courseNames) => {
    const existingNames = new Set(classes.map((c) => c.name.toLowerCase()));
    const newCourses = [...new Set(courseNames)].filter(
      (name) => name && !existingNames.has(name.toLowerCase())
    );

    const colors = ['#228be6', '#40c057', '#fa5252', '#fab005', '#7950f2', '#15aabf', '#e64980'];
    for (const courseName of newCourses) {
      try {
        await api('/classes', {
          method: 'POST',
          body: JSON.stringify({
            name: courseName,
            color: colors[Math.floor(Math.random() * colors.length)],
          }),
        });
      } catch (err) {
        console.error('Failed to create class:', err);
      }
    }

    if (newCourses.length > 0) {
      await loadClasses();
    }
  };

  const fetchCanvasAssignments = async () => {
    const canvasUrl = localStorage.getItem('canvasUrl');
    const canvasToken = localStorage.getItem('canvasToken');

    if (!canvasUrl || !canvasToken) {
      setSettingsOpen(true);
      return;
    }

    setLoading(true);
    try {
      const data = await api('/canvas/assignments', {
        headers: {
          'X-Canvas-Url': canvasUrl,
          'X-Canvas-Token': canvasToken,
        },
      });

      const courseNames = data.map((item) => item.course_name);
      await ensureClassesExist(courseNames);

      setPendingItems(data);
    } catch (err) {
      console.error('Failed to fetch Canvas assignments:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (item, formData) => {
    try {
      const newEvent = await api('/events', {
        method: 'POST',
        body: JSON.stringify({
          title: item.title,
          due_date: formData.dueDate || item.due_date,
          class_id: formData.classId ? parseInt(formData.classId) : null,
          event_type: formData.eventType,
          status: 'incomplete',
          notes: formData.notes,
          url: formData.url || item.url,
          canvas_id: item.canvas_id,
        }),
      });
      setEvents((prev) => [...prev, newEvent]);

      // Filter out the approved item
      const remaining = pendingItems.filter((p) => p.canvas_id !== item.canvas_id);
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
        localStorage.removeItem(PENDING_CACHE_TIME_KEY);
        setApprovalIndex(-1);
      }
    } catch (err) {
      console.error('Failed to approve item:', err);
    }
  };

  const handleReject = async (item) => {
    try {
      await api('/rejected', {
        method: 'POST',
        body: JSON.stringify({ canvas_id: item.canvas_id }),
      });
      const remaining = pendingItems.filter((p) => p.canvas_id !== item.canvas_id);
      setPendingItems(remaining);

      // Update cache
      if (remaining.length > 0) {
        localStorage.setItem(PENDING_CACHE_KEY, JSON.stringify(remaining));
      } else {
        localStorage.removeItem(PENDING_CACHE_KEY);
        localStorage.removeItem(PENDING_CACHE_TIME_KEY);
      }
    } catch (err) {
      console.error('Failed to reject item:', err);
    }
  };

  const handleEventUpdate = async (eventId, updates) => {
    try {
      const updated = await api(`/events/${eventId}`, {
        method: 'PATCH',
        body: JSON.stringify(updates),
      });
      setEvents((prev) => prev.map((e) => (e.id === eventId ? updated : e)));
      setSelectedEvent(null);
    } catch (err) {
      console.error('Failed to update event:', err);
    }
  };

  const handleEventDelete = async (eventId) => {
    try {
      await api(`/events/${eventId}`, { method: 'DELETE' });
      setEvents((prev) => prev.filter((e) => e.id !== eventId));
      setSelectedEvent(null);
    } catch (err) {
      console.error('Failed to delete event:', err);
    }
  };

  const handleEventDrop = async (eventId, newDate) => {
    try {
      const updated = await api(`/events/${eventId}`, {
        method: 'PATCH',
        body: JSON.stringify({ due_date: newDate }),
      });
      setEvents((prev) => prev.map((e) => (e.id === eventId ? updated : e)));
    } catch (err) {
      console.error('Failed to move event:', err);
    }
  };

  const handleCreateEvent = async (eventData) => {
    try {
      const newEvent = await api('/events', {
        method: 'POST',
        body: JSON.stringify({ ...eventData, status: 'incomplete' }),
      });
      setEvents((prev) => [...prev, newEvent]);
      setCreateEventDate(null);
    } catch (err) {
      console.error('Failed to create event:', err);
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

  const prevMonth = () => setCurrentDate((d) => d.subtract(1, 'month'));
  const nextMonth = () => setCurrentDate((d) => d.add(1, 'month'));
  const goToToday = () => setCurrentDate(dayjs());

  return (
    <>
      <Spotlight
        actions={spotlightActions}
        nothingFound="No assignments found"
        searchProps={{
          leftSection: <IconSearch size={20} />,
          placeholder: 'Search assignments...',
        }}
        highlightQuery
      />

      <AppShell
        header={{ height: 60 }}
        aside={{ width: 320, breakpoint: 'sm', collapsed: { mobile: pendingItems.length === 0 } }}
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
                  style={{ cursor: 'pointer' }}
                  onClick={goToToday}
                >
                  {currentDate.format('MMMM YYYY')}
                </Text>
              </Tooltip>
              <Tooltip label="Next month (N)">
                <ActionIcon variant="subtle" onClick={nextMonth} size="lg">
                  <IconChevronRight size={20} />
                </ActionIcon>
              </Tooltip>
            </Group>
            <Group>
              <SegmentedControl
                size="xs"
                value={statusFilter}
                onChange={setStatusFilter}
                data={[
                  { value: 'all', label: 'All' },
                  { value: 'incomplete', label: 'Todo' },
                  { value: 'in_progress', label: 'In Progress' },
                  { value: 'complete', label: 'Done' },
                ]}
              />
              <Tooltip label="Search (Ctrl+K)">
                <ActionIcon variant="subtle" onClick={() => spotlight.open()} size="lg">
                  <IconSearch size={20} />
                </ActionIcon>
              </Tooltip>
              <Tooltip label="Fetch Canvas assignments">
                <ActionIcon variant="subtle" onClick={fetchCanvasAssignments} loading={loading} size="lg">
                  <IconRefresh size={20} />
                </ActionIcon>
              </Tooltip>
              <Tooltip label="Toggle theme (Ctrl+J)">
                <ActionIcon variant="subtle" onClick={toggleColorScheme} size="lg">
                  {colorScheme === 'dark' ? <IconSun size={20} /> : <IconMoon size={20} />}
                </ActionIcon>
              </Tooltip>
              <Tooltip label="Settings">
                <ActionIcon variant="subtle" onClick={() => setSettingsOpen(true)} size="lg">
                  <IconSettings size={20} />
                </ActionIcon>
              </Tooltip>
              {pendingItems.length > 0 && (
                <Badge color="red" variant="filled">
                  {pendingItems.length} pending
                </Badge>
              )}
            </Group>
          </Group>
        </AppShell.Header>

        <AppShell.Main>
          <Calendar
            currentDate={currentDate}
            events={filteredEvents}
            classes={classes}
            onEventClick={setSelectedEvent}
            onEventDrop={handleEventDrop}
            onDayDoubleClick={handleDayDoubleClick}
          />
        </AppShell.Main>

        <AppShell.Aside p="md">
          <PendingSidebar
            items={pendingItems}
            onApprove={openApprovalModal}
            onReject={handleReject}
          />
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
