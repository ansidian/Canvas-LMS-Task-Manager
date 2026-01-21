export const getStorageItem = (key, fallback = null) => {
  try {
    const value = localStorage.getItem(key);
    return value === null ? fallback : value;
  } catch (err) {
    console.warn("Failed to read localStorage:", err);
    return fallback;
  }
};

export const setStorageItem = (key, value) => {
  try {
    localStorage.setItem(key, value);
  } catch (err) {
    console.warn("Failed to write localStorage:", err);
  }
};

export const removeStorageItem = (key) => {
  try {
    localStorage.removeItem(key);
  } catch (err) {
    console.warn("Failed to remove localStorage item:", err);
  }
};

export const getStorageJSON = (key, fallback = null) => {
  const raw = getStorageItem(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw);
  } catch (err) {
    console.warn("Failed to parse localStorage JSON:", err);
    return fallback;
  }
};

export const setStorageJSON = (key, value) => {
  try {
    setStorageItem(key, JSON.stringify(value));
  } catch (err) {
    console.warn("Failed to serialize localStorage JSON:", err);
  }
};
