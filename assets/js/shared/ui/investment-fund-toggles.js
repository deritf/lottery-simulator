// assets/js/shared/ui/investment-fund-toggles.js

import { EventBus } from "../utils/events.js";
import { getCurrentI18nDict } from "../../app/i18n.js";

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getByPath(obj, path) {
  if (!obj || !path) return undefined;
  const parts = String(path).split(".");
  let cur = obj;
  for (const p of parts) {
    if (cur && Object.prototype.hasOwnProperty.call(cur, p)) cur = cur[p];
    else return undefined;
  }
  return cur;
}

function seriesKeyFromName(name) {
  const s = String(name || "").toLowerCase();

  if (s.includes("loter") || s.includes("lottery")) return "lotteryNet";
  if (s.includes("msci") && s.includes("world")) return "msciWorld";
  if (
    s.includes("s&p") ||
    s.includes("sp 500") ||
    s.includes("sp500") ||
    s.includes("spx")
  ) {
    return "sp500HedgedEur";
  }
  if ((s.includes("stoxx") || s.includes("stoxx europe")) && s.includes("600"))
    return "stoxx600";
  if (s.includes("euro") && s.includes("stoxx") && s.includes("50"))
    return "euroStoxx50";
  if (s.includes("ibex") && (s.includes("tr") || s.includes("ibextr")))
    return "ibex35TR";

  return null;
}

function translateSeriesName(rawName) {
  const dict =
    typeof getCurrentI18nDict === "function" ? getCurrentI18nDict() : null;
  const key = seriesKeyFromName(rawName);
  if (!dict || !key) return rawName;

  const v = getByPath(dict, `ui.investment.series.${key}`);
  return typeof v === "string" && v.trim() ? v : rawName;
}

function ensureContainer() {
  const host = document.querySelector("#investment .investment__head > div");
  if (!host) return null;

  let el = document.getElementById("investment-fund-toggles");
  if (el) return el;

  el = document.createElement("div");
  el.id = "investment-fund-toggles";
  el.className = "investment-fund-toggles";
  host.appendChild(el);
  return el;
}

function emitVisibility(map) {
  window.dispatchEvent(
    new CustomEvent("investment:visibility", { detail: { visibleMap: map } }),
  );
}

let lastSeries = [];
let lastMap = null;

function buildUI(seriesNames, incomingVisibleMap) {
  const wrap = ensureContainer();
  if (!wrap) return;

  lastSeries = Array.isArray(seriesNames) ? seriesNames.slice() : [];

  const map = incomingVisibleMap
    ? { ...incomingVisibleMap }
    : lastMap
      ? { ...lastMap }
      : Object.fromEntries(lastSeries.map((n) => [n, true]));

  lastMap = map;

  wrap.innerHTML = `
    <div class="investment-fund-list" role="group" aria-label="Fondos visibles">
      ${lastSeries
        .map((name, i) => {
          const id = `fund-toggle-${i}`;
          const labelShown = translateSeriesName(name);
          const checked = map[name] !== false;
          return `
            <label class="investment-fund-item" for="${id}">
              <input
                type="checkbox"
                id="${id}"
                data-name="${escapeHtml(name)}"
                ${checked ? "checked" : ""}
              />
              <span class="investment-fund-pill">${escapeHtml(
                labelShown,
              )}</span>
            </label>
          `;
        })
        .join("")}
    </div>
  `;

  wrap.onchange = (e) => {
    const cb = e.target;
    if (!(cb instanceof HTMLInputElement)) return;
    if (cb.type !== "checkbox") return;

    const name = cb.dataset.name;
    if (!name) return;

    map[name] = cb.checked;
    lastMap = map;
    emitVisibility(map);
  };

  emitVisibility(map);
}

window.addEventListener("investment:series-list", (ev) => {
  const series = ev?.detail?.series || [];
  const visibleMap = ev?.detail?.visibleMap || null;
  buildUI(series, visibleMap);
});

EventBus.on("lang:changed", () => {
  if (!lastSeries.length) return;
  buildUI(lastSeries, lastMap);
});
