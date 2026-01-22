import { useEffect, useRef } from "react";
import { notifyError, notifyUndo } from "../utils/notify.jsx";
import { removeStorageItem, setStorageJSON } from "../utils/storage";

const PENDING_CACHE_KEY = "canvas_pending_items";

export default function useApprovalFlow({
  api,
  events,
  setEvents,
  addEvent,
  replaceEvent,
  pendingItems,
  setPendingItems,
  approvalIndex,
  setApprovalIndex,
}) {
  const selectedCanvasIdRef = useRef(null);
  const approvalItem = approvalIndex >= 0 ? pendingItems[approvalIndex] : null;
  const pendingRejectsRef = useRef(new Map());
  const buildRestoreKey = () =>
    `restore-${Date.now()}-${Math.random().toString(16).slice(2)}`;

  useEffect(() => {
    if (approvalItem?.canvas_id) {
      selectedCanvasIdRef.current = approvalItem.canvas_id;
    }
  }, [approvalItem]);

  useEffect(() => {
    if (approvalIndex === -1) {
      selectedCanvasIdRef.current = null;
      return;
    }
    if (!pendingItems.length) {
      if (approvalIndex !== -1) {
        setApprovalIndex(-1);
      }
      selectedCanvasIdRef.current = null;
      return;
    }
    const selectedId = selectedCanvasIdRef.current;
    if (!selectedId) return;
    const nextIndex = pendingItems.findIndex(
      (item) => item.canvas_id === selectedId,
    );
    if (nextIndex === -1) {
      if (approvalIndex !== -1) {
        setApprovalIndex(-1);
      }
      selectedCanvasIdRef.current = null;
      return;
    }
    if (nextIndex !== approvalIndex) {
      setApprovalIndex(nextIndex);
    }
  }, [approvalIndex, pendingItems, setApprovalIndex]);

  const handleApprove = async (item, formData) => {
    const previousPendingItems = pendingItems;
    const previousApprovalIndex = approvalIndex;
    const previousEvents = events;

    const tempId = `temp-${Date.now()}`;
    const optimisticEvent = {
      id: tempId,
      title: item.title,
      due_date: formData.dueDate || item.due_date,
      class_id: formData.classId ? parseInt(formData.classId) : null,
      event_type: formData.eventType,
      status: "incomplete",
      notes: formData.notes,
      url: formData.url || item.url,
      description: item.description ?? null,
      points_possible: item.points_possible ?? null,
      canvas_id: item.canvas_id,
      canvas_due_date_override: formData.canvas_due_date_override ?? 0,
    };

    addEvent(optimisticEvent);

    const remaining = pendingItems.filter(
      (p) => p.canvas_id !== item.canvas_id,
    );
    setPendingItems(remaining);

    if (remaining.length > 0) {
      setStorageJSON(PENDING_CACHE_KEY, remaining);
      const nextIndex =
        approvalIndex >= remaining.length
          ? remaining.length - 1
          : approvalIndex;
      setApprovalIndex(nextIndex);
      selectedCanvasIdRef.current = remaining[nextIndex]?.canvas_id ?? null;
    } else {
      removeStorageItem(PENDING_CACHE_KEY);
      setApprovalIndex(-1);
      selectedCanvasIdRef.current = null;
    }

    try {
      const newEvent = await api("/events", {
        method: "POST",
        body: JSON.stringify({
          title: item.title,
          description: item.description ?? null,
          due_date: formData.dueDate || item.due_date,
          class_id: formData.classId ? parseInt(formData.classId) : null,
          event_type: formData.eventType,
          status: "incomplete",
          notes: formData.notes,
          url: formData.url || item.url,
          points_possible: item.points_possible ?? null,
          canvas_id: item.canvas_id,
          canvas_due_date_override: formData.canvas_due_date_override ?? 0,
        }),
      });
      replaceEvent(tempId, newEvent);
    } catch (err) {
      console.error("Failed to approve item:", err);
      notifyError(err.message || "Failed to approve item.");
      setEvents(previousEvents);
      setPendingItems(previousPendingItems);
      setStorageJSON(PENDING_CACHE_KEY, previousPendingItems);
      setApprovalIndex(previousApprovalIndex);
    }
  };

  const handleReject = async (item) => {
    const previousPendingItems = pendingItems;
    const previousApprovalIndex = approvalIndex;

    const removedIndex = pendingItems.findIndex(
      (p) => p.canvas_id === item.canvas_id,
    );
    const remaining = pendingItems.filter(
      (p) => p.canvas_id !== item.canvas_id,
    );
    setPendingItems(remaining);

    if (remaining.length > 0) {
      setStorageJSON(PENDING_CACHE_KEY, remaining);
      const nextIndex =
        approvalIndex >= remaining.length
          ? remaining.length - 1
          : approvalIndex;
      setApprovalIndex(nextIndex);
      selectedCanvasIdRef.current = remaining[nextIndex]?.canvas_id ?? null;
    } else {
      removeStorageItem(PENDING_CACHE_KEY);
      setApprovalIndex(-1);
      selectedCanvasIdRef.current = null;
    }

    const timeoutId = setTimeout(async () => {
      try {
        await api("/rejected", {
          method: "POST",
          body: JSON.stringify({ canvas_id: item.canvas_id }),
        });
      } catch (err) {
        console.error("Failed to reject item:", err);
        notifyError(err.message || "Failed to reject item.");
        setPendingItems(previousPendingItems);
        setStorageJSON(PENDING_CACHE_KEY, previousPendingItems);
        setApprovalIndex(previousApprovalIndex);
      } finally {
        pendingRejectsRef.current.delete(item.canvas_id);
      }
    }, 7000);

    pendingRejectsRef.current.set(item.canvas_id, {
      timeoutId,
      item,
      index: removedIndex,
    });

    notifyUndo({
      title: `Rejected "${item.title}"`,
      message: "Item has been rejected.",
      onUndo: () => {
        const pending = pendingRejectsRef.current.get(item.canvas_id);
        if (!pending) return;
        clearTimeout(pending.timeoutId);
        pendingRejectsRef.current.delete(item.canvas_id);
        let restoredIndex = null;
        let restoredId = null;
        setPendingItems((prev) => {
          if (prev.some((p) => p.canvas_id === item.canvas_id)) {
            return prev;
          }
          const restoredItem = {
            ...pending.item,
            _pendingKey: buildRestoreKey(),
          };
          const next = [...prev];
          const insertIndex =
            pending.index >= 0
              ? Math.min(pending.index, next.length)
              : next.length;
          next.splice(insertIndex, 0, restoredItem);
          setStorageJSON(PENDING_CACHE_KEY, next);
          restoredIndex = insertIndex;
          restoredId = restoredItem.canvas_id;
          return next;
        });
        if (restoredIndex !== null) {
          setApprovalIndex(restoredIndex);
          selectedCanvasIdRef.current = restoredId;
        }
      },
    });
  };

  const openApprovalModal = (item) => {
    const index = pendingItems.findIndex((p) => p.canvas_id === item.canvas_id);
    selectedCanvasIdRef.current = item.canvas_id;
    setApprovalIndex(index);
  };

  const navigateApproval = (direction) => {
    const newIndex = approvalIndex + direction;
    if (newIndex >= 0 && newIndex < pendingItems.length) {
      setApprovalIndex(newIndex);
    }
  };

  return {
    approvalItem,
    handleApprove,
    handleReject,
    openApprovalModal,
    navigateApproval,
  };
}
