// assets/js/shared/ui/results-charts.js

import { EventBus } from "../utils/events.js";
import { formatCurrency } from "../utils/format.js";
import { getByPath } from "../utils/i18n-path.js";

let lastPayload = null;
let modalEl = null;

let excludeZeroHistogram = false;

let I18N_DICT = null;

export function initResultsCharts() {
  EventBus.on("lang:changed", ({ dict }) => {
    I18N_DICT = dict || null;

    if (lastPayload) {
      renderDonut(lastPayload);
      if (modalEl && !modalEl.hidden) renderModal(lastPayload);
    }
  });

  EventBus.on("results:payload", (payload) => {
    lastPayload = payload;
    setChartsButtonEnabled(Boolean(payload?.draws?.length));
    renderDonut(payload);
  });

  EventBus.on("results:rendered", () => {
    if (lastPayload) {
      setChartsButtonEnabled(Boolean(lastPayload?.draws?.length));
      renderDonut(lastPayload);
    }
  });

  EventBus.on("sim:done", (payload) => {
    lastPayload = payload;
    setChartsButtonEnabled(Boolean(payload?.draws?.length));
    renderDonut(payload);
  });

  EventBus.on("theme:changed", () => {
    if (!lastPayload) return;
    renderDonut(lastPayload);
    if (modalEl && !modalEl.hidden) renderModal(lastPayload);
  });

  bindOpenModalButton();
  initDonutResize();
}

initResultsCharts();

/* ===========================
   i18n helper
   =========================== */

function t(path, fallback) {
  const v = I18N_DICT ? getByPath(I18N_DICT, path) : null;
  return typeof v === "string" ? v : fallback;
}

function tf(path, vars, fallback) {
  let s = t(path, fallback);
  if (typeof s !== "string") s = String(fallback ?? "");
  if (vars && typeof vars === "object") {
    for (const [k, v] of Object.entries(vars)) {
      s = s.replaceAll(`{${k}}`, String(v));
    }
  }
  return s;
}

/* ===========================
   UI
   =========================== */

function bindOpenModalButton() {
  const btn = document.getElementById("open-results-charts");
  if (!btn || btn.dataset.bound) return;

  btn.dataset.bound = "1";
  btn.addEventListener("click", () => {
    if (btn.disabled) return;
    if (!lastPayload) return;
    openModal(lastPayload);
  });
}

function setChartsButtonEnabled(enabled) {
  const btn = document.getElementById("open-results-charts");
  if (!btn) return;
  btn.disabled = !enabled;
  btn.setAttribute("aria-disabled", enabled ? "false" : "true");
}

/* ===========================
   DONUT (card resumen)
   =========================== */

function renderDonut(payload) {
  const echarts = window.echarts;
  if (!echarts) return;

  const el = document.getElementById("results-distribution");
  if (!el) return;

  const chart = echarts.getInstanceByDom(el) || echarts.init(el);

  const theme = document.body.dataset.theme || "light";
  const lang = document.body.dataset.lang || "es";
  const locale = lang === "en" ? "en-GB" : "es-ES";

  const spent = Number(payload.totalSpent) || 0;
  const won = Number(payload.totalWon) || 0;

  const winColor =
    getComputedStyle(document.documentElement)
      .getPropertyValue("--color-exito")
      .trim() || "#16a34a";

  const lossColor =
    getComputedStyle(document.documentElement)
      .getPropertyValue("--color-error")
      .trim() || "#dc2626";

  const textColor = theme === "dark" ? "#fff" : "#111";

  const labelSpent = t(
    "results.charts.donut.labelSpent",
    lang === "en" ? "Spent (€)" : "Gastado (€)",
  );
  const labelWon = t(
    "results.charts.donut.labelWon",
    lang === "en" ? "Won (€)" : "Ganado (€)",
  );

  const option = {
    tooltip: {
      trigger: "item",
      confine: true,
      formatter: (p) => {
        const value = new Intl.NumberFormat(locale, {
          style: "currency",
          currency: "EUR",
          maximumFractionDigits: 0,
        }).format(p.value);
        return `${p.name}: <strong>${value}</strong>`;
      },
    },
    legend: { show: false },
    series: [
      {
        name: t(
          "results.charts.common.distribution",
          lang === "en" ? "Distribution" : "Distribución",
        ),
        type: "pie",
        radius: ["48%", "78%"],
        center: ["50%", "55%"],
        padAngle: 4,
        itemStyle: { borderRadius: 10 },
        label: { show: false },
        emphasis: { label: { show: false } },
        labelLine: { show: false },
        data: [
          { value: won, name: labelWon, itemStyle: { color: winColor } },
          { value: spent, name: labelSpent, itemStyle: { color: lossColor } },
        ],
      },
    ],
    textStyle: { color: textColor },
  };

  try {
    chart.setOption(option, true);
    requestAnimationFrame(() => chart.resize());
  } catch (err) {
    console.error("ECharts donut error:", err);
  }
}

function initDonutResize() {
  const echarts = window.echarts;
  if (!echarts) return;

  const el = document.getElementById("results-distribution");
  if (!el) return;

  const ro = new ResizeObserver(() => {
    const inst = echarts.getInstanceByDom(el);
    if (inst) inst.resize();
  });

  const card = el.closest(".kpi") || el;
  ro.observe(card);

  window.addEventListener("resize", () => {
    const inst = echarts.getInstanceByDom(el);
    if (inst) inst.resize();
  });
}

/* ===========================
   MODAL + GRÁFICAS
   =========================== */

function ensureModal() {
  if (modalEl) return modalEl;

  modalEl = document.createElement("div");
  modalEl.id = "results-charts-modal";
  modalEl.className = "rcm";
  modalEl.hidden = true;

  modalEl.innerHTML = `
    <div class="rcm__backdrop" data-close="1"></div>
    <div class="rcm__panel" role="dialog" aria-modal="true" aria-label="Charts">
      <div class="rcm__head">
        <div class="rcm__title" id="results-charts-modal-title"></div>
        <button type="button" class="rcm__close" data-close="1" aria-label="Close">×</button>
      </div>
      <div class="rcm__body" id="results-charts-modal-content"></div>
    </div>
  `;

  modalEl.addEventListener("click", (e) => {
    if (e.target && e.target.dataset && e.target.dataset.close) closeModal();
  });

  document.addEventListener("keydown", (e) => {
    if (!modalEl || modalEl.hidden) return;
    if (e.key === "Escape") closeModal();
  });

  document.body.appendChild(modalEl);
  return modalEl;
}

function openModal(payload) {
  const m = ensureModal();

  m.hidden = false;
  document.body.style.overflow = "hidden";

  renderModal(payload);

  requestAnimationFrame(() => {
    const echarts = window.echarts;
    if (!echarts) return;

    const ids = [
      "rcm-balance-time",
      "rcm-cashflow",
      "rcm-prize-hist",
      "rcm-annual-net",
    ];

    for (const id of ids) {
      const el = document.getElementById(id);
      if (!el) continue;
      const inst = echarts.getInstanceByDom(el);
      if (inst) inst.resize();
    }
  });
}

function closeModal() {
  if (!modalEl) return;
  modalEl.hidden = true;
  document.body.style.overflow = "";
}

function renderModal(payload) {
  const m = ensureModal();

  const lang = document.body.dataset.lang || "es";
  const locale = lang === "en" ? "en-GB" : "es-ES";

  const titleEl = m.querySelector("#results-charts-modal-title");
  const contentEl = m.querySelector("#results-charts-modal-content");

  titleEl.textContent = t(
    "results.charts.modalTitle",
    lang === "en" ? "Charts" : "Gráficas",
  );

  contentEl.innerHTML = `
    <section class="rcm__section">
      <h4 class="rcm__h">${t(
        "results.charts.sections.balanceTime.title",
        "1) Net balance over time",
      )}</h4>
      <p class="rcm__p">${t("results.charts.sections.balanceTime.desc", "")}</p>
      <div id="rcm-balance-time" class="rcm__chart" aria-label="Net balance over time"></div>
    </section>

    <section class="rcm__section">
      <h4 class="rcm__h">${t(
        "results.charts.sections.cashflow.title",
        "2) Spent vs won (cumulative)",
      )}</h4>
      <p class="rcm__p">${t("results.charts.sections.cashflow.desc", "")}</p>
      <div id="rcm-cashflow" class="rcm__chart" aria-label="Spent vs won over time"></div>
    </section>

    <section class="rcm__section">
      <div class="rcm__row">
        <h4 class="rcm__h" style="margin:0;">${t(
          "results.charts.sections.hist.title",
          "3) Prize histogram",
        )}</h4>

        <div class="rcm__controls">
          <button
            type="button"
            class="rcm__toggle"
            id="rcm-toggle-zero"
            aria-pressed="${excludeZeroHistogram ? "true" : "false"}"
          >
            ${
              excludeZeroHistogram
                ? t(
                    "results.charts.sections.hist.toggleInclude",
                    lang === "en" ? "Include €0" : "Incluir 0€",
                  )
                : t(
                    "results.charts.sections.hist.toggleExclude",
                    lang === "en" ? "Exclude €0" : "Excluir 0€",
                  )
            }
          </button>

          <span class="rcm__meta" id="rcm-zero-count"></span>
        </div>
      </div>

      <p class="rcm__p">${t("results.charts.sections.hist.desc", "")}</p>

      <div id="rcm-prize-hist" class="rcm__chart" aria-label="Prize histogram per draw"></div>

      <p class="rcm__foot" id="rcm-prize-hist-foot"></p>
    </section>

    <section class="rcm__section">
      <h4 class="rcm__h">${t(
        "results.charts.sections.annualNet.title",
        "4) Annual net balance",
      )}</h4>
      <p class="rcm__p">${t("results.charts.sections.annualNet.desc", "")}</p>
      <div id="rcm-annual-net" class="rcm__chart" aria-label="Annual net balance"></div>
      <p class="rcm__foot">${t(
        "results.charts.sections.annualNet.foot",
        "",
      )}</p>
    </section>
  `;

  bindHistogramToggle(payload, locale);

  renderBalanceTimeChart(payload, locale);
  renderCashflowAreas(payload, locale);
  renderPrizeHistogram(payload, locale);
  renderAnnualNetBar(payload, locale);
}

/* ===========================
   Toggle "Excluir 0€"
   =========================== */

function bindHistogramToggle(payload, locale) {
  const btn = document.getElementById("rcm-toggle-zero");
  if (!btn || btn.dataset.bound) return;

  btn.dataset.bound = "1";
  btn.addEventListener("click", () => {
    excludeZeroHistogram = !excludeZeroHistogram;

    const lang = document.body.dataset.lang || "es";
    btn.setAttribute("aria-pressed", excludeZeroHistogram ? "true" : "false");
    btn.textContent = excludeZeroHistogram
      ? t(
          "results.charts.sections.hist.toggleInclude",
          lang === "en" ? "Include €0" : "Incluir 0€",
        )
      : t(
          "results.charts.sections.hist.toggleExclude",
          lang === "en" ? "Exclude €0" : "Excluir 0€",
        );

    renderPrizeHistogram(payload, locale);
  });
}

/* ===========================
   GRÁFICA 1: Balance neto (time axis)
   =========================== */

function renderBalanceTimeChart(payload, locale) {
  const echarts = window.echarts;
  if (!echarts) return;

  const el = document.getElementById("rcm-balance-time");
  if (!el) return;

  const inst = echarts.getInstanceByDom(el) || echarts.init(el);

  const theme = document.body.dataset.theme || "light";
  const lang = document.body.dataset.lang || "es";

  const green =
    getComputedStyle(document.documentElement)
      .getPropertyValue("--color-exito")
      .trim() || "#16a34a";

  const red =
    getComputedStyle(document.documentElement)
      .getPropertyValue("--color-error")
      .trim() || "#dc2626";

  const textColor = theme === "dark" ? "#fff" : "#111";

  const draws = Array.isArray(payload?.draws) ? payload.draws : [];

  const totalDraws = Number(payload?.totalDraws) || draws.length || 0;
  const totalSpent = Number(payload?.totalSpent) || 0;
  const spentPerDraw = totalDraws > 0 ? totalSpent / totalDraws : 0;

  let cumSpent = 0;
  let cumWon = 0;

  const raw = [];
  for (const d of draws) {
    const dtRaw = d?.date ?? d?.drawDate ?? d?.timestamp ?? null;
    const dt = dtRaw instanceof Date ? dtRaw : new Date(dtRaw);
    if (!dtRaw || Number.isNaN(dt.getTime())) continue;

    const prize = Number(d?.prize) || 0;

    cumSpent += spentPerDraw;
    cumWon += prize;

    const net = cumWon - cumSpent;
    if (!Number.isFinite(net)) continue;

    raw.push([dt.getTime(), net]);
  }

  if (raw.length === 0) {
    inst.clear();
    return;
  }

  const pos = raw.map(([t, v]) => [t, v > 0 ? v : null]);
  const neg = raw.map(([t, v]) => [t, v <= 0 ? v : null]);

  const option = {
    tooltip: {
      trigger: "axis",
      confine: true,
      axisPointer: { type: "line" },
      formatter: (params) => {
        const p = Array.isArray(params) ? params : [];
        const first = p.find((x) => x && x.value && x.value[1] != null);
        if (!first) return "";
        const date = new Date(first.value[0]).toLocaleDateString(locale);
        const value = formatCurrency(first.value[1], locale);
        return `${date}<br/>${t(
          "results.charts.common.netBalance",
          lang === "en" ? "Net balance" : "Balance neto",
        )}: <strong>${value}</strong>`;
      },
    },

    grid: { left: 14, right: 14, top: 16, bottom: 34, containLabel: true },

    xAxis: {
      type: "time",
      boundaryGap: false,
      axisLabel: { color: textColor },
      axisLine: { lineStyle: { color: textColor } },
    },

    yAxis: {
      type: "value",
      boundaryGap: [0, "10%"],
      axisLabel: {
        color: textColor,
        formatter: (v) => {
          const n = Number(v);
          if (!Number.isFinite(n)) return "";
          return new Intl.NumberFormat(locale, {
            style: "currency",
            currency: "EUR",
            maximumFractionDigits: 0,
          }).format(n);
        },
      },
      splitLine: { lineStyle: { opacity: 0.15 } },
      axisLine: { lineStyle: { color: textColor } },
    },

    dataZoom: [{ type: "inside", start: 0, end: 100 }],

    series: [
      {
        name: t(
          "results.charts.common.positive",
          lang === "en" ? "Positive" : "Positivo",
        ),
        type: "line",
        smooth: true,
        symbol: "none",
        connectNulls: false,
        data: pos,
        lineStyle: { color: green, width: 2 },
        areaStyle: { color: green, opacity: theme === "dark" ? 0.18 : 0.12 },
        emphasis: { focus: "series" },
      },
      {
        name: t(
          "results.charts.common.negative",
          lang === "en" ? "Negative" : "Negativo",
        ),
        type: "line",
        smooth: true,
        symbol: "none",
        connectNulls: false,
        data: neg,
        lineStyle: { color: red, width: 2 },
        areaStyle: { color: red, opacity: theme === "dark" ? 0.18 : 0.12 },
        emphasis: { focus: "series" },
      },
    ],

    textStyle: { color: textColor },
  };

  try {
    inst.setOption(option, true);
    requestAnimationFrame(() => inst.resize());
  } catch (err) {
    console.error("ECharts balance-time error:", err);
    inst.clear();
  }
}

/* ===========================
   GRÁFICA 2: Gastado vs Ganado (áreas SIN apilar)
   =========================== */

function renderCashflowAreas(payload, locale) {
  const echarts = window.echarts;
  if (!echarts) return;

  const el = document.getElementById("rcm-cashflow");
  if (!el) return;

  const inst = echarts.getInstanceByDom(el) || echarts.init(el);

  const theme = document.body.dataset.theme || "light";
  const lang = document.body.dataset.lang || "es";

  const green =
    getComputedStyle(document.documentElement)
      .getPropertyValue("--color-exito")
      .trim() || "#16a34a";

  const red =
    getComputedStyle(document.documentElement)
      .getPropertyValue("--color-error")
      .trim() || "#dc2626";

  const textColor = theme === "dark" ? "#fff" : "#111";

  const draws = Array.isArray(payload?.draws) ? payload.draws : [];
  const totalDraws = Number(payload?.totalDraws) || draws.length || 0;
  const totalSpent = Number(payload?.totalSpent) || 0;
  const spentPerDraw = totalDraws > 0 ? totalSpent / totalDraws : 0;

  let cumSpent = 0;
  let cumWon = 0;

  const spentSeries = [];
  const wonSeries = [];

  for (const d of draws) {
    const dtRaw = d?.date ?? d?.drawDate ?? d?.timestamp ?? null;
    const dt = dtRaw instanceof Date ? dtRaw : new Date(dtRaw);
    if (!dtRaw || Number.isNaN(dt.getTime())) continue;

    const prize = Number(d?.prize) || 0;

    cumSpent += spentPerDraw;
    cumWon += prize;

    spentSeries.push([dt.getTime(), cumSpent]);
    wonSeries.push([dt.getTime(), cumWon]);
  }

  if (!spentSeries.length || !wonSeries.length) {
    inst.clear();
    return;
  }

  const spentName = t(
    "results.charts.common.spentCum",
    lang === "en" ? "Spent (cum.)" : "Gastado (acum.)",
  );
  const wonName = t(
    "results.charts.common.wonCum",
    lang === "en" ? "Won (cum.)" : "Ganado (acum.)",
  );

  const option = {
    tooltip: {
      trigger: "axis",
      confine: true,
      axisPointer: { type: "cross" },
      formatter: (params) => {
        const arr = Array.isArray(params) ? params : [];
        const p0 = arr[0]?.value;
        const ts = p0?.[0];
        if (!ts) return "";
        const date = new Date(ts).toLocaleDateString(locale);

        const lines = arr
          .map((p) => {
            const v = p?.value?.[1];
            if (v == null) return "";
            return `${p.marker} ${p.seriesName}: <strong>${formatCurrency(
              v,
              locale,
            )}</strong>`;
          })
          .filter(Boolean)
          .join("<br/>");

        return `${date}<br/>${lines}`;
      },
    },
    grid: { left: 14, right: 14, top: 26, bottom: 34, containLabel: true },
    xAxis: {
      type: "time",
      boundaryGap: false,
      axisLabel: { color: textColor },
      axisLine: { lineStyle: { color: textColor } },
    },
    yAxis: {
      type: "value",
      axisLabel: {
        color: textColor,
        formatter: (v) =>
          new Intl.NumberFormat(locale, {
            style: "currency",
            currency: "EUR",
            maximumFractionDigits: 0,
          }).format(Number(v) || 0),
      },
      splitLine: { lineStyle: { opacity: 0.15 } },
      axisLine: { lineStyle: { color: textColor } },
    },
    dataZoom: [{ type: "inside", start: 0, end: 100 }],
    legend: {
      top: 0,
      textStyle: { color: textColor },
      data: [spentName, wonName],
    },
    series: [
      {
        name: spentName,
        type: "line",
        symbol: "none",
        smooth: true,
        data: spentSeries,
        lineStyle: { color: red, width: 2 },
        areaStyle: { color: red, opacity: theme === "dark" ? 0.16 : 0.1 },
        emphasis: { focus: "series" },
      },
      {
        name: wonName,
        type: "line",
        symbol: "none",
        smooth: true,
        data: wonSeries,
        lineStyle: { color: green, width: 2 },
        areaStyle: { color: green, opacity: theme === "dark" ? 0.16 : 0.1 },
        emphasis: { focus: "series" },
      },
    ],
    textStyle: { color: textColor },
  };

  try {
    inst.setOption(option, true);
    requestAnimationFrame(() => inst.resize());
  } catch (err) {
    console.error("ECharts cashflow error:", err);
    inst.clear();
  }
}

/* ===========================
   GRÁFICA 3: Histograma premios por sorteo (+ toggle excluir 0€)
   =========================== */

function renderPrizeHistogram(payload, locale) {
  const echarts = window.echarts;
  if (!echarts) return;

  const el = document.getElementById("rcm-prize-hist");
  if (!el) return;

  const inst = echarts.getInstanceByDom(el) || echarts.init(el);

  const theme = document.body.dataset.theme || "light";
  const lang = document.body.dataset.lang || "es";
  const textColor = theme === "dark" ? "#fff" : "#111";

  const accent =
    getComputedStyle(document.documentElement)
      .getPropertyValue("--color-acento")
      .trim() || "#2563eb";

  const draws = Array.isArray(payload?.draws) ? payload.draws : [];
  const prizes = draws.map((d) => Number(d?.prize) || 0);

  const zeroCount = prizes.reduce((acc, v) => acc + (v === 0 ? 1 : 0), 0);
  const zeroEl = document.getElementById("rcm-zero-count");

  if (zeroEl) {
    if (excludeZeroHistogram) {
      const n = new Intl.NumberFormat(locale).format(zeroCount);
      zeroEl.textContent = tf(
        "results.charts.sections.hist.zeroHidden",
        { n },
        lang === "en" ? `€0: ${n} draws hidden` : `0€: ${n} sorteos ocultos`,
      );
    } else {
      zeroEl.textContent = "";
    }
  }

  const filtered = excludeZeroHistogram
    ? prizes.filter((v) => v !== 0)
    : prizes.slice();

  const footEl = document.getElementById("rcm-prize-hist-foot");

  if (!filtered.length) {
    inst.clear();
    if (footEl) {
      footEl.textContent = t(
        "results.charts.sections.hist.noData",
        lang === "en"
          ? "No data for the current filter."
          : "No hay datos con el filtro actual.",
      );
    }
    return;
  }

  let max = 0;
  for (let i = 0; i < filtered.length; i++) {
    const v = Number(filtered[i]) || 0;
    if (v > max) max = v;
  }

  const bins = buildPrizeBins(max);
  const counts = new Array(bins.length).fill(0);

  for (const v of filtered) {
    const idx = findBinIndex(v, bins);
    if (idx >= 0) counts[idx]++;
  }

  let finalBins = bins;
  let finalCounts = counts;

  if (excludeZeroHistogram) {
    const i0 = finalBins.findIndex((b) => b.min === 0 && b.max === 0);
    if (i0 >= 0) {
      finalBins = finalBins.slice(0, i0).concat(finalBins.slice(i0 + 1));
      finalCounts = finalCounts.slice(0, i0).concat(finalCounts.slice(i0 + 1));
    }
  }

  const labels = finalBins.map((b) => b.label);

  if (footEl) {
    const maxStr = formatCurrency(max, locale);
    footEl.textContent = tf(
      "results.charts.sections.hist.maxPrizeObserved",
      { v: maxStr },
      lang === "en"
        ? `Max prize observed: ${maxStr}.`
        : `Máximo premio observado: ${maxStr}.`,
    );
  }

  const option = {
    tooltip: {
      trigger: "axis",
      confine: true,
      axisPointer: { type: "shadow" },
      formatter: (params) => {
        const p = Array.isArray(params) ? params[0] : null;
        if (!p) return "";
        const label = p.axisValue;
        const value = p.data;
        const total = filtered.length;
        const pct = total > 0 ? ((value / total) * 100).toFixed(1) : "0.0";
        return `${label}<br/>${t(
          "results.charts.common.draws",
          lang === "en" ? "Draws" : "Sorteos",
        )}: <strong>${new Intl.NumberFormat(locale).format(
          value,
        )}</strong> (${pct}%)`;
      },
    },
    grid: { left: 14, right: 14, top: 16, bottom: 42, containLabel: true },
    xAxis: {
      type: "category",
      data: labels,
      axisLabel: {
        color: textColor,
        interval: 0,
        rotate: labels.length > 12 ? 35 : 0,
      },
      axisLine: { lineStyle: { color: textColor } },
    },
    yAxis: {
      type: "value",
      axisLabel: {
        color: textColor,
        formatter: (v) => new Intl.NumberFormat(locale).format(Number(v) || 0),
      },
      splitLine: { lineStyle: { opacity: 0.15 } },
      axisLine: { lineStyle: { color: textColor } },
    },
    series: [
      {
        name: t(
          "results.charts.common.draws",
          lang === "en" ? "Draws" : "Sorteos",
        ),
        type: "bar",
        data: finalCounts,
        barMaxWidth: 34,
        itemStyle: {
          color: accent,
        },
      },
    ],
    textStyle: { color: textColor },
  };

  try {
    inst.setOption(option, true);
    requestAnimationFrame(() => inst.resize());
  } catch (err) {
    console.error("ECharts histogram error:", err);
    inst.clear();
  }
}

function buildPrizeBins(maxPrize) {
  const bins = [];
  for (let v = 0; v <= 10; v++) {
    bins.push({ min: v, max: v, label: `${v}€` });
  }

  const ranges = [
    { min: 11, max: 19, label: "11–19€" },
    { min: 20, max: 49, label: "20–49€" },
    { min: 50, max: 99, label: "50–99€" },
    { min: 100, max: 199, label: "100–199€" },
    { min: 200, max: 499, label: "200–499€" },
    { min: 500, max: 999, label: "500–999€" },
    { min: 1000, max: Infinity, label: "1000€+" },
  ];

  for (const r of ranges) {
    if (maxPrize >= r.min) bins.push(r);
  }

  return bins;
}

function findBinIndex(value, bins) {
  for (let i = 0; i < bins.length; i++) {
    const b = bins[i];
    if (value >= b.min && value <= b.max) return i;
  }
  return -1;
}

/* ===========================
   GRÁFICA 4: Balance anual (neto por año)
   =========================== */

function renderAnnualNetBar(payload, locale) {
  const echarts = window.echarts;
  if (!echarts) return;

  const el = document.getElementById("rcm-annual-net");
  if (!el) return;

  const inst = echarts.getInstanceByDom(el) || echarts.init(el);

  const theme = document.body.dataset.theme || "light";
  const lang = document.body.dataset.lang || "es";
  const textColor = theme === "dark" ? "#fff" : "#111";

  const green =
    getComputedStyle(document.documentElement)
      .getPropertyValue("--color-exito")
      .trim() || "#16a34a";

  const red =
    getComputedStyle(document.documentElement)
      .getPropertyValue("--color-error")
      .trim() || "#dc2626";

  const draws = Array.isArray(payload?.draws) ? payload.draws : [];
  const totalDraws = Number(payload?.totalDraws) || draws.length || 0;
  const totalSpent = Number(payload?.totalSpent) || 0;
  const spentPerDraw = totalDraws > 0 ? totalSpent / totalDraws : 0;

  const map = new Map();

  for (const d of draws) {
    const dtRaw = d?.date ?? d?.drawDate ?? d?.timestamp ?? null;
    const dt = dtRaw instanceof Date ? dtRaw : new Date(dtRaw);
    if (!dtRaw || Number.isNaN(dt.getTime())) continue;

    const year = String(dt.getFullYear());
    const prize = Number(d?.prize) || 0;

    const net = prize - spentPerDraw;
    if (!Number.isFinite(net)) continue;

    map.set(year, (map.get(year) || 0) + net);
  }

  const years = Array.from(map.keys()).sort((a, b) => Number(a) - Number(b));
  const values = years.map((y) => map.get(y) || 0);

  if (!years.length) {
    inst.clear();
    return;
  }

  const option = {
    tooltip: {
      trigger: "axis",
      confine: true,
      axisPointer: { type: "shadow" },
      formatter: (ps) => {
        const p = Array.isArray(ps) ? ps[0] : null;
        if (!p) return "";
        const y = p.axisValue;
        const v = formatCurrency(p.data, locale);
        return `${t(
          "results.charts.common.year",
          lang === "en" ? "Year" : "Año",
        )}: <strong>${y}</strong><br/>${t(
          "results.charts.common.net",
          lang === "en" ? "Net" : "Neto",
        )}: <strong>${v}</strong>`;
      },
    },

    grid: { left: 14, right: 14, top: 16, bottom: 56, containLabel: true },

    xAxis: {
      type: "category",
      data: years,
      axisLabel: { color: textColor },
      axisLine: { lineStyle: { color: textColor } },
    },

    yAxis: {
      type: "value",
      axisLabel: {
        color: textColor,
        formatter: (v) =>
          new Intl.NumberFormat(locale, {
            style: "currency",
            currency: "EUR",
            maximumFractionDigits: 0,
          }).format(Number(v) || 0),
      },
      splitLine: { lineStyle: { opacity: 0.15 } },
      axisLine: { lineStyle: { color: textColor } },
    },

    dataZoom: [
      { type: "inside", xAxisIndex: 0, start: 0, end: 100 },
      {
        type: "slider",
        xAxisIndex: 0,
        start: 0,
        end: 100,
        height: 18,
        bottom: 8,
      },
    ],

    series: [
      {
        name: t(
          "results.charts.sections.annualNet.title",
          lang === "en" ? "Annual net balance" : "Balance anual (neto)",
        ),
        type: "bar",
        data: values,
        barMaxWidth: 36,
        itemStyle: {
          color: (p) => (Number(p.value) >= 0 ? green : red),
        },
      },
    ],

    textStyle: { color: textColor },
  };

  try {
    inst.setOption(option, true);
    requestAnimationFrame(() => inst.resize());
  } catch (err) {
    console.error("ECharts annual-net error:", err);
    inst.clear();
  }
}
