// assets/js/app/i18n.js

import { EventBus } from "../shared/utils/events.js";
import {
  saveToStorage,
  loadFromStorage,
  StorageKeys,
} from "../shared/utils/storage.js";
import { getByPath } from "../shared/utils/i18n-path.js";

/**
 * Gestión de idioma
 * Refactorizado de language-ui.js original
 */

const LANG = {
  ES: "es",
  EN: "en",
};

const LANG_ICONS = {
  black: "assets/icons/change-lang_black.png",
  white: "assets/icons/change-lang_white.png",
};

const I18N_CACHE = new Map();
let CURRENT_DICT = null;

let spentObserver = null;

export function initI18n() {
  const langWrap = document.querySelector(".lang");
  const btn = document.getElementById("lang-button");
  const menu = document.getElementById("lang-menu");
  const langIcon = document.querySelector(".lang__icon");

  if (!langWrap || !btn || !menu) return;

  const initialLang = getStoredLang();
  updateLangIcon(langIcon);
  setLanguage(initialLang);

  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    const isOpen = langWrap.classList.contains("is-open");

    if (isOpen) {
      closeMenu(langWrap, btn);
    } else {
      openMenu(langWrap, btn);
    }
  });

  menu.addEventListener("click", (e) => {
    const item = e.target.closest("[data-lang]");
    if (!item) return;

    const nextLang = item.getAttribute("data-lang");
    if (nextLang !== LANG.ES && nextLang !== LANG.EN) return;

    closeMenu(langWrap, btn);
    setLanguage(nextLang);
  });

  // Click fuera cierra
  document.addEventListener("click", (e) => {
    if (!langWrap.contains(e.target)) {
      closeMenu(langWrap, btn);
    }
  });

  // Pulsar ESC cierra
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeMenu(langWrap, btn);
    }
  });

  // Actualizar icono al cambiar tema
  EventBus.on("theme:changed", () => updateLangIcon(langIcon));

  window.addEventListener("i18n:placeholders:update", () => {
    if (CURRENT_DICT) applyPlaceholders(CURRENT_DICT);
  });

  setupTotalSpentObserver();

  EventBus.on("game:changed", ({ gameId } = {}) => {
    if (!CURRENT_DICT) return;
    if (String(gameId || "") === "quinigol") return;
    enforceSelectNumbersTitle(CURRENT_DICT);
  });
}

function getStoredLang() {
  const v = loadFromStorage(StorageKeys.LANGUAGE);
  if (v === LANG.ES || v === LANG.EN) return v;

  const nav =
    (Array.isArray(navigator.languages) && navigator.languages[0]) ||
    navigator.language ||
    "";

  return String(nav).toLowerCase().startsWith("es") ? LANG.ES : LANG.EN;
}

async function setLanguage(lang) {
  saveToStorage(StorageKeys.LANGUAGE, lang);
  document.documentElement.lang = lang === LANG.EN ? "en" : "es";
  document.body.dataset.lang = lang;

  const current = document.getElementById("lang-current");
  if (current) {
    current.textContent = lang === LANG.EN ? "EN" : "ES";
  }

  try {
    const dict = await loadI18n(lang);
    CURRENT_DICT = dict;

    applyI18n(dict);
    applyPlaceholders(dict);

    if (document.body.dataset.game !== "quinigol") {
      enforceSelectNumbersTitle(dict);
    }

    EventBus.emit("lang:changed", { lang, dict });
  } catch (e) {
    console.warn("Error cargando/aplicando i18n:", e);
  }
}

async function loadI18n(lang) {
  const timestamp = Date.now();
  const url = `assets/i18n/${lang}.json?v=${timestamp}`;
  const res = await fetch(url, { cache: "no-store" });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status} cargando ${url}`);
  }

  const dict = await res.json();
  I18N_CACHE.set(lang, dict);

  return dict;
}

function applyI18n(dict) {
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    const value = getByPath(dict, key);

    if (typeof value === "string") {
      el.textContent = value;
    } else if (Array.isArray(value)) {
      renderArrayAsList(el, value);
    }
  });

  document.querySelectorAll("[data-i18n-aria]").forEach((el) => {
    const key = el.getAttribute("data-i18n-aria");
    const value = getByPath(dict, key);
    if (typeof value === "string") {
      el.setAttribute("aria-label", value);
    }
  });

  document.querySelectorAll("[data-i18n-title]").forEach((el) => {
    const key = el.getAttribute("data-i18n-title");
    const value = getByPath(dict, key);
    if (typeof value === "string") {
      el.setAttribute("title", value);
    }
  });

  document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
    const key = el.getAttribute("data-i18n-placeholder");
    const value = getByPath(dict, key);
    if (typeof value === "string") {
      el.setAttribute("placeholder", value);
    }
  });
}

function enforceSelectNumbersTitle(dict) {
  const h2 = document.getElementById("select-numbers-title");
  if (!h2) return;

  const expectedKey = "ui.sections.selectNumbers";

  const currentKey = h2.getAttribute("data-i18n");
  if (currentKey !== expectedKey) {
    h2.setAttribute("data-i18n", expectedKey);
  }

  const value = getByPath(dict, expectedKey);
  if (typeof value === "string" && value.trim()) {
    h2.textContent = value;
  }
}

function renderArrayAsList(el, arr) {
  const safe = arr.filter((x) => typeof x === "string");
  el.innerHTML = safe.map((line) => `<p>${escapeHtml(line)}</p>`).join("");
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function openMenu(langWrap, btn) {
  langWrap.classList.add("is-open");
  btn.setAttribute("aria-expanded", "true");
}

function closeMenu(langWrap, btn) {
  langWrap.classList.remove("is-open");
  btn.setAttribute("aria-expanded", "false");
}

function updateLangIcon(langIconEl) {
  if (!langIconEl) return;

  const theme = document.body.getAttribute("data-theme") || "light";
  langIconEl.src = theme === "dark" ? LANG_ICONS.white : LANG_ICONS.black;
}

export function getCurrentI18nDict() {
  return CURRENT_DICT;
}

export function t(path, fallback = "") {
  const v = CURRENT_DICT ? getByPath(CURRENT_DICT, path) : undefined;
  return typeof v === "string" ? v : fallback;
}

export function tAny(path, fallback = null) {
  const v = CURRENT_DICT ? getByPath(CURRENT_DICT, path) : undefined;
  return v !== undefined ? v : fallback;
}

export function refreshI18nPlaceholders() {
  if (CURRENT_DICT) applyPlaceholders(CURRENT_DICT);
}

function applyPlaceholders(dict) {
  const totalSpentEl = document.getElementById("total-spent");
  const totalSpentText =
    totalSpentEl && totalSpentEl.textContent
      ? totalSpentEl.textContent.trim()
      : "—";

  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    const value = getByPath(dict, key);

    if (typeof value !== "string") return;
    if (!value.includes("{")) return;

    const rendered = value.replaceAll("{totalSpent}", totalSpentText);
    el.textContent = rendered;
  });
}

function setupTotalSpentObserver() {
  if (spentObserver) return;

  const el = document.getElementById("total-spent");
  if (!el) return;

  spentObserver = new MutationObserver(() => {
    if (!CURRENT_DICT) return;
    applyPlaceholders(CURRENT_DICT);
  });

  spentObserver.observe(el, {
    childList: true,
    characterData: true,
    subtree: true,
  });
}
