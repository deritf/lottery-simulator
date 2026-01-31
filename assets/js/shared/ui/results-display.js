// assets/js/shared/ui/results-display.js

import { EventBus } from "../utils/events.js";
import { formatCurrency, formatNumber } from "../utils/format.js";
import { getByPath } from "../utils/i18n-path.js";

let lastPayload = null;
let I18N_DICT = null;

export function initResultsDisplay() {
  EventBus.on("sim:done", (payload) => {
    const resultsSection = document.getElementById("results");
    if (resultsSection) resultsSection.hidden = false;

    lastPayload = payload;

    updateStatsCards(payload);
    bindHighlightButton();

    EventBus.emit("results:payload", payload);
    EventBus.emit("results:rendered", {});
  });

  EventBus.on("lang:changed", (e) => {
    I18N_DICT = e?.dict || I18N_DICT;

    if (lastPayload) {
      updateStatsCards(lastPayload);
      bindHighlightButton();

      EventBus.emit("results:rendered", {});
    }
  });

  bindHighlightButton();
}

function bindHighlightButton() {
  const btn = document.getElementById("open-highlight-draw");
  if (!btn || btn.dataset.bound) return;

  btn.dataset.bound = "1";
  btn.addEventListener("click", () => {
    if (!lastPayload) return;

    const drawNumber = Number(lastPayload.biggestPrizeDrawNumber);
    if (!Number.isFinite(drawNumber) || drawNumber <= 0) return;

    const draw = lastPayload.draws?.[drawNumber - 1];
    if (!draw) return;

    EventBus.emit("drawlog:open", { draw, drawNumber });
  });
}

function updateStatsCards(payload) {
  const lang = document.body.dataset.lang || "es";
  const locale = lang === "en" ? "en-GB" : "es-ES";

  setElementText("total-draws", formatNumber(payload.totalDraws, locale));

  const years = Number(payload.yearsElapsed);
  if (Number.isFinite(years)) {
    setElementText("time-elapsed", formatYearsHuman(years, lang));
  } else {
    setElementText("time-elapsed", payload.timeElapsed || "—");
  }

  if (payload.currentDate) {
    const dateStr = new Date(payload.currentDate).toLocaleDateString(locale);
    setElementText("current-date", dateStr);
  } else {
    setElementText("current-date", "—");
  }

  setElementText("total-spent", formatCurrency(payload.totalSpent, locale));

  const totalWonEl = document.getElementById("total-won");
  if (totalWonEl) {
    totalWonEl.textContent = formatCurrency(payload.totalWon, locale);
    totalWonEl.classList.remove(
      "kpi__v--positive",
      "kpi__v--negative",
      "kpi__v--neutral",
    );
    totalWonEl.classList.add("kpi__v--positive");
  }

  const balanceEl = document.getElementById("net-balance");
  if (balanceEl) {
    const balance = Number(payload.netBalance) || 0;
    balanceEl.textContent = formatCurrency(balance, locale);
    setKpiValueState(balanceEl, balance);
  }

  const roiEl = document.getElementById("profit-per-euro");
  if (roiEl) {
    const roi = Number(payload.profitPerEuro) || 0;
    roiEl.textContent = roi.toFixed(4);
    setKpiValueState(roiEl, roi);
  }

  const biggestPrizeEl = document.getElementById("biggest-prize");
  if (Number(payload.biggestPrize) > 0) {
    const prizeValue = Number(payload.biggestPrize);

    setElementText("biggest-prize", formatCurrency(prizeValue, locale));

    const drawNumber = Number(payload.biggestPrizeDrawNumber);
    const prefix =
      getByPath(I18N_DICT, "results.drawDetail.titlePrefix") ||
      (lang === "en" ? "Draw" : "Sorteo");

    const drawLabel =
      Number.isFinite(drawNumber) && drawNumber > 0
        ? `${prefix} #${drawNumber}`
        : payload.highlightDraw || "—";

    setElementText("biggest-prize-draw", drawLabel);

    if (payload.biggestPrizeDate) {
      const dateStr = new Date(payload.biggestPrizeDate).toLocaleDateString(
        locale,
      );
      setElementText("biggest-prize-date", dateStr);
    } else {
      setElementText("biggest-prize-date", "—");
    }

    if (biggestPrizeEl) {
      biggestPrizeEl.classList.remove(
        "kpi__v--positive",
        "kpi__v--negative",
        "kpi__v--neutral",
      );
      biggestPrizeEl.classList.add("kpi__v--positive");
    }
  } else {
    setElementText("biggest-prize", "—");
    setElementText("biggest-prize-draw", "—");
    setElementText("biggest-prize-date", "—");
    if (biggestPrizeEl) setKpiValueState(biggestPrizeEl, 0);
  }

  const btnOpen = document.getElementById("open-highlight-draw");
  if (btnOpen) {
    const drawNumber = Number(payload.biggestPrizeDrawNumber);
    const ok =
      Number.isFinite(drawNumber) &&
      drawNumber > 0 &&
      Array.isArray(payload.draws) &&
      payload.draws.length >= drawNumber;

    btnOpen.disabled = !ok;
    btnOpen.setAttribute("aria-disabled", ok ? "false" : "true");
  }
}

function setKpiValueState(el, value) {
  el.classList.remove(
    "kpi__v--positive",
    "kpi__v--negative",
    "kpi__v--neutral",
  );
  if (value > 0) el.classList.add("kpi__v--positive");
  else if (value < 0) el.classList.add("kpi__v--negative");
  else el.classList.add("kpi__v--neutral");
}

function setElementText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text || "—";
}

function formatYearsHuman(years, lang) {
  const v = Number(years);
  if (!Number.isFinite(v)) return "—";

  const rounded = Number(v.toFixed(1));
  const isSingular = Math.abs(rounded - 1) < 1e-9;

  const one =
    getByPath(I18N_DICT, "results.units.yearOne") ||
    (lang === "en" ? "year" : "año");

  const other =
    getByPath(I18N_DICT, "results.units.yearOther") ||
    (lang === "en" ? "years" : "años");

  return `${rounded} ${isSingular ? one : other}`;
}
