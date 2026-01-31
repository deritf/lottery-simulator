// assets/js/shared/ui/draw-debug-modal.js
// Modal (controlador): DOM, eventos, popovers, título, i18n help.
// Render + cálculos viven en draw-debug-render.js

import { EventBus } from "../utils/events.js";
import { formatDateShort } from "../utils/format.js";
import { getCurrentI18nDict } from "../../app/i18n.js";
import { escapeHtml, getByPath, helpHotspot } from "./draw-debug-helpers.js";
import { renderDrawDetailHtml } from "./draw-debug-render.js";

let modalEl = null;
let lastOpen = null;

export function initDrawDebugModal() {
  EventBus.on("drawlog:open", ({ draw, drawNumber }) => {
    lastOpen = { draw, drawNumber };
    openModal(draw, drawNumber);
  });

  EventBus.on("lang:changed", () => {
    if (!modalEl || modalEl.hidden) return;
    if (lastOpen) openModal(lastOpen.draw, lastOpen.drawNumber);
  });
}

function ensureModal() {
  if (modalEl) return modalEl;

  modalEl = document.createElement("div");
  modalEl.id = "draw-debug-modal";
  modalEl.className = "ddm";
  modalEl.hidden = true;

  modalEl.innerHTML = `
    <div class="ddm__backdrop" data-close="1"></div>

    <div class="ddm__panel" role="dialog" aria-modal="true" aria-label="Detalle del sorteo">
      <div class="ddm__head">
        <div class="ddm__title" id="draw-debug-modal-title"></div>
        <button type="button" class="ddm__close" data-close="1" aria-label="Cerrar">×</button>
      </div>

      <div class="ddm__body" id="draw-debug-modal-content"></div>

      <div class="ddm__popover" id="ddm-popover" hidden>
        <div class="ddm__popoverHead">
          <div class="ddm__popoverTitle" id="ddm-popover-title"></div>
          <button type="button" class="ddm__popoverClose" data-popover-close="1" aria-label="Cerrar">×</button>
        </div>
        <div class="ddm__popoverBody" id="ddm-popover-body"></div>
      </div>
    </div>
  `;

  modalEl.addEventListener("click", (e) => {
    const t = e.target;

    if (t?.dataset?.close) closeModal();
    if (t?.dataset?.popoverClose) hidePopover();

    const hs = t?.closest?.("[data-ddm-help]");
    if (hs) {
      e.preventDefault();
      e.stopPropagation();
      const key = hs.getAttribute("data-ddm-help");
      if (key) openHelpPopover(hs, key);
      return;
    }

    const pop = modalEl.querySelector("#ddm-popover");
    if (pop && !pop.hidden) {
      const insidePopover = t?.closest?.("#ddm-popover");
      const insideHotspot = t?.closest?.("[data-ddm-help]");
      if (!insidePopover && !insideHotspot) hidePopover();
    }
  });

  document.addEventListener("keydown", (e) => {
    if (!modalEl || modalEl.hidden) return;
    if (e.key === "Escape") {
      const pop = modalEl.querySelector("#ddm-popover");
      if (pop && !pop.hidden) hidePopover();
      else closeModal();
    }
  });

  document.body.appendChild(modalEl);
  return modalEl;
}

function openModal(draw, drawNumber) {
  const modal = ensureModal();
  const titleEl = modal.querySelector("#draw-debug-modal-title");
  const content = modal.querySelector("#draw-debug-modal-content");

  hidePopover();

  const lang = document.body.dataset.lang || "es";
  const locale = lang === "en" ? "en-GB" : "es-ES";

  const dict = getCurrentI18nDict();
  const t = (path, fallback) => getByPath(dict, path) ?? fallback;
  const tAny = (path, fallback) => {
    const v = getByPath(dict, path);
    return v === undefined ? fallback : v;
  };

  const ariaLabel = t("results.drawDetail.ariaLabel", "Detalle del sorteo");
  modal.querySelector(".ddm__panel")?.setAttribute("aria-label", ariaLabel);
  modal
    .querySelector(".ddm__close")
    ?.setAttribute("aria-label", t("results.drawDetail.close", "Cerrar"));

  const titlePrefix = t(
    "results.drawDetail.titlePrefix",
    lang === "en" ? "Draw" : "Sorteo",
  );

  const d = draw?.date instanceof Date ? draw.date : new Date(draw?.date);
  const dateStr = draw?.date ? formatDateShort(d, locale) : "—";
  const weekday = draw?.date
    ? new Intl.DateTimeFormat(locale, { weekday: "long" }).format(d)
    : "";
  const weekdayCap = weekday ? weekday[0].toUpperCase() + weekday.slice(1) : "";

  titleEl.textContent = weekdayCap
    ? `${titlePrefix} #${drawNumber} · ${weekdayCap} · ${dateStr}`
    : `${titlePrefix} #${drawNumber} · ${dateStr}`;

  function getHelpSection(sectionKey, fallbackTitle) {
    const sec = tAny(`results.drawDetail.help.sections.${sectionKey}`, null);
    const title =
      (sec && typeof sec.title === "string" && sec.title) ||
      fallbackTitle ||
      "";
    const body =
      sec && Array.isArray(sec.body)
        ? sec.body.filter((x) => typeof x === "string")
        : [];
    if (!title || !body.length) return null;
    const html = body.map((p) => `<p>${escapeHtml(p)}</p>`).join("");
    return { title, html };
  }

  function hs(label, key, fallbackTitle) {
    const help = getHelpSection(key, fallbackTitle);
    if (!help) return escapeHtml(label);
    const hint = t(
      "results.drawDetail.help.clickHint",
      lang === "en" ? "Click for explanation" : "Clic para explicación",
    );
    return helpHotspot(escapeHtml(label), key, hint);
  }

  content.innerHTML = renderDrawDetailHtml(draw, drawNumber, {
    lang,
    locale,
    t,
    tAny,
    hs,
  });

  modalEl._ddmHelp = {
    lang,
    tAny,
    t,
    getHelpSection,
  };

  modal.hidden = false;
  document.body.style.overflow = "hidden";
}

function closeModal() {
  if (!modalEl) return;
  hidePopover();
  modalEl.hidden = true;
  document.body.style.overflow = "";
}

/* ===========================
   POPOVER DE AYUDA
   =========================== */

function hidePopover() {
  if (!modalEl) return;
  const pop = modalEl.querySelector("#ddm-popover");
  if (pop) pop.hidden = true;
}

function openHelpPopover(anchorEl, sectionKey) {
  if (!modalEl) return;

  const ctx = modalEl._ddmHelp;
  if (!ctx?.getHelpSection) return;

  const lang = ctx.lang || "es";
  const fallbackTitle =
    sectionKey === "joker"
      ? "Joker"
      : sectionKey === "millon"
        ? "El Millón"
        : sectionKey === "jackpot"
          ? lang === "en"
            ? "Jackpot logic"
            : "Lógica del bote"
          : sectionKey === "prizePool"
            ? lang === "en"
              ? "Prize pool"
              : "Pool de premios"
            : lang === "en"
              ? "Help"
              : "Ayuda";

  const help = ctx.getHelpSection(sectionKey, fallbackTitle);
  if (!help) return;

  const panel = modalEl.querySelector(".ddm__panel");
  const pop = modalEl.querySelector("#ddm-popover");
  const titleEl = modalEl.querySelector("#ddm-popover-title");
  const bodyEl = modalEl.querySelector("#ddm-popover-body");
  if (!panel || !pop || !titleEl || !bodyEl) return;

  titleEl.textContent = help.title;
  bodyEl.innerHTML = help.html;

  pop.hidden = false;
  pop.setAttribute("data-place", "right");

  const panelRect = panel.getBoundingClientRect();
  const aRect = anchorEl.getBoundingClientRect();

  pop.style.left = "0px";
  pop.style.top = "0px";
  pop.style.maxWidth = "420px";
  pop.style.maxHeight = "340px";

  const popRect = pop.getBoundingClientRect();
  const pad = 12;

  const spaceRight = panelRect.right - aRect.right;
  const spaceLeft = aRect.left - panelRect.left;

  const placeRight =
    spaceRight >= Math.min(320, popRect.width) || spaceRight >= spaceLeft;
  pop.setAttribute("data-place", placeRight ? "right" : "left");

  let left = placeRight
    ? aRect.right - panelRect.left + 10
    : aRect.left - panelRect.left - popRect.width - 10;

  let top = aRect.top - panelRect.top + aRect.height / 2 - popRect.height / 2;

  const maxLeft = panelRect.width - popRect.width - pad;
  const maxTop = panelRect.height - popRect.height - pad;

  left = Math.max(pad, Math.min(left, maxLeft));
  top = Math.max(pad, Math.min(top, maxTop));

  pop.style.left = `${left}px`;
  pop.style.top = `${top}px`;
}
