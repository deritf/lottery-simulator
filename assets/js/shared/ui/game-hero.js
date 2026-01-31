// assets/js/shared/ui/game-hero.js

import { EventBus } from "../utils/events.js";
import { getCurrentI18nDict } from "../../app/i18n.js";
import { getGame } from "../../games.registry.js";

/**
 * Gestiona el hero del juego (título, subtítulo, explicación, meta)
 * + Preview colapsado + Modal completo
 * + Secciones separadas para "extras" (Joker / El Millón)
 * + Secciones separadas para "draws" (p.ej. Lotería Nacional: Navidad/El Niño/Jueves/Sábado)
 * + Textos desde i18n
 * + Scroll lock al abrir modal
 */

let lastLnMeta = null;

export function initGameHero() {
  EventBus.on("game:changed", ({ game }) => updateHero(game));
  EventBus.on("lang:changed", ({ dict }) => updateHeroFromDict(dict));

  EventBus.on("ln:drawTypeChanged", (payload) => {
    lastLnMeta = payload || null;

    const dict = getCurrentI18nDict();
    if (!dict) return;

    const gameId = document.body.dataset.game || "primitiva";
    if (gameId !== "loteria-nacional") return;

    const game = getGame(gameId);
    if (game && game.enabled) updateMeta(game, dict);
  });

  const boot = () => {
    const dict = getCurrentI18nDict();
    if (!dict) return;

    const gameId = document.body.dataset.game || "primitiva";
    const game = getGame(gameId);

    if (game && game.enabled) {
      document.body.dataset.game = gameId;
      updateHero(game);
      return;
    }

    updateHeroFromDict(dict);
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
}

function updateHero(game) {
  const dict = getCurrentI18nDict();
  if (!dict) return;

  const gameId = game.id;
  const gameI18n = dict.games?.[gameId];

  if (!gameI18n) {
    console.warn(`No se encontró i18n para el juego: ${gameId}`);
    return;
  }

  const titleEl = document.getElementById("game-title");
  if (titleEl && gameI18n.hero?.title)
    titleEl.textContent = gameI18n.hero.title;

  const subtitleEl = document.getElementById("game-subtitle");
  if (subtitleEl && gameI18n.hero?.subtitle)
    subtitleEl.textContent = gameI18n.hero.subtitle;

  renderExplain(gameI18n.hero, dict);

  updateMeta(game, dict);
}

function updateHeroFromDict(dict) {
  const gameId = document.body.dataset.game || "primitiva";

  const gameI18n = dict.games?.[gameId];
  if (!gameI18n) return;

  const titleEl = document.getElementById("game-title");
  if (titleEl && gameI18n.hero?.title)
    titleEl.textContent = gameI18n.hero.title;

  const subtitleEl = document.getElementById("game-subtitle");
  if (subtitleEl && gameI18n.hero?.subtitle)
    subtitleEl.textContent = gameI18n.hero.subtitle;

  renderExplain(gameI18n.hero, dict);

  const game = getGame(gameId);
  if (game && game.enabled) updateMeta(game, dict);
}

/* =====================================================
   EXPLAIN + MODAL
   ===================================================== */

function renderExplain(hero, dict) {
  const explainEl = document.getElementById("game-explain");
  if (!explainEl) return;

  const explainLines = Array.isArray(hero?.explain) ? hero.explain : [];

  const hasJoker = hasExtraBlock(hero?.joker);
  const hasMillon = hasExtraBlock(hero?.millon);

  const drawsSections = buildDrawsSections(hero?.draws);
  const hasDraws = drawsSections.length > 0;

  if (!explainLines.length && !hasJoker && !hasMillon && !hasDraws) {
    explainEl.innerHTML = "";
    return;
  }

  const explainTitle = hero?.explainTitle || "Información";
  const moreBtnText = hero?.moreBtn || "Saber más";
  const closeBtnText = hero?.closeBtn || "Cerrar";

  const previewLines = explainLines.slice(0, 2);

  explainEl.innerHTML = `
    <div class="game-hero__explainTitle">${escapeHtml(explainTitle)}</div>

    <div class="game-hero__explainPreview" id="hero-explain-preview">
      ${previewLines.map((t) => `<p>${escapeHtml(t)}</p>`).join("")}
      <div class="game-hero__explainFade" aria-hidden="true"></div>
    </div>

    <div class="game-hero__explainActions">
      <button type="button" class="game-hero__moreBtn" id="hero-explain-more">
        ${escapeHtml(moreBtnText)}
      </button>
    </div>

    ${buildExplainModalHTML({
      explainTitle,
      closeBtnText,
      explainLines,
      drawsSections,
      extras: [
        { key: "joker", block: hero?.joker, fallbackTitle: "Joker" },
        { key: "millon", block: hero?.millon, fallbackTitle: "El Millón" },
      ],
    })}
  `;

  wireExplainModalHandlers({
    openBtnId: "hero-explain-more",
    modalId: "hero-explain-modal",
    closeBtnId: "hero-explain-close",
    backdropId: "hero-explain-backdrop",
  });
}

function hasExtraBlock(extra) {
  if (!extra) return false;
  const title = String(extra.title || "").trim();
  const lines = Array.isArray(extra.explain) ? extra.explain : [];
  return Boolean(title) || lines.length > 0;
}

/**
 * Convierte hero.draws en secciones renderizables.
 * Orden fijo pensado para Lotería Nacional; si hay otras claves, se añaden al final.
 */
function buildDrawsSections(draws) {
  if (!draws || typeof draws !== "object") return [];

  const preferredOrder = ["navidad", "nino", "jueves", "sabado"];
  const keys = Object.keys(draws);

  const ordered = [
    ...preferredOrder.filter((k) => keys.includes(k)),
    ...keys.filter((k) => !preferredOrder.includes(k)),
  ];

  return ordered
    .map((k) => {
      const block = draws[k];
      if (!hasExtraBlock(block)) return null;

      const title = String(block?.title || "").trim();
      const lines = Array.isArray(block?.explain) ? block.explain : [];
      return { key: k, title, lines };
    })
    .filter(Boolean);
}

function buildExplainModalHTML({
  explainTitle,
  closeBtnText,
  explainLines,
  drawsSections,
  extras,
}) {
  const drawsHtml = (Array.isArray(drawsSections) ? drawsSections : [])
    .map((s) => buildSectionHTML(s.title, s.lines))
    .join("");

  const extrasHtml = (Array.isArray(extras) ? extras : [])
    .filter((x) => hasExtraBlock(x?.block))
    .map((x) => buildExtraSectionHTML(x.block, x.fallbackTitle))
    .join("");

  return `
    <div class="hero-modal" id="hero-explain-modal" aria-hidden="true">
      <div class="hero-modal__backdrop" id="hero-explain-backdrop"></div>

      <div class="hero-modal__dialog" role="dialog" aria-modal="true" aria-label="${escapeHtml(
        explainTitle,
      )}">
        <div class="hero-modal__header">
          <h3 class="hero-modal__title">${escapeHtml(explainTitle)}</h3>
          <button type="button" class="hero-modal__close" id="hero-explain-close">
            ${escapeHtml(closeBtnText)}
          </button>
        </div>

        <div class="hero-modal__body">
          ${explainLines.map((t) => `<p>${escapeHtml(t)}</p>`).join("")}
          ${drawsHtml}
          ${extrasHtml}
        </div>
      </div>
    </div>
  `;
}

function buildSectionHTML(title, lines) {
  const safeTitle = String(title || "").trim();
  const safeLines = Array.isArray(lines) ? lines : [];

  return `
    <div class="hero-modal__divider"></div>
    <div class="hero-modal__sectionTitle">${escapeHtml(
      safeTitle || "Sorteo",
    )}</div>
    ${safeLines.map((t) => `<p>${escapeHtml(t)}</p>`).join("")}
  `;
}

function buildExtraSectionHTML(extraBlock, fallbackTitle) {
  const title = String(extraBlock?.title || fallbackTitle || "").trim();
  const lines = Array.isArray(extraBlock?.explain) ? extraBlock.explain : [];

  return `
    <div class="hero-modal__divider"></div>
    <div class="hero-modal__sectionTitle">${escapeHtml(
      title || fallbackTitle || "Extra",
    )}</div>
    ${lines.map((t) => `<p>${escapeHtml(t)}</p>`).join("")}
  `;
}

function wireExplainModalHandlers({
  openBtnId,
  modalId,
  closeBtnId,
  backdropId,
}) {
  const openBtn = document.getElementById(openBtnId);
  const modal = document.getElementById(modalId);
  const closeBtn = document.getElementById(closeBtnId);
  const backdrop = document.getElementById(backdropId);
  if (!openBtn || !modal || !closeBtn || !backdrop) return;

  openBtn.addEventListener("click", () => openExplainModal(modal));
  closeBtn.addEventListener("click", () => closeExplainModal(modal));
  backdrop.addEventListener("click", () => closeExplainModal(modal));

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modal.classList.contains("is-open")) {
      closeExplainModal(modal);
    }
  });
}

function openExplainModal(modal) {
  modal.classList.add("is-open");
  modal.setAttribute("aria-hidden", "false");
  lockBodyScroll();

  const closeBtn = modal.querySelector(".hero-modal__close");
  if (closeBtn) closeBtn.focus({ preventScroll: true });
}

function closeExplainModal(modal) {
  modal.classList.remove("is-open");
  modal.setAttribute("aria-hidden", "true");
  unlockBodyScroll();
}

let __scrollLockY = 0;

function lockBodyScroll() {
  if (document.body.classList.contains("is-scroll-locked")) return;

  __scrollLockY = window.scrollY || 0;

  document.body.classList.add("is-scroll-locked");
  document.body.style.position = "fixed";
  document.body.style.top = `-${__scrollLockY}px`;
  document.body.style.left = "0";
  document.body.style.right = "0";
  document.body.style.width = "100%";
}

function unlockBodyScroll() {
  if (!document.body.classList.contains("is-scroll-locked")) return;

  document.body.classList.remove("is-scroll-locked");
  document.body.style.position = "";
  document.body.style.top = "";
  document.body.style.left = "";
  document.body.style.right = "";
  document.body.style.width = "";

  window.scrollTo(0, __scrollLockY);
}

/* =====================================================
   META (adaptado a game-meta.css)
   ===================================================== */

function updateMeta(game, dict) {
  const metaEl = document.getElementById("game-meta");
  if (!metaEl) return;

  const config = game?.config;
  if (!config) return;

  const metaLabels = dict.meta?.labels || {};
  const metaDays = dict.meta?.days || {};

  metaEl.innerHTML = "";

  const addChip = (label, value, { accent = false } = {}) => {
    const dt = document.createElement("dt");
    dt.className = "sr-only";
    dt.textContent = label;

    const dd = document.createElement("dd");
    dd.dataset.label = label;
    dd.textContent = value;

    if (accent) dd.classList.add("meta-chip--accent");

    metaEl.appendChild(dt);
    metaEl.appendChild(dd);
  };

  const hasFinite = (v) => Number.isFinite(Number(v));
  const fmtCountRange = (count, min, max) => {
    const c = count != null ? String(count) : "";
    return hasFinite(min) && hasFinite(max) ? `${c} (${min}–${max})` : c;
  };
  const fmtOneRange = (min, max) => {
    return hasFinite(min) && hasFinite(max) ? `1 (${min}–${max})` : "1";
  };

  if (config.pick?.main) {
    const { count, min, max } = config.pick.main;
    addChip(
      metaLabels.mainNumbers || "Números principales",
      fmtCountRange(count, min, max),
    );
  }

  if (config.pick?.reintegro) {
    const { min, max } = config.pick.reintegro;
    addChip(metaLabels.reintegro || "Reintegro", fmtOneRange(min, max));
  }

  if (config.pick?.stars) {
    const { count, min, max } = config.pick.stars;
    addChip(metaLabels.stars || "Estrellas", fmtCountRange(count, min, max));
  }

  let drawDaysOverride = null;
  let priceOverride = null;

  if (config.id === "loteria-nacional" && lastLnMeta) {
    if (Array.isArray(lastLnMeta.drawDays))
      drawDaysOverride = lastLnMeta.drawDays;
    if (lastLnMeta.pricePerDraw != null)
      priceOverride = lastLnMeta.pricePerDraw;
  }

  const drawDays = drawDaysOverride ?? config.economy?.drawDays;
  if (Array.isArray(drawDays) && drawDays.length) {
    const dayNames = drawDays
      .map((day) => normalizeDayKey(day))
      .filter(Boolean)
      .map((key) => metaDays[key] || key);

    if (dayNames.length) {
      addChip(metaLabels.drawDays || "Días de sorteo", dayNames.join(", "));
    }
  }

  const pricePerDraw =
    priceOverride != null ? priceOverride : config.economy?.pricePerDraw;

  if (pricePerDraw != null) {
    addChip(
      metaLabels.pricePerDraw || "Precio por sorteo",
      `${Number(pricePerDraw).toFixed(2)} €`,
    );
  }

  if (config.extras?.joker?.enabled) {
    addChip(
      metaLabels.joker || "Joker",
      `+${Number(config.extras.joker.pricePerBet || 0).toFixed(2)} €`,
      { accent: true },
    );
  }
}

function normalizeDayKey(day) {
  if (typeof day === "string") {
    const k = day.trim().toLowerCase();
    if (
      k === "sunday" ||
      k === "monday" ||
      k === "tuesday" ||
      k === "wednesday" ||
      k === "thursday" ||
      k === "friday" ||
      k === "saturday"
    ) {
      return k;
    }
    return "";
  }

  if (typeof day === "number" && Number.isFinite(day)) {
    return getDayNameFromNumber(day);
  }

  return "";
}

function getDayNameFromNumber(dayNumber) {
  const names = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
  ];
  return names[dayNumber] || "";
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
