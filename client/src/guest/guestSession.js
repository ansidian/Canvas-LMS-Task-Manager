import {
  getStorageItem,
  setStorageItem,
  removeStorageItem,
} from "../utils/storage";
import { clearGuestData, GUEST_STORAGE_KEYS } from "./guestStorage";

const parseTimestamp = (value) => {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
};

export const getGuestSession = () => {
  const id = getStorageItem(GUEST_STORAGE_KEYS.sessionId, null);
  if (!id) return null;

  return {
    id,
    createdAt: parseTimestamp(
      getStorageItem(GUEST_STORAGE_KEYS.sessionCreatedAt, null),
    ),
    lastActiveAt: parseTimestamp(
      getStorageItem(GUEST_STORAGE_KEYS.sessionLastActiveAt, null),
    ),
  };
};

export const createGuestSession = () => {
  const id = crypto.randomUUID();
  const now = Date.now();
  setStorageItem(GUEST_STORAGE_KEYS.sessionId, id);
  setStorageItem(GUEST_STORAGE_KEYS.sessionCreatedAt, String(now));
  setStorageItem(GUEST_STORAGE_KEYS.sessionLastActiveAt, String(now));
  return { id, createdAt: now, lastActiveAt: now };
};

export const touchGuestSession = () => {
  const existing = getGuestSession();
  if (!existing?.id) {
    return createGuestSession();
  }
  const now = Date.now();
  if (!existing.createdAt) {
    setStorageItem(GUEST_STORAGE_KEYS.sessionCreatedAt, String(now));
  }
  setStorageItem(GUEST_STORAGE_KEYS.sessionLastActiveAt, String(now));
  return {
    id: existing.id,
    createdAt: existing.createdAt ?? now,
    lastActiveAt: now,
  };
};

export const resetGuestSession = () => {
  clearGuestData();
  removeStorageItem(GUEST_STORAGE_KEYS.sessionId);
  removeStorageItem(GUEST_STORAGE_KEYS.sessionCreatedAt);
  removeStorageItem(GUEST_STORAGE_KEYS.sessionLastActiveAt);
  return createGuestSession();
};
