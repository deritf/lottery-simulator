// assets/js/shared/ui/footer-bmc.js

import { EventBus } from "../utils/events.js";
import { getByPath } from "../utils/i18n-path.js";

function safeYear(fallback = 2026) {
  try {
    const y = new Date().getFullYear();
    return Number.isFinite(y) && y >= 1970 ? y : fallback;
  } catch {
    return fallback;
  }
}

function applyYearToken() {
  const el = document.querySelector('[data-i18n="ui.footer.rights"]');
  if (!el) return;

  const y = safeYear(2026);
  const raw = el.textContent || "";

  const next = raw
    .replaceAll("{year}", String(y))
    .replaceAll("{{year}}", String(y));

  if (next !== raw) el.textContent = next;
}

function getSupportText(dict) {
  const v = dict ? getByPath(dict, "ui.footer.bmcButtonText") : null;
  return typeof v === "string" && v.trim() ? v : "Support the project";
}

function renderSupportLink(container, dict) {
  if (!container) return;

  container.innerHTML = "";

  const slug = container.getAttribute("data-bmc-slug") || "deritfdev";
  container.setAttribute("data-bmc-slug", slug);

  const text = getSupportText(dict);

  const a = document.createElement("a");
  a.className = "bmc-link";
  a.href = `https://www.buymeacoffee.com/${encodeURIComponent(slug)}`;
  a.target = "_blank";
  a.rel = "noopener noreferrer";
  a.setAttribute("aria-label", text);

  const icon = document.createElement("span");
  icon.className = "bmc-link__icon";
  icon.textContent = "☕";

  const label = document.createElement("span");
  label.className = "bmc-link__text";
  label.textContent = text;

  a.appendChild(icon);
  a.appendChild(label);
  container.appendChild(a);
}

function initFooter() {
  const bmc = document.getElementById("bmc-container");
  if (!bmc) return;

  renderSupportLink(bmc, null);
  applyYearToken();

  const rights = document.querySelector('[data-i18n="ui.footer.rights"]');
  if (rights) {
    const obs = new MutationObserver(() => applyYearToken());
    obs.observe(rights, {
      childList: true,
      characterData: true,
      subtree: true,
    });
  }

  EventBus.on("theme:changed", () => {
    renderSupportLink(bmc, null);
    applyYearToken();
  });

  EventBus.on("lang:changed", ({ dict } = {}) => {
    renderSupportLink(bmc, dict || null);
    applyYearToken();
  });

  applyYearToken();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initFooter);
} else {
  initFooter();
}
