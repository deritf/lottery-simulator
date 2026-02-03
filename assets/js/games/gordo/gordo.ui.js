// assets/js/games/gordo/gordo.ui.js

import { EventBus } from "../../shared/utils/events.js";
import { getCurrentI18nDict } from "../../app/i18n.js";
import {
  createNumberGrid,
  updateGridSelection,
} from "../../shared/components/number-grid.js";
import {
  createNumberPicker,
  updatePickerSelection,
} from "../../shared/components/number-picker.js";

export class GordoUI {
  constructor() {
    this.main = new Set();
    this.clave = null;

    this.mainGridContainer = null;
    this.claveContainer = null;

    this.slotsMainEl = null;
    this.slotsClaveEl = null;

    this.onAutoPick = this.onAutoPick.bind(this);
    this.onClear = this.onClear.bind(this);
    this.onLangChanged = this.onLangChanged.bind(this);
  }

  async init() {
    this.mainGridContainer = document.getElementById("number-grid");
    this.slotsMainEl = document.getElementById("slots-main");
    this.slotsClaveEl = document.getElementById("slots-clave");

    let claveSection = document.getElementById("gordo-clave-section");
    if (!claveSection) {
      claveSection = document.createElement("section");
      claveSection.id = "gordo-clave-section";
      claveSection.className = "card card--padded";
      claveSection.setAttribute("aria-labelledby", "gordo-clave-title");
      claveSection.setAttribute("data-game-only", "gordo");

      const title = document.createElement("h2");
      title.id = "gordo-clave-title";
      title.className = "card-title";
      title.textContent = this.getClaveTitle();

      this.claveContainer = document.createElement("div");
      this.claveContainer.id = "gordo-clave-grid";

      this.claveContainer.className =
        "reintegro-grid reintegro-grid--center-wrap";

      claveSection.appendChild(title);
      claveSection.appendChild(this.claveContainer);

      const mainSection = this.mainGridContainer?.closest("section");
      if (mainSection && mainSection.parentElement) {
        mainSection.parentElement.insertBefore(
          claveSection,
          mainSection.nextSibling,
        );
      }
    } else {
      this.claveContainer = document.getElementById("gordo-clave-grid");
    }

    if (!this.mainGridContainer || !this.claveContainer) {
      console.error("GordoUI: No se encontraron los contenedores necesarios");
      return;
    }

    this.renderSlots();

    this.render();

    EventBus.on("ui:autoPick", this.onAutoPick);
    EventBus.on("ui:clear", this.onClear);
    EventBus.on("lang:changed", this.onLangChanged);

    this.emitSelection();
  }

  destroy() {
    EventBus.off?.("ui:autoPick", this.onAutoPick);
    EventBus.off?.("ui:clear", this.onClear);
    EventBus.off?.("lang:changed", this.onLangChanged);

    if (this.mainGridContainer) this.mainGridContainer.innerHTML = "";
    if (this.claveContainer) this.claveContainer.innerHTML = "";

    // No borro slots del HTML, pero sí los dejo en estado vacío
    this.resetSlots();

    const claveSection = document.getElementById("gordo-clave-section");
    if (claveSection) claveSection.remove();

    this.mainGridContainer = null;
    this.claveContainer = null;
    this.slotsMainEl = null;
    this.slotsClaveEl = null;
  }

  getClaveTitle() {
    const dict = getCurrentI18nDict();
    const lang = document.body.dataset.lang || "es";
    return (
      getByPath(dict, "games.gordo.pick.clave") ||
      (lang === "en"
        ? "Pick the key number (0-9)"
        : "Elige el número clave (0-9)")
    );
  }

  render() {
    // Grid 1-54 (5 números)
    createNumberGrid({
      min: 1,
      max: 54,
      columns: 9,
      pad: 2,
      className: "number-btn",
      container: this.mainGridContainer,
      onSelect: (n) => this.toggleMain(n),
    });

    // Clave 0-9 (1 número)
    createNumberPicker({
      min: 0,
      max: 9,
      pad: 1,
      className: "reintegro-btn",
      container: this.claveContainer,
      onSelect: (n) => this.setClave(n),
    });

    const claveTitle = document.getElementById("gordo-clave-title");
    if (claveTitle) claveTitle.textContent = this.getClaveTitle();

    this.paintSelection();
  }

  // =========================
  // SLOTS (Tu selección) — idénticos a PrimitivaUI
  // =========================

  renderSlots() {
    if (this.slotsMainEl) {
      this.slotsMainEl.innerHTML = "";
      for (let i = 0; i < 5; i++)
        this.slotsMainEl.appendChild(this.createSlot());
    }

    if (this.slotsClaveEl) {
      this.slotsClaveEl.innerHTML = "";
      this.slotsClaveEl.appendChild(this.createSlot());
    }
  }

  createSlot() {
    const slot = document.createElement("div");
    slot.className = "slot";
    slot.textContent = "—";
    slot.setAttribute("role", "listitem");
    return slot;
  }

  resetSlots() {
    if (this.slotsMainEl) {
      this.slotsMainEl.querySelectorAll(".slot").forEach((s) => {
        s.textContent = "—";
        s.classList.remove("is-filled");
      });
    }
    if (this.slotsClaveEl) {
      this.slotsClaveEl.querySelectorAll(".slot").forEach((s) => {
        s.textContent = "—";
        s.classList.remove("is-filled");
      });
    }
  }

  updateSlotsUI() {
    const mainSorted = Array.from(this.main).sort((a, b) => a - b);

    // Main slots
    if (this.slotsMainEl) {
      const slots = this.slotsMainEl.querySelectorAll(".slot");
      slots.forEach((slot, i) => {
        const value = mainSorted[i];
        if (value !== undefined) {
          slot.textContent = padNumber(value, 2);
          slot.classList.add("is-filled");
        } else {
          slot.textContent = "—";
          slot.classList.remove("is-filled");
        }
      });
    }

    // Clave slot
    if (this.slotsClaveEl) {
      const slot = this.slotsClaveEl.querySelector(".slot");
      if (slot) {
        if (this.clave !== null && this.clave !== undefined) {
          slot.textContent = padNumber(this.clave, 1);
          slot.classList.add("is-filled");
        } else {
          slot.textContent = "—";
          slot.classList.remove("is-filled");
        }
      }
    }
  }

  // =========================
  // Selección / Pintado
  // =========================

  paintSelection() {
    if (this.mainGridContainer) {
      updateGridSelection(this.mainGridContainer, this.main);
    }
    if (this.claveContainer) {
      updatePickerSelection(this.claveContainer, this.clave);
    }

    this.updateSlotsUI();
  }

  toggleMain(n) {
    if (this.main.has(n)) {
      this.main.delete(n);
    } else {
      if (this.main.size >= 5) return;
      this.main.add(n);
    }

    this.paintSelection();
    this.emitSelection();
  }

  setClave(n) {
    this.clave = this.clave === n ? null : n;
    this.paintSelection();
    this.emitSelection();
  }

  emitSelection() {
    const mainArr = Array.from(this.main).sort((a, b) => a - b);

    EventBus.emit("selection:gordo", {
      main: mainArr,
      clave: this.clave,

      numbers: mainArr,
    });
  }

  onAutoPick() {
    this.main.clear();
    while (this.main.size < 5) this.main.add(randInt(1, 54));
    this.clave = randInt(0, 9);

    this.paintSelection();
    this.emitSelection();
  }

  onClear() {
    this.main.clear();
    this.clave = null;

    this.paintSelection();
    this.emitSelection();
  }

  onLangChanged() {
    const claveTitle = document.getElementById("gordo-clave-title");
    if (claveTitle) claveTitle.textContent = this.getClaveTitle();
  }

  getSelection() {
    return {
      main: Array.from(this.main).sort((a, b) => a - b),
      clave: this.clave,
    };
  }

  isSelectionComplete() {
    return (
      this.main.size === 5 && this.clave !== null && this.clave !== undefined
    );
  }
}

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function padNumber(n, width) {
  const s = String(n);
  return s.length >= width ? s : "0".repeat(width - s.length) + s;
}

function getByPath(obj, path) {
  if (!obj || !path) return null;
  return path
    .split(".")
    .reduce((acc, k) => (acc && acc[k] != null ? acc[k] : null), obj);
}
