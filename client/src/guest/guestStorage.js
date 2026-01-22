import {
  getStorageItem,
  setStorageItem,
  removeStorageItem,
  getStorageJSON,
  setStorageJSON,
} from "../utils/storage";

export const GUEST_STORAGE_KEYS = {
  sessionId: "guest_session_id",
  sessionCreatedAt: "guest_session_created_at",
  sessionLastActiveAt: "guest_session_last_active_at",
  events: "guest_events",
  classes: "guest_classes",
  settings: "guest_settings",
  rejectedItems: "guest_rejected_items",
  pendingItems: "guest_pending_items",
  lastFetchTimestamp: "guest_last_fetch_timestamp",
};

const DEFAULT_SETTINGS = {
  unassigned_color: "#a78b71",
  canvas_url: "",
  canvas_token: "",
};

const normalizeArray = (value) => (Array.isArray(value) ? value : []);

const normalizeTimestamp = (value) => {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
};

export const getGuestEvents = () =>
  normalizeArray(getStorageJSON(GUEST_STORAGE_KEYS.events, []));

export const setGuestEvents = (events = []) => {
  setStorageJSON(GUEST_STORAGE_KEYS.events, normalizeArray(events));
};

export const getGuestClasses = () =>
  normalizeArray(getStorageJSON(GUEST_STORAGE_KEYS.classes, []));

export const setGuestClasses = (classes = []) => {
  setStorageJSON(GUEST_STORAGE_KEYS.classes, normalizeArray(classes));
};

export const getGuestSettings = () => {
  const saved = getStorageJSON(GUEST_STORAGE_KEYS.settings, null);
  return { ...DEFAULT_SETTINGS, ...(saved || {}) };
};

export const setGuestSettings = (settings = {}) => {
  setStorageJSON(GUEST_STORAGE_KEYS.settings, {
    ...DEFAULT_SETTINGS,
    ...settings,
  });
};

export const getGuestRejectedItems = () =>
  normalizeArray(getStorageJSON(GUEST_STORAGE_KEYS.rejectedItems, []));

export const setGuestRejectedItems = (items = []) => {
  setStorageJSON(GUEST_STORAGE_KEYS.rejectedItems, normalizeArray(items));
};

export const getGuestPendingItems = () =>
  normalizeArray(getStorageJSON(GUEST_STORAGE_KEYS.pendingItems, []));

export const setGuestPendingItems = (items = []) => {
  setStorageJSON(GUEST_STORAGE_KEYS.pendingItems, normalizeArray(items));
};

export const getGuestLastFetchTimestamp = () =>
  normalizeTimestamp(getStorageItem(GUEST_STORAGE_KEYS.lastFetchTimestamp));

export const setGuestLastFetchTimestamp = (timestamp) => {
  if (timestamp === null || timestamp === undefined) {
    removeStorageItem(GUEST_STORAGE_KEYS.lastFetchTimestamp);
    return;
  }
  setStorageItem(GUEST_STORAGE_KEYS.lastFetchTimestamp, String(timestamp));
};

export const clearGuestData = () => {
  removeStorageItem(GUEST_STORAGE_KEYS.events);
  removeStorageItem(GUEST_STORAGE_KEYS.classes);
  removeStorageItem(GUEST_STORAGE_KEYS.rejectedItems);
  removeStorageItem(GUEST_STORAGE_KEYS.pendingItems);
  removeStorageItem(GUEST_STORAGE_KEYS.lastFetchTimestamp);
};
