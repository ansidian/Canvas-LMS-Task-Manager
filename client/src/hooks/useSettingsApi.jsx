import { notifyError, notifySuccess } from "../utils/notify.jsx";
import { getStorageItem, setStorageItem } from "../utils/storage";

export default function useSettingsApi({
  api,
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
  resetOnboarding,
}) {
  const handleResetData = async () => {
    setResetting(true);
    try {
      await api("/reset-data", { method: "POST" });

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
      if (!canvasUrl?.trim() || !canvasToken?.trim()) {
        notifyError("Canvas URL and token are required.");
        return;
      }
      await api("/settings", {
        method: "PATCH",
        body: JSON.stringify({
          canvas_url: canvasUrl.trim(),
          canvas_token: canvasToken.trim(),
        }),
      });
      onCanvasAuthErrorClear?.();

      // Show success feedback
      setSaveSuccess(true);
      notifySuccess("Canvas settings saved.");
      setTimeout(() => setSaveSuccess(false), 1500);
    } catch (err) {
      console.error("Failed to save Canvas settings:", err);
      notifyError(err.message || "Failed to save Canvas settings.");
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
      onClassesChange();
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
      onClassesChange();
      onEventsChange();
    } catch (err) {
      console.error("Failed to delete class:", err);
      notifyError(err.message || "Failed to delete class.");
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
      onClassesChange();
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

  return {
    resetOnboarding,
    handleResetData,
    saveCanvasSettings,
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
