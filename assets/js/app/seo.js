// assets/js/app/seo.js

import { EventBus } from "../shared/utils/events.js";

/**
 * SEO dinámico (title, meta, canonical, OG, Twitter, JSON-LD)
 * Reacciona a:
 * - lang:changed (recibe dict)
 * - game:changed (app.js llama a applySEO)
 */

function setMetaById(id, content) {
  const el = document.getElementById(id);
  if (!el) return;
  el.setAttribute("content", content || "");
}

function setLinkById(id, href) {
  const el = document.getElementById(id);
  if (!el) return;
  el.setAttribute("href", href || "");
}

function safeJsonParse(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function setJsonLdById(id, obj) {
  const el = document.getElementById(id);
  if (!el) return;

  const current = safeJsonParse(el.textContent || "");
  const next = obj || {};

  const a = JSON.stringify(current || {});
  const b = JSON.stringify(next || {});
  if (a === b) return;

  el.textContent = JSON.stringify(next);
}

function getGameSeo(dict, gameId) {
  const fallback = dict?.seo?.default || {};
  const gameSeo = dict?.seo?.games?.[gameId] || {};
  return {
    title: gameSeo.title || fallback.title || "",
    description: gameSeo.description || fallback.description || "",
  };
}

function normalizeBaseUrl(url) {
  if (!url) return "";
  return url.endsWith("/") ? url : `${url}/`;
}

function buildPageUrl(baseUrl, gameId, lang) {
  const base = normalizeBaseUrl(baseUrl);
  if (!base) return "";

  const u = new URL(base);
  u.searchParams.set("game", gameId || "primitiva");
  u.searchParams.set("lang", lang || "es");
  return u.toString();
}

export function initSEO() {
  EventBus.on("lang:changed", ({ dict }) => {
    if (!dict) return;
    applySEO(dict);
  });
}

export function applySEO(dict) {
  const baseUrl = dict?.seo?.baseUrl || "";
  const siteName = dict?.seo?.siteName || "Lottery Simulator";

  const gameId = document.body?.dataset?.game || "primitiva";
  const lang =
    document.documentElement?.lang || document.body?.dataset?.lang || "es";

  const { title, description } = getGameSeo(dict, gameId);

  // Title
  document.title = title || siteName;

  // Meta description
  setMetaById("meta-description", description);

  // Canonical + hreflang
  const pageUrl = buildPageUrl(baseUrl, gameId, lang);
  setLinkById("canonical", pageUrl);

  // hreflang (mismo game pero distinto idioma)
  setLinkById("hreflang-es", buildPageUrl(baseUrl, gameId, "es"));
  setLinkById("hreflang-en", buildPageUrl(baseUrl, gameId, "en"));
  setLinkById("hreflang-xdefault", buildPageUrl(baseUrl, gameId, "es"));

  // Open Graph
  setMetaById("og-title", title || siteName);
  setMetaById("og-description", description);
  setMetaById("og-url", pageUrl);
  setMetaById("og-locale", lang === "en" ? "en_US" : "es_ES");

  // Twitter
  setMetaById("tw-title", title || siteName);
  setMetaById("tw-description", description);

  // JSON-LD Website
  setJsonLdById("ld-website", {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: siteName,
    url: normalizeBaseUrl(baseUrl) || pageUrl || "",
  });

  // JSON-LD App
  setJsonLdById("ld-app", {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: siteName,
    applicationCategory: "EducationalApplication",
    operatingSystem: "Web",
    isAccessibleForFree: true,
  });
}
