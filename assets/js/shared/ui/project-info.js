import { EventBus } from "../utils/events.js";

const STORAGE_KEY = "project_acknowledged_v1";

let focusables = [];
let first = null;
let last = null;
let trapHandler = null;
let lastActive = null;

function isAccepted() {
  try {
    return localStorage.getItem(STORAGE_KEY) === "accepted";
  } catch {
    return false;
  }
}

function setAccepted() {
  try {
    localStorage.setItem(STORAGE_KEY, "accepted");
  } catch {}
}

function getFocusable(container) {
  return Array.from(
    container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    ),
  ).filter(
    (el) => !el.hasAttribute("disabled") && !el.getAttribute("aria-disabled"),
  );
}

function trapFocus(e) {
  if (e.key !== "Tab") return;

  if (focusables.length === 0) {
    e.preventDefault();
    return;
  }

  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault();
    first.focus();
  }
}

function openModal(modal, { force = false } = {}) {
  const content = modal.querySelector(".modal__content") || modal;

  lastActive = document.activeElement;

  modal.hidden = false;
  modal.classList.add("is-open");

  focusables = getFocusable(content);
  first = focusables[0] || null;
  last = focusables[focusables.length - 1] || null;

  trapHandler = trapFocus;
  document.addEventListener("keydown", trapHandler);

  if (first) first.focus();

  if (force) document.body.classList.add("modal-lock");
  modal.dataset.force = force ? "1" : "0";
}

function closeModal(modal) {
  modal.classList.remove("is-open");
  modal.hidden = true;

  document.removeEventListener("keydown", trapHandler);
  document.body.classList.remove("modal-lock");

  const toRestore = lastActive;
  lastActive = null;
  if (toRestore && typeof toRestore.focus === "function") toRestore.focus();
}

function initProjectInfo() {
  const modal = document.getElementById("project-info");
  const accept = document.getElementById("project-info-accept");
  const footerLink = document.getElementById("open-project-info");
  const overlay = modal?.querySelector(".modal__overlay");

  if (!modal || !accept) return;

  if (!isAccepted()) {
    openModal(modal, { force: true });
  }

  accept.addEventListener("click", () => {
    setAccepted();
    closeModal(modal);
  });

  if (footerLink) {
    footerLink.addEventListener("click", (e) => {
      e.preventDefault();
      openModal(modal, { force: false });
    });
  }

  document.addEventListener("keydown", (e) => {
    if (modal.hidden) return;
    if (e.key !== "Escape") return;
    if (modal.dataset.force === "1") return;
    closeModal(modal);
  });

  if (overlay) {
    overlay.addEventListener("click", () => {
      if (modal.dataset.force === "1") return;
      closeModal(modal);
    });
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initProjectInfo);
} else {
  initProjectInfo();
}
