import { useEffect, useState } from "react";
import useSettingsModalState from "../hooks/useSettingsModalState";
import { Modal, Tabs } from "@mantine/core";
import { motion, AnimatePresence } from "framer-motion";
import SettingsCanvasTab from "./settings/SettingsCanvasTab";
import SettingsTodoistTab from "./settings/SettingsTodoistTab";
import SettingsClassesTab from "./settings/SettingsClassesTab";
import SettingsHelpTab from "./settings/SettingsHelpTab";
import SettingsRemindersTab from "./settings/SettingsRemindersTab";
import SettingsApiKeyTab from "./settings/SettingsApiKeyTab";
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
    autoApproveCanvas,
    setAutoApproveCanvas,
    todoistToken,
    setTodoistToken,
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
    todoistSaveSuccess,
    setTodoistSaveSuccess,
    discordWebhook,
    setDiscordWebhook,
    savedDiscordWebhook,
    setSavedDiscordWebhook,
    discordSaveSuccess,
    setDiscordSaveSuccess,
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
    todoistToken,
    todoistSaveSuccess,
    setTodoistSaveSuccess,
    discordWebhook,
    setDiscordSaveSuccess,
    setSavedDiscordWebhook,
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
        setAutoApproveCanvas(Boolean(data.auto_approve_canvas));
        setTodoistToken(data.todoist_token || "");
        setDiscordWebhook(data.discord_webhook || "");
        setSavedDiscordWebhook(data.discord_webhook || "");
        setHasApiKey(Boolean(data.has_api_key));
      })
      .catch((err) => {
        console.error("Failed to load Canvas settings:", err);
        notifyError(err.message || "Failed to load Canvas settings.");
      });
    return () => {
      cancelled = true;
    };
  }, [api, opened, setCanvasToken, setCanvasUrl, setTodoistToken, setDiscordWebhook, setAutoApproveCanvas, setSavedDiscordWebhook]);

  const [activeTab, setActiveTab] = useState("canvas");
  const [hasApiKey, setHasApiKey] = useState(false);

  const panelContent = {
    canvas: (
      <SettingsCanvasTab
        config={{
          canvasUrl,
          canvasToken,
          autoApproveCanvas,
          highlightCredentials,
          canvasAuthError,
          saveSuccess,
          isGuest,
        }}
        handlers={{
          setCanvasUrl,
          setCanvasToken,
          setAutoApproveCanvas: async (value) => {
            setAutoApproveCanvas(value);
            try {
              await settingsApi.saveAutoApproveCanvas(value);
            } catch {
              setAutoApproveCanvas(!value);
            }
          },
          saveCanvasSettings: settingsApi.saveCanvasSettings,
          onCanvasAuthErrorClear,
        }}
      />
    ),
    todoist: (
      <SettingsTodoistTab
        config={{
          todoistToken,
          saveSuccess: todoistSaveSuccess,
        }}
        handlers={{
          setTodoistToken,
          saveTodoistSettings: settingsApi.saveTodoistSettings,
        }}
      />
    ),
    classes: (
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
    ),
    reminders: (
      <SettingsRemindersTab
        config={{
          discordWebhook,
          savedDiscordWebhook,
          saveSuccess: discordSaveSuccess,
        }}
        handlers={{
          setDiscordWebhook,
          saveDiscordWebhook: settingsApi.saveDiscordWebhook,
          testWebhook: settingsApi.testWebhook,
        }}
      />
    ),
    apikey: (
      <SettingsApiKeyTab api={api} hasApiKey={hasApiKey} onHasApiKeyChange={setHasApiKey} />
    ),
    help: (
      <SettingsHelpTab
        config={{ showResetConfirm, resetting, isGuest }}
        handlers={{
          resetOnboarding: settingsApi.resetOnboarding,
          handleResetData: settingsApi.handleResetData,
          setShowResetConfirm,
        }}
      />
    ),
  };

  return (
    <Modal opened={opened} onClose={onClose} title="Settings" size="lg">
      <Tabs value={activeTab} onChange={setActiveTab}>
        <Tabs.List style={{ borderBottom: '1px solid var(--rule)' }}>
          <Tabs.Tab value="canvas">Canvas API</Tabs.Tab>
          <Tabs.Tab value="todoist">Todoist</Tabs.Tab>
          <Tabs.Tab value="classes">Classes</Tabs.Tab>
          <Tabs.Tab value="reminders">Reminders</Tabs.Tab>
          <Tabs.Tab value="apikey">API Key</Tabs.Tab>
          <Tabs.Tab value="help">Help</Tabs.Tab>
        </Tabs.List>
      </Tabs>
      <div style={{ minHeight: 320 }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
            style={{ paddingTop: 16 }}
          >
            {panelContent[activeTab]}
          </motion.div>
        </AnimatePresence>
      </div>
    </Modal>
  );
}
