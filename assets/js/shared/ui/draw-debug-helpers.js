// assets/js/shared/ui/draw-debug-helpers.js

import {
  formatCurrency,
  formatNumber,
  formatPercent,
  padNumber,
} from "../utils/format.js";

/* ===========================
   FORMATEO DE LISTAS
   =========================== */

export function fmtListPlain(nums, pad) {
  if (!Array.isArray(nums) || nums.length === 0) return "—";
  return nums
    .map((n) => `<span class="number">${padNumber(n, pad)}</span>`)
    .join(" ");
}

export function fmtListWithMatches(nums, pad, yourSet) {
  if (!Array.isArray(nums) || nums.length === 0) return "—";
  return nums
    .map((n) => {
      const isMatch = yourSet && yourSet.has(n);
      const cls = isMatch ? "number ddm__hit" : "number";
      return `<span class="${cls}">${padNumber(n, pad)}</span>`;
    })
    .join(" ");
}

export function fmtListWithMatchesPlusComplementario(
  nums,
  pad,
  drawnSet,
  compSet,
) {
  if (!Array.isArray(nums) || nums.length === 0) return "—";
  return nums
    .map((n) => {
      const isMain = drawnSet && drawnSet.has(n);
      const isComp = compSet && compSet.has(n);
      const cls = isMain || isComp ? "number ddm__hit" : "number";
      return `<span class="${cls}">${padNumber(n, pad)}</span>`;
    })
    .join(" ");
}

export function fmtReintegro(v, isMatch, label = "R") {
  if (v === null || v === undefined) return "";
  const cls = isMatch ? "reintegro ddm__hit" : "reintegro";
  return ` <span class="${cls}">${label}:${padNumber(v, 1)}</span>`;
}

/* ===========================
   FORMATEO DE VALORES
   =========================== */

export function fmtMoney(v, locale) {
  if (!Number.isFinite(v)) return "—";
  return formatCurrency(v, locale);
}

export function fmtInt(v, locale) {
  if (!Number.isFinite(v)) return "—";
  return formatNumber(v, locale);
}

export function fmtPct(v, decimals, locale) {
  if (!Number.isFinite(v)) return "—";
  return formatPercent(v, decimals, locale);
}

export function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

/* ===========================
   ESCAPADO HTML
   =========================== */

export function escapeAttr(s) {
  return String(s || "")
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

export function escapeHtml(s) {
  return String(s || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/* ===========================
   UTILIDADES
   =========================== */

export function getByPath(obj, path) {
  if (!obj || !path) return null;
  return path
    .split(".")
    .reduce((acc, k) => (acc && acc[k] != null ? acc[k] : null), obj);
}

/* ===========================
   BUILDERS HTML
   =========================== */

export function row(labelHtml, valueHtml) {
  return `
    <div class="ddm__row">
      <span>${labelHtml}</span>
      <strong>${valueHtml}</strong>
    </div>
  `;
}

export function sumRow(sign, labelHtml, valueHtml, valueClass = "") {
  const signClass =
    sign === "+" ? "ddm__plus" : sign === "−" ? "ddm__minus" : "";
  return `
    <div class="ddm__sumRow">
      <div class="ddm__sumSign ${signClass}">${sign || ""}</div>
      <div class="ddm__sumLabel">${labelHtml}</div>
      <div class="ddm__sumValue ${valueClass}">${valueHtml}</div>
    </div>
  `;
}

/* ===========================
   ICONOS SVG
   =========================== */

export function iconSvg(type) {
  if (type === "trophy") {
    return `
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M8 4h8v3a4 4 0 0 1-8 0V4Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M6 5H4v3a4 4 0 0 0 4 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M18 5h2v3a4 4 0 0 1-4 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M12 11v4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M9 19h6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M10 15h4v4h-4z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
      </svg>
    `;
  }

  return `
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M8 3h3l1 3 1-3h3l-3 7H11L8 3Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
      <path d="M12 21a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z" stroke="currentColor" stroke-width="2"/>
      <path d="M12 14.5l1.1 2.2 2.4.35-1.75 1.7.41 2.4L12 20.1l-2.16 1.14.41-2.4L8.5 17.05l2.4-.35L12 14.5Z" fill="currentColor"/>
    </svg>
  `;
}

/* ===========================
   AYUDA: HOTSPOT CLICABLE
   =========================== */

export function helpHotspot(labelHtml, helpKey, hintText) {
  const key = escapeAttr(helpKey || "");
  const hint = hintText ? ` data-hint="${escapeAttr(hintText)}"` : "";
  return `
    <button type="button" class="ddm__helpHotspot" data-ddm-help="${key}"${hint}>
      ${labelHtml}
    </button>
  `;
}

export function mutedNote(html) {
  return `<div class="ddm__muted">${html}</div>`;
}

/* ===========================
   SORTEOS SUPLEMENTARIOS
   (Joker / etc.)
   =========================== */

export function normalizeDigits(v) {
  if (v == null) return null;
  if (Array.isArray(v)) return v.map((x) => String(x));
  const s = String(v).trim();
  if (!s) return null;
  return s.split("").map((ch) => ch);
}

export function fmtDigitsWithMatches(digits, yourDigits) {
  if (!Array.isArray(digits) || digits.length === 0) return "—";
  const your =
    Array.isArray(yourDigits) && yourDigits.length === digits.length
      ? yourDigits.map(String)
      : null;

  return digits
    .map((d, i) => {
      const isMatch = your ? String(d) === String(your[i]) : false;
      const cls = isMatch ? "ddm__digit ddm__hit" : "ddm__digit";
      return `<span class="${cls}">${escapeHtml(String(d))}</span>`;
    })
    .join("");
}
