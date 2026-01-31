// assets/js/shared/utils/storage.js

const STORAGE_PREFIX = "lottery_sim_";

export function saveToStorage(key, value) {
  try {
    const fullKey = STORAGE_PREFIX + key;
    const serialized = JSON.stringify(value);
    localStorage.setItem(fullKey, serialized);
    return true;
  } catch (error) {
    console.warn(`Error guardando en localStorage (${key}):`, error);
    return false;
  }
}

export function loadFromStorage(key, defaultValue = null) {
  try {
    const fullKey = STORAGE_PREFIX + key;
    const serialized = localStorage.getItem(fullKey);
    if (serialized === null) return defaultValue;
    return JSON.parse(serialized);
  } catch (error) {
    console.warn(`Error cargando de localStorage (${key}):`, error);
    return defaultValue;
  }
}

export function removeFromStorage(key) {
  try {
    const fullKey = STORAGE_PREFIX + key;
    localStorage.removeItem(fullKey);
    return true;
  } catch (error) {
    console.warn(`Error eliminando de localStorage (${key}):`, error);
    return false;
  }
}

export function clearAllStorage() {
  try {
    const keys = Object.keys(localStorage);
    keys.forEach((key) => {
      if (key.startsWith(STORAGE_PREFIX)) {
        localStorage.removeItem(key);
      }
    });
    return true;
  } catch (error) {
    console.warn("Error limpiando localStorage:", error);
    return false;
  }
}

export function isStorageAvailable() {
  try {
    const test = "__storage_test__";
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch {
    return false;
  }
}

export const StorageKeys = {
  THEME: "theme",
  LANGUAGE: "lang",
  LAST_GAME: "last_game",
};
