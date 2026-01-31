// assets/js/shared/utils/format.js

export function formatCurrency(value, locale = "es-ES", currency = "EUR") {
  if (value == null || isNaN(value)) return "—";
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatNumber(value, locale = "es-ES") {
  if (value == null || isNaN(value)) return "—";
  return new Intl.NumberFormat(locale).format(value);
}

export function formatDate(date, locale = "es-ES", options = {}) {
  if (!date) return "—";
  const dateObj = date instanceof Date ? date : new Date(date);
  if (isNaN(dateObj.getTime())) return "—";

  const defaultOptions = { year: "numeric", month: "long", day: "numeric" };
  return new Intl.DateTimeFormat(locale, {
    ...defaultOptions,
    ...options,
  }).format(dateObj);
}

export function formatDateShort(date, locale = "es-ES") {
  return formatDate(date, locale, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

export function formatWeekdayLong(date, locale = "es-ES") {
  if (!date) return "—";
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat(locale, { weekday: "long" }).format(d);
}

export function formatPercent(value, decimals = 2, locale = "es-ES") {
  if (value == null || isNaN(value)) return "—";
  const d = Math.max(0, Number(decimals) || 0);
  return new Intl.NumberFormat(locale, {
    style: "percent",
    minimumFractionDigits: d,
    maximumFractionDigits: d,
  }).format(value);
}

export function formatPercentSmart(value, maxDecimals = 2, locale = "es-ES") {
  if (value == null || isNaN(value)) return "—";
  const v = Number(value);
  const pct = v * 100;
  const isInt = Math.abs(pct - Math.round(pct)) < 1e-9;
  const decimals = isInt ? 0 : Math.max(0, Number(maxDecimals) || 0);
  return formatPercent(v, decimals, locale);
}

export function padNumber(num, width) {
  const str = String(num);
  return str.length >= width ? str : "0".repeat(width - str.length) + str;
}

export function formatYears(years, decimals = 1) {
  return `${years.toFixed(decimals)}y`;
}

export function formatBalance(value, locale = "es-ES") {
  if (value == null || isNaN(value)) return "—";
  const formatted = formatCurrency(Math.abs(value), locale);
  if (value > 0) return `+${formatted}`;
  if (value < 0) return `−${formatted}`;
  return formatted;
}

export function formatCompact(value, locale = "es-ES") {
  if (value == null || isNaN(value)) return "—";
  return new Intl.NumberFormat(locale, {
    notation: "compact",
    compactDisplay: "short",
  }).format(value);
}
