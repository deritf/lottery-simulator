// assets/js/app/theme.js

import { EventBus } from "../shared/utils/events.js";
import {
  saveToStorage,
  loadFromStorage,
  StorageKeys,
} from "../shared/utils/storage.js";

/**
 * Gestión de tema claro/oscuro
 */

const THEMES = {
  LIGHT: "light",
  DARK: "dark",
};

const ICONS = {
  moonBlack: "assets/icons/dark-theme_black.png",
  moonWhite: "assets/icons/dark-theme_white.png",
  sunBlack: "assets/icons/light-theme_black.png",
  sunWhite: "assets/icons/light-theme_white.png",
};

export function initTheme() {
  const btn = document.getElementById("theme-button");
  const icon = document.getElementById("theme-icon");

  const initialTheme = getStoredTheme() || getPreferredTheme();
  applyTheme(initialTheme);
  updateThemeIcon(icon, initialTheme);

  if (!btn) return;

  btn.addEventListener("click", () => {
    const current = document.body.getAttribute("data-theme") || THEMES.LIGHT;
    const next = current === THEMES.DARK ? THEMES.LIGHT : THEMES.DARK;

    applyTheme(next);
    updateThemeIcon(icon, next);

    EventBus.emit("theme:changed", { theme: next });
  });
}

function getStoredTheme() {
  const stored = loadFromStorage(StorageKeys.THEME);
  return stored === THEMES.DARK || stored === THEMES.LIGHT ? stored : null;
}

function getPreferredTheme() {
  if (
    window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
  ) {
    return THEMES.DARK;
  }
  return THEMES.LIGHT;
}

function applyTheme(theme) {
  document.body.setAttribute("data-theme", theme);
  saveToStorage(StorageKeys.THEME, theme);
}

function updateThemeIcon(themeIconEl, currentTheme) {
  if (!themeIconEl) return;

  const isDark = currentTheme === THEMES.DARK;

  if (currentTheme === THEMES.LIGHT) {
    themeIconEl.src = ICONS.moonBlack;
  } else {
    themeIconEl.src = ICONS.sunWhite;
  }
}
