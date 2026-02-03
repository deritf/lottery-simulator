// assets/js/shared/ui/investment-line-race.js

import { EventBus } from "../utils/events.js";
import { getCurrentI18nDict } from "../../app/i18n.js";

let chart = null;

let lastPayload = { labels: [], series: [] };

let visibleMap = {};

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

  // lotería
  if (s.includes("loter") || s.includes("lottery")) return "lotteryNet";

  // MSCI World
  if (s.includes("msci") && s.includes("world")) return "msciWorld";

  // S&P 500 (cobertura EUR / hedged / spx)
  if (
    s.includes("s&p") ||
    s.includes("sp 500") ||
    s.includes("sp500") ||
    s.includes("spx")
  ) {
    return "sp500HedgedEur";
  }

  // STOXX Europe 600
  if ((s.includes("stoxx") || s.includes("stoxx europe")) && s.includes("600"))
    return "stoxx600";

  // Euro Stoxx 50
  if (s.includes("euro") && s.includes("stoxx") && s.includes("50"))
    return "euroStoxx50";

  // IBEX 35 TR
  if (s.includes("ibex") && (s.includes("tr") || s.includes("ibextr")))
    return "ibex35TR";

  return null;
}

function getLang() {
  return document.body?.dataset?.lang === "en" ? "en" : "es";
}

function formatMoneyLikeUser(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return String(v);

  const lang = getLang();
  const locale = lang === "en" ? "en-GB" : "es-ES";

  return new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(n);
}

function translateSeriesName(rawName) {
  const dict =
    typeof getCurrentI18nDict === "function" ? getCurrentI18nDict() : null;
  const key = seriesKeyFromName(rawName);
  if (!dict || !key) return rawName;

  const v = getByPath(dict, `ui.investment.series.${key}`);
  return typeof v === "string" && v.trim() ? v : rawName;
}

let resizeObserver = null;

function hasSize(el) {
  if (!el) return false;
  return el.clientWidth > 0 && el.clientHeight > 0;
}

function ensureChart() {
  const el = document.getElementById("investment-line-race");
  if (!el) return null;

  if (!hasSize(el)) return null;

  if (!chart) {
    chart = echarts.init(el);
    chart.resize();

    window.addEventListener("resize", () => {
      if (chart) chart.resize();
    });

    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(() => {
        if (chart) chart.resize();
      });
      resizeObserver.observe(el);
    }
  }
  return chart;
}

function buildAllVisibleMap(series) {
  const map = {};
  for (const s of series || []) map[s.name] = true;
  return map;
}

function mergeVisibleMap(current, incoming, series) {
  const next = { ...(current || {}) };

  for (const s of series || []) {
    if (!(s.name in next)) next[s.name] = true;
  }

  for (const [k, v] of Object.entries(incoming || {})) {
    next[k] = Boolean(v);
  }

  return next;
}

function getVisibleSeries(payload) {
  const all = payload?.series || [];
  return all.filter((s) => visibleMap[s.name] !== false);
}

function cssVar(name, fallback = "") {
  const body = document.body;
  const root = document.documentElement;

  const v1 = body ? getComputedStyle(body).getPropertyValue(name) : "";
  const s1 = (v1 || "").trim();
  if (s1) return s1;

  const v2 = root ? getComputedStyle(root).getPropertyValue(name) : "";
  const s2 = (v2 || "").trim();
  if (s2) return s2;

  return fallback;
}

function isDark() {
  return document.body?.dataset?.theme === "dark";
}

function formatAxisNumber(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return String(v);

  const abs = Math.abs(n);
  if (abs >= 1e9) return `${Math.round((n / 1e9) * 10) / 10}B`;
  if (abs >= 1e6) return `${Math.round((n / 1e6) * 10) / 10}M`;
  if (abs >= 1e3) return `${Math.round((n / 1e3) * 10) / 10}k`;
  return String(Math.round(n));
}

function hexToRgb(hex) {
  const h = String(hex || "").trim();
  if (!h.startsWith("#")) return null;

  const raw = h.slice(1);
  if (raw.length === 3) {
    const r = parseInt(raw[0] + raw[0], 16);
    const g = parseInt(raw[1] + raw[1], 16);
    const b = parseInt(raw[2] + raw[2], 16);
    return { r, g, b };
  }
  if (raw.length === 6) {
    const r = parseInt(raw.slice(0, 2), 16);
    const g = parseInt(raw.slice(2, 4), 16);
    const b = parseInt(raw.slice(4, 6), 16);
    return { r, g, b };
  }
  return null;
}

function relativeLuminance({ r, g, b }) {
  const toLin = (c) => {
    const x = c / 255;
    return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
  };
  const R = toLin(r);
  const G = toLin(g);
  const B = toLin(b);
  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}

function isTooLightForLightTheme(color) {
  const rgb = hexToRgb(color);
  if (!rgb) return false;
  const lum = relativeLuminance(rgb);
  return lum > 0.78;
}

function getCurrentZoomState(c) {
  if (!c || !c.getOption) return null;
  try {
    const opt = c.getOption();
    const dz = Array.isArray(opt?.dataZoom) ? opt.dataZoom : [];
    const z = dz[1] || dz[0];
    if (!z) return null;

    const start = Number.isFinite(z.start) ? z.start : null;
    const end = Number.isFinite(z.end) ? z.end : null;
    if (start == null || end == null) return null;

    return { start, end };
  } catch {
    return null;
  }
}

function applyZoomState(c, zoom) {
  if (!c || !zoom || !c.dispatchAction) return;
  try {
    c.dispatchAction({
      type: "dataZoom",
      start: zoom.start,
      end: zoom.end,
    });
  } catch {}
}

let pendingRaf = 0;

function render(payload) {
  const el = document.getElementById("investment-line-race");
  const c = ensureChart();

  if (!c) {
    const results = document.getElementById("results");
    const resultsHidden = results?.hasAttribute("hidden");

    if (resultsHidden) return;

    if (el && pendingRaf < 5) {
      pendingRaf += 1;
      requestAnimationFrame(() => render(payload));
    }
    return;
  }

  pendingRaf = 0;

  const labels = payload?.labels || [];
  const visibleSeries = getVisibleSeries(payload);

  const prevZoom = getCurrentZoomState(c);

  const textPrimaryRaw = cssVar(
    "--color-texto-principal",
    isDark() ? "#f2f4f8" : "#111318",
  );
  const textSecondary = cssVar(
    "--color-texto-secundario",
    isDark() ? "#c7cbd4" : "#4b5563",
  );
  const border = cssVar("--color-borde-1", isDark() ? "#2b2f38" : "#e5e7eb");

  let legendText = textPrimaryRaw;
  if (!isDark() && isTooLightForLightTheme(legendText)) {
    legendText = "#111318";
  }
  if (isDark()) {
    legendText = textSecondary || "#c7cbd4";
  }

  const option = {
    animation: true,

    tooltip: {
      trigger: "axis",
      formatter: (params) => {
        const list = Array.isArray(params) ? params : [];
        if (!list.length) return "";

        const axis = list[0]?.axisValueLabel ?? "";
        const lines = [axis];

        for (const p of list) {
          const name = translateSeriesName(p.seriesName);
          const v = Array.isArray(p.value) ? p.value[1] : p.value;
          lines.push(`${p.marker || ""} ${name}: ${formatMoneyLikeUser(v)}`);
        }

        return lines.join("<br/>");
      },
    },

    grid: {
      left: 28,
      right: 18,
      top: 70,
      bottom: 56,
      containLabel: true,
    },

    dataZoom: [
      { type: "inside", xAxisIndex: 0, filterMode: "none" },
      {
        type: "slider",
        xAxisIndex: 0,
        height: 18,
        bottom: 16,
        borderColor: border,
        textStyle: { color: textSecondary },
        fillerColor: "rgba(0,0,0,0.06)",
        handleSize: 14,
      },
    ],

    xAxis: {
      type: "category",
      data: labels,
      boundaryGap: false,
      axisLabel: { color: textSecondary, margin: 12 },
      axisLine: { lineStyle: { color: border } },
      axisTick: { lineStyle: { color: border } },
      splitLine: { show: false },
    },

    yAxis: {
      type: "value",
      axisLabel: {
        color: textSecondary,
        margin: 14,
        formatter: formatAxisNumber,
      },
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { lineStyle: { color: border } },
    },

    legend: {
      show: true,
      top: 10,
      left: 10,
      right: 10,
      type: "scroll",
      orient: "horizontal",
      selectedMode: true,
      itemGap: 14,
      textStyle: {
        color: legendText,
        overflow: "truncate",
        width: 180,
        fontWeight: 650,
      },

      formatter: (name) => translateSeriesName(name),

      pageTextStyle: { color: textSecondary },
      pageIconColor: textSecondary,
      pageIconInactiveColor: border,
      inactiveColor: isDark() ? "#6b7280" : "#9ca3af",
    },

    series: visibleSeries.map((s) => ({
      name: s.name,
      type: "line",
      smooth: true,
      showSymbol: false,
      data: s.data || [],
      emphasis: { focus: "series" },
    })),
  };

  c.setOption(option, { notMerge: true, lazyUpdate: true });

  if (prevZoom) applyZoomState(c, prevZoom);
}

window.addEventListener("investment:update", (ev) => {
  lastPayload = ev?.detail || { labels: [], series: [] };

  if (!Object.keys(visibleMap).length) {
    visibleMap = buildAllVisibleMap(lastPayload.series);
  } else {
    visibleMap = mergeVisibleMap(visibleMap, null, lastPayload.series);
  }

  render(lastPayload);

  window.dispatchEvent(
    new CustomEvent("investment:series-list", {
      detail: {
        series: (lastPayload.series || []).map((s) => s.name),
        visibleMap,
      },
    }),
  );
});

window.addEventListener("investment:visibility", (ev) => {
  const incoming = ev?.detail?.visibleMap || {};
  visibleMap = mergeVisibleMap(visibleMap, incoming, lastPayload.series);
  render(lastPayload);
});

window.addEventListener("theme:changed", () => {
  if (!chart) return;
  render(lastPayload);
});

EventBus.on("lang:changed", () => {
  if (!chart) return;
  render(lastPayload);
});

function observeResultsVisibility() {
  const results = document.getElementById("results");
  if (!results) return;

  const mo = new MutationObserver(() => {
    const isHidden = results.hasAttribute("hidden");
    if (!isHidden) {
      requestAnimationFrame(() => {
        if (chart) chart.resize();
        render(lastPayload);
      });
    }
  });

  mo.observe(results, { attributes: true, attributeFilter: ["hidden"] });
}

document.addEventListener("DOMContentLoaded", observeResultsVisibility);
