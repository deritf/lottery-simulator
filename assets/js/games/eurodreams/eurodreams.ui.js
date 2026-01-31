// assets/js/games/eurodreams/eurodreams.ui.js

import { EurodreamsConfig } from "./eurodreams.config.js";
import { EventBus } from "../../shared/utils/events.js";
import {
  createNumberGrid,
  updateGridSelection,
} from "../../shared/components/number-grid.js";
import {
  createNumberPicker,
  updatePickerSelection,
} from "../../shared/components/number-picker.js";

export class EurodreamsUI {
  constructor() {
    this.config = EurodreamsConfig;

    this.main = new Set();
    this.dream = null;

    this.mainGridContainer = null;
    this.dreamGridContainer = null;

    this.slotsMainEl = null;
    this.slotsDreamEl = null;

    this.onAutoPick = this.onAutoPick.bind(this);
    this.onClear = this.onClear.bind(this);
  }

  async init() {
    this.mainGridContainer = document.getElementById("number-grid");
    this.slotsMainEl = document.getElementById("slots-main");

    this.slotsDreamEl = document.getElementById("slots-dream");

    if (!this.mainGridContainer || !this.slotsMainEl) {
      console.error("EurodreamsUI: Elementos DOM necesarios no encontrados");
      return;
    }

    this.setAccentColors();

    let dreamSection = document.getElementById("eurodreams-dream-section");
    if (!dreamSection) {
      dreamSection = document.createElement("section");
      dreamSection.id = "eurodreams-dream-section";
      dreamSection.className = "card card--padded";
      dreamSection.setAttribute("aria-labelledby", "eurodreams-dream-title");
      dreamSection.setAttribute("data-game-only", "eurodreams");

      const title = document.createElement("h2");
      title.id = "eurodreams-dream-title";
      title.className = "card-title";
      title.setAttribute("data-i18n", "ui.sections.dream");
      title.textContent = "Sueño";

      this.dreamGridContainer = document.createElement("div");
      this.dreamGridContainer.id = "dream-grid";
      this.dreamGridContainer.className = "reintegro-grid";

      dreamSection.appendChild(title);
      dreamSection.appendChild(this.dreamGridContainer);

      const mainSection = this.mainGridContainer?.closest("section");
      if (mainSection && mainSection.parentElement) {
        mainSection.parentElement.insertBefore(
          dreamSection,
          mainSection.nextSibling,
        );
      }
    } else {
      this.dreamGridContainer = document.getElementById("dream-grid");
    }

    if (!this.dreamGridContainer) {
      console.error("EurodreamsUI: No se encontró contenedor dream-grid");
      return;
    }

    this.renderSlots();
    this.renderGrids();
    this.paintSelection();

    EventBus.on("ui:autoPick", this.onAutoPick);
    EventBus.on("ui:clear", this.onClear);

    this.emitSelectionState();
  }

  destroy() {
    EventBus.off?.("ui:autoPick", this.onAutoPick);
    EventBus.off?.("ui:clear", this.onClear);

    if (this.mainGridContainer) this.mainGridContainer.innerHTML = "";
    if (this.dreamGridContainer) this.dreamGridContainer.innerHTML = "";
    if (this.slotsMainEl) this.slotsMainEl.innerHTML = "";
    if (this.slotsDreamEl) this.slotsDreamEl.innerHTML = "";

    const dreamSection = document.getElementById("eurodreams-dream-section");
    if (dreamSection) dreamSection.remove();

    this.main.clear();
    this.dream = null;
  }

  setAccentColors() {
    if (this.config.accentVar) {
      document.body.style.setProperty(
        "--color-acento",
        `var(${this.config.accentVar})`,
      );
    }
    if (this.config.accentText) {
      document.body.style.setProperty(
        "--color-acento-text",
        this.config.accentText,
      );
    }
  }

  renderGrids() {
    // Main 1–40 (6 números)
    createNumberGrid({
      min: 1,
      max: 40,
      columns: 8,
      pad: 2,
      className: "number-btn",
      container: this.mainGridContainer,
      onSelect: (n) => this.toggleMain(n),
    });

    // Sueño 1–5 (1)
    createNumberPicker({
      min: 1,
      max: 5,
      pad: 1,
      className: "dream-btn",
      container: this.dreamGridContainer,
      onSelect: (n) => this.setDream(n),
    });
  }

  renderSlots() {
    // 6 slots main
    this.slotsMainEl.innerHTML = "";
    for (let i = 0; i < 6; i++) {
      this.slotsMainEl.appendChild(this.createSlot());
    }

    // 1 slot sueño (si existe en HTML)
    if (this.slotsDreamEl) {
      this.slotsDreamEl.innerHTML = "";
      const slot = this.createSlot();
      slot.classList.add("slot--dream");
      this.slotsDreamEl.appendChild(slot);
    }
  }

  createSlot() {
    const slot = document.createElement("div");
    slot.className = "slot";
    slot.textContent = "—";
    slot.setAttribute("role", "listitem");
    return slot;
  }

  toggleMain(n) {
    if (this.main.has(n)) this.main.delete(n);
    else {
      if (this.main.size >= 6) return;
      this.main.add(n);
    }

    this.paintSelection();
    this.emitSelectionState();
  }

  setDream(n) {
    this.dream = this.dream === n ? null : n;
    this.paintSelection();
    this.emitSelectionState();
  }

  paintSelection() {
    // botones
    updateGridSelection(this.mainGridContainer, this.main);
    updatePickerSelection(this.dreamGridContainer, this.dream);

    // slots
    const sorted = Array.from(this.main).sort((a, b) => a - b);
    const slots = this.slotsMainEl.querySelectorAll(".slot");
    slots.forEach((slot, i) => {
      const v = sorted[i];
      if (v !== undefined) {
        slot.textContent = padNumber(v, 2);
        slot.classList.add("is-filled");
      } else {
        slot.textContent = "—";
        slot.classList.remove("is-filled");
      }
    });

    if (this.slotsDreamEl) {
      const dreamSlot = this.slotsDreamEl.querySelector(".slot");
      if (dreamSlot) {
        if (this.dream != null) {
          dreamSlot.textContent = padNumber(this.dream, 1);
          dreamSlot.classList.add("is-filled");
        } else {
          dreamSlot.textContent = "—";
          dreamSlot.classList.remove("is-filled");
        }
      }
    }
  }

  onAutoPick() {
    this.main.clear();
    while (this.main.size < 6) this.main.add(randInt(1, 40));
    this.dream = randInt(1, 5);

    this.paintSelection();
    this.emitSelectionState();
  }

  onClear() {
    this.main.clear();
    this.dream = null;

    this.paintSelection();
    this.emitSelectionState();
  }

  emitSelectionState() {
    const mainArr = Array.from(this.main).sort((a, b) => a - b);

    EventBus.emit("selection:eurodreams", {
      main: mainArr,
      dream: this.dream,

      numbers: mainArr,
      isComplete: mainArr.length === 6 && this.dream != null,
    });
  }

  getSelection() {
    return {
      main: Array.from(this.main).sort((a, b) => a - b),
      dream: this.dream,
    };
  }

  isSelectionComplete() {
    return this.main.size === 6 && this.dream != null;
  }
}

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function padNumber(n, width) {
  const s = String(n);
  return s.length >= width ? s : "0".repeat(width - s.length) + s;
}
