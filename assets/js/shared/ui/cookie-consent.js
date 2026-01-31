// assets/js/shared/ui/cookie-consent.js

import { EventBus } from "../utils/events.js";

const StorageKeys = {
  COOKIE_CONSENT: "cookie_consent_v1",
};

let focusableEls = [];
let firstFocusable = null;
let lastFocusable = null;
let keydownHandler = null;

function getStoredConsent() {
  try {
    const v = localStorage.getItem(StorageKeys.COOKIE_CONSENT);
    return v === "accepted" || v === "rejected" ? v : null;
  } catch {
    return null;
  }
}

function setStoredConsent(value) {
  try {
    localStorage.setItem(StorageKeys.COOKIE_CONSENT, value);
  } catch {}
}

function getFocusableElements(container) {
  return Array.from(
    container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    ),
  ).filter((el) => !el.hasAttribute("disabled"));
}

function trapFocus(e) {
  if (e.key !== "Tab") return;

  if (focusableEls.length === 0) {
    e.preventDefault();
    return;
  }

  if (e.shiftKey) {
    if (document.activeElement === firstFocusable) {
      e.preventDefault();
      lastFocusable.focus();
    }
  } else {
    if (document.activeElement === lastFocusable) {
      e.preventDefault();
      firstFocusable.focus();
    }
  }
}

function enableFocusTrap(banner) {
  focusableEls = getFocusableElements(banner);
  firstFocusable = focusableEls[0] || null;
  lastFocusable = focusableEls[focusableEls.length - 1] || null;

  keydownHandler = trapFocus;
  document.addEventListener("keydown", keydownHandler);

  if (firstFocusable) {
    firstFocusable.focus();
  }
}

function disableFocusTrap() {
  if (keydownHandler) {
    document.removeEventListener("keydown", keydownHandler);
    keydownHandler = null;
  }
  focusableEls = [];
  firstFocusable = null;
  lastFocusable = null;
}

function showBanner(banner) {
  banner.hidden = false;
  banner.classList.add("is-open");
  enableFocusTrap(banner);
}

function hideBanner(banner) {
  banner.classList.remove("is-open");
  banner.hidden = true;
  disableFocusTrap();
}

function initCookieConsent() {
  const banner = document.getElementById("cookie-consent");
  if (!banner) return;

  const acceptBtn = document.getElementById("cookie-accept");
  const rejectBtn = document.getElementById("cookie-reject");
  if (!acceptBtn || !rejectBtn) return;

  const existing = getStoredConsent();
  if (existing) {
    hideBanner(banner);
    return;
  }

  showBanner(banner);

  acceptBtn.addEventListener("click", () => {
    setStoredConsent("accepted");
    hideBanner(banner);
    EventBus.emit("cookies:consent", { value: "accepted" });
  });

  rejectBtn.addEventListener("click", () => {
    setStoredConsent("rejected");
    hideBanner(banner);
    EventBus.emit("cookies:consent", { value: "rejected" });
  });

  document.addEventListener("keydown", (e) => {
    if (banner.hidden) return;
    if (e.key === "Escape") {
      setStoredConsent("rejected");
      hideBanner(banner);
      EventBus.emit("cookies:consent", { value: "rejected" });
    }
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initCookieConsent);
} else {
  initCookieConsent();
}
