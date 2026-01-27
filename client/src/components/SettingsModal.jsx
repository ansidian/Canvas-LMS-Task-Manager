import { useEffect } from "react";
import useSettingsModalState from "../hooks/useSettingsModalState";
import { Modal, Tabs } from "@mantine/core";
import SettingsCanvasTab from "./settings/SettingsCanvasTab";
import SettingsClassesTab from "./settings/SettingsClassesTab";
import SettingsHelpTab from "./settings/SettingsHelpTab";
import useSettingsApi from "../hooks/useSettingsApi";
import { notifyError } from "../utils/notify.jsx";
import { removeStorageItem } from "../utils/storage";

export default function SettingsModal({
  opened,
  onClose,
  api,
  isGuest = false,
  resetGuestSession,
  classes,
  onClassesChange,
  onEventsChange,
  onClassesReorder,
  onClassUpdate,
  highlightCredentials = false,
  onHighlightClear,
  canvasAuthError,
  onCanvasAuthErrorClear,
  unassignedColor = "#a78b71",
  onUnassignedColorChange,
}) {
  const {
    canvasUrl,
    setCanvasUrl,
    canvasToken,
    setCanvasToken,
    newClassName,
    setNewClassName,
    newClassColor,
    setNewClassColor,
    editingClassId,
    setEditingClassId,
    editName,
    setEditName,
    editColor,
    setEditColor,
    saveSuccess,
    setSaveSuccess,
    editingUnassigned,
    setEditingUnassigned,
    editUnassignedColor,
    setEditUnassignedColor,
    showResetConfirm,
    setShowResetConfirm,
    resetting,
    setResetting,
    deleteClassId,
    setDeleteClassId,
    deleting,
    setDeleting,
  } = useSettingsModalState({
    opened,
    highlightCredentials,
    onHighlightClear,
  });

  const resetOnboarding = () => {
    removeStorageItem("hasCompletedOnboarding");
    onClose();
    // Reload to trigger tour
    window.location.reload();
  };

  const settingsApi = useSettingsApi({
    api,
    isGuest,
    resetGuestSession,
    onClassesChange,
    onEventsChange,
    onClassUpdate,
    onCanvasAuthErrorClear,
    onClose,
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
  });

  useEffect(() => {
    if (!opened) return;
    let cancelled = false;
    api("/settings")
      .then((data) => {
        if (cancelled) return;
        setCanvasUrl(data.canvas_url || "");
        setCanvasToken(data.canvas_token || "");
      })
      .catch((err) => {
        console.error("Failed to load Canvas settings:", err);
        notifyError(err.message || "Failed to load Canvas settings.");
      });
    return () => {
      cancelled = true;
    };
  }, [api, opened, setCanvasToken, setCanvasUrl]);

  return (
    <Modal opened={opened} onClose={onClose} title="Settings" size="lg">
      <Tabs defaultValue="canvas">
        <Tabs.List style={{ borderBottom: '1px solid var(--rule)' }}>
          <Tabs.Tab value="canvas">Canvas API</Tabs.Tab>
          <Tabs.Tab value="classes">Classes</Tabs.Tab>
          <Tabs.Tab value="help">Help</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="canvas" pt={16}>
          <SettingsCanvasTab
            config={{
              canvasUrl,
              canvasToken,
              highlightCredentials,
              canvasAuthError,
              saveSuccess,
            }}
            handlers={{
              setCanvasUrl,
              setCanvasToken,
              saveCanvasSettings: settingsApi.saveCanvasSettings,
              onCanvasAuthErrorClear,
            }}
          />
        </Tabs.Panel>

        <Tabs.Panel value="classes" pt={16}>
          <SettingsClassesTab
            config={{
              classes,
              newClassName,
              newClassColor,
              editingClassId,
              editName,
              editColor,
              editingUnassigned,
              editUnassignedColor,
              deleteClassId,
              deleting,
              unassignedColor,
            }}
            handlers={{
              setNewClassName,
              setNewClassColor,
              addClass: () => settingsApi.addClass(newClassName, newClassColor),
              startEditing: settingsApi.startEditing,
              cancelEditing: settingsApi.cancelEditing,
              saveEdit: () =>
                settingsApi.saveEdit(editingClassId, editName, editColor),
              setEditName,
              setEditColor,
              toggleSync: settingsApi.toggleSync,
              setDeleteClassId,
              deleteClass: settingsApi.deleteClass,
              startEditingUnassigned: settingsApi.startEditingUnassigned,
              cancelEditingUnassigned: settingsApi.cancelEditingUnassigned,
              setEditUnassignedColor,
              saveUnassignedColor: () =>
                settingsApi.saveUnassignedColor(editUnassignedColor),
              onClassesReorder,
            }}
          />
        </Tabs.Panel>

        <Tabs.Panel value="help" pt={16}>
          <SettingsHelpTab
            config={{ showResetConfirm, resetting, isGuest }}
            handlers={{
              resetOnboarding: settingsApi.resetOnboarding,
              handleResetData: settingsApi.handleResetData,
              setShowResetConfirm,
            }}
          />
        </Tabs.Panel>
      </Tabs>
    </Modal>
  );
}
