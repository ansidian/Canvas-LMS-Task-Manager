import { notifyError, notifySuccess } from "../utils/notify.jsx";
import { getStorageItem, setStorageItem } from "../utils/storage";

export default function useSettingsApi({
  api,
  isGuest = false,
  resetGuestSession,
  onClassesChange,
  onEventsChange,
  onClassUpdate,
  onCanvasAuthErrorClear,
  setResetting,
  setShowResetConfirm,
  setSaveSuccess,
  setNewClassName,
  setNewClassColor,
  setEditingClassId,
  setEditName,
  setEditColor,
  setDeleting,
  setDeleteClassId,
  setEditingUnassigned,
  setEditUnassignedColor,
  onUnassignedColorChange,
  unassignedColor,
  canvasUrl,
  canvasToken,
  todoistToken,
  todoistSaveSuccess,
  setTodoistSaveSuccess,
  discordWebhook,
  setDiscordSaveSuccess,
  setSavedDiscordWebhook,
  resetOnboarding,
}) {
  const handleResetData = async () => {
    setResetting(true);
    try {
      await api("/reset-data", { method: "POST" });

      if (isGuest) {
        if (typeof resetGuestSession === "function") {
          resetGuestSession();
        }
        window.location.reload();
        return;
      }

      // Clear localStorage (except onboarding status)
      const hasCompletedOnboarding = getStorageItem("hasCompletedOnboarding");

      localStorage.clear();

      // Restore preserved items
      if (hasCompletedOnboarding) {
        setStorageItem("hasCompletedOnboarding", hasCompletedOnboarding);
      }

      // Reload to refresh state
      window.location.reload();
    } catch (err) {
      console.error("Failed to reset data:", err);
      notifyError(err.message || "Failed to reset data.");
      setResetting(false);
      setShowResetConfirm(false);
    }
  };

  const saveCanvasSettings = async () => {
    try {
      const trimmedUrl = canvasUrl?.trim() || "";
      const trimmedToken = canvasToken?.trim() || "";
      const bothEmpty = !trimmedUrl && !trimmedToken;
      const bothFilled = trimmedUrl && trimmedToken;

      if (!bothEmpty && !bothFilled) {
        notifyError("Provide both Canvas URL and token, or clear both to disconnect.");
        return;
      }

      await api("/settings", {
        method: "PATCH",
        body: JSON.stringify({
          canvas_url: trimmedUrl,
          canvas_token: trimmedToken,
        }),
      });
      onCanvasAuthErrorClear?.();

      setSaveSuccess(true);
      notifySuccess(bothEmpty ? "Canvas disconnected." : "Canvas settings saved.");
      setTimeout(() => setSaveSuccess(false), 1500);
    } catch (err) {
      console.error("Failed to save Canvas settings:", err);
      notifyError(err.message || "Failed to save Canvas settings.");
    }
  };

  const saveAutoApproveCanvas = async (value) => {
    try {
      await api("/settings", {
        method: "PATCH",
        body: JSON.stringify({ auto_approve_canvas: value }),
      });
    } catch (err) {
      console.error("Failed to save auto-approve setting:", err);
      notifyError(err.message || "Failed to update auto-approve setting.");
      throw err;
    }
  };

  const saveTodoistSettings = async () => {
    try {
      const trimmed = todoistToken?.trim() || "";
      await api("/settings", {
        method: "PATCH",
        body: JSON.stringify({ todoist_token: trimmed }),
      });
      setTodoistSaveSuccess(true);
      notifySuccess(trimmed ? "Todoist settings saved." : "Todoist disconnected.");
      setTimeout(() => setTodoistSaveSuccess(false), 1500);
    } catch (err) {
      console.error("Failed to save Todoist settings:", err);
      notifyError(err.message || "Failed to save Todoist settings.");
    }
  };

  const addClass = async (newClassName, newClassColor) => {
    if (!newClassName.trim()) return;
    try {
      await api("/classes", {
        method: "POST",
        body: JSON.stringify({
          name: newClassName.trim(),
          color: newClassColor,
        }),
      });
      setNewClassName("");
      setNewClassColor("#228be6");
      await onClassesChange();
    } catch (err) {
      console.error("Failed to add class:", err);
      notifyError(err.message || "Failed to add class.");
    }
  };

  const deleteClass = async (id) => {
    setDeleting(true);
    try {
      await api(`/classes/${id}`, { method: "DELETE" });
      setDeleteClassId(null);
      await onClassesChange();
      onEventsChange();
    } catch (err) {
      console.error("Failed to delete class:", err);
      notifyError(err.message || "Failed to delete class.");
    } finally {
      setDeleting(false);
    }
  };

  const startEditing = (cls) => {
    setEditingClassId(cls.id);
    setEditName(cls.name);
    setEditColor(cls.color);
  };

  const cancelEditing = () => {
    setEditingClassId(null);
    setEditName("");
    setEditColor("");
  };

  const saveEdit = async (editingClassId, editName, editColor) => {
    if (!editName.trim()) return;
    try {
      await api(`/classes/${editingClassId}`, {
        method: "PATCH",
        body: JSON.stringify({ name: editName.trim(), color: editColor }),
      });
      setEditingClassId(null);
      await onClassesChange();
    } catch (err) {
      console.error("Failed to update class:", err);
      notifyError(err.message || "Failed to update class.");
    }
  };

  const toggleSync = async (cls) => {
    const newSyncState = !cls.is_synced;

    onClassUpdate({ ...cls, is_synced: newSyncState ? 1 : 0 });

    try {
      await api(`/classes/${cls.id}`, {
        method: "PATCH",
        body: JSON.stringify({ is_synced: newSyncState }),
      });
    } catch (err) {
      // Revert on error
      console.error("Failed to toggle sync:", err);
      notifyError(err.message || "Failed to update sync status.");
      onClassUpdate(cls);
    }
  };

  const startEditingUnassigned = () => {
    setEditingUnassigned(true);
    setEditUnassignedColor(unassignedColor);
  };

  const cancelEditingUnassigned = () => {
    setEditingUnassigned(false);
    setEditUnassignedColor("");
  };

  const saveUnassignedColor = async (editUnassignedColor) => {
    if (!editUnassignedColor) return;

    // Optimistic update
    const previousColor = unassignedColor;
    onUnassignedColorChange(editUnassignedColor);
    setEditingUnassigned(false);

    try {
      await api("/settings", {
        method: "PATCH",
        body: JSON.stringify({ unassigned_color: editUnassignedColor }),
      });
    } catch (err) {
      // Revert on error
      console.error("Failed to update unassigned color:", err);
      notifyError(err.message || "Failed to update unassigned color.");
      onUnassignedColorChange(previousColor);
    }
  };

  const saveDiscordWebhook = async () => {
    try {
      const trimmed = discordWebhook?.trim() || "";
      await api("/settings", {
        method: "PATCH",
        body: JSON.stringify({ discord_webhook: trimmed }),
      });
      setSavedDiscordWebhook(trimmed);
      setDiscordSaveSuccess(true);
      notifySuccess(trimmed ? "Discord webhook saved." : "Discord webhook cleared.");
      setTimeout(() => setDiscordSaveSuccess(false), 1500);
    } catch (err) {
      console.error("Failed to save Discord webhook:", err);
      notifyError(err.message || "Failed to save Discord webhook.");
    }
  };

  const testWebhook = async () => {
    const res = await api("/reminders/test", { method: "POST" });
    return res;
  };

  return {
    resetOnboarding,
    handleResetData,
    saveCanvasSettings,
    saveAutoApproveCanvas,
    saveTodoistSettings,
    saveDiscordWebhook,
    testWebhook,
    addClass,
    deleteClass,
    startEditing,
    cancelEditing,
    saveEdit,
    toggleSync,
    startEditingUnassigned,
    cancelEditingUnassigned,
    saveUnassignedColor,
  };
}
