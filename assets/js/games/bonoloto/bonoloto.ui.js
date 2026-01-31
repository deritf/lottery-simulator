// assets/js/games/bonoloto/bonoloto.ui.js

import { BonolotoConfig } from "./bonoloto.config.js";
import { EventBus } from "../../shared/utils/events.js";
import { pickUniqueRandom } from "../../shared/utils/random.js";

/**
 * UI de Bonoloto
 * - 6 números (1–49)
 * - El reintegro lo asigna el motor por sorteo
 */
export class BonolotoUI {
  constructor() {
    this.config = BonolotoConfig;

    this.selectedNumbers = new Set();

    this.gridEl = null;
    this.slotsMainEl = null;
  }

  async init() {
    this.gridEl = document.getElementById("number-grid");
    this.slotsMainEl = document.getElementById("slots-main");

    if (!this.gridEl || !this.slotsMainEl) {
      console.error("Bonoloto UI: Elementos DOM necesarios no encontrados");
      return;
    }

    this.setAccentColors();

    this.gridEl.innerHTML = "";
    this.slotsMainEl.innerHTML = "";

    this.renderMainGrid();
    this.renderSlots();

    this.attachEvents();

    this.emitSelectionState();
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

  renderMainGrid() {
    const { min, max, pad } = this.config.pick.main;

    // 49 -> 7x7
    const cols = 7;
    this.gridEl.style.setProperty("--grid-cols", String(cols));

    const fragment = document.createDocumentFragment();
    for (let n = min; n <= max; n++) {
      const btn = this.createNumberButton(n, pad, "number-btn");
      fragment.appendChild(btn);
    }
    this.gridEl.appendChild(fragment);
  }

  renderSlots() {
    const { count } = this.config.pick.main;
    for (let i = 0; i < count; i++) {
      this.slotsMainEl.appendChild(this.createSlot());
    }
  }

  createNumberButton(value, pad, className) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = className;
    btn.dataset.number = String(value);
    btn.textContent = this.padNumber(value, pad);
    return btn;
  }

  createSlot() {
    const slot = document.createElement("div");
    slot.className = "slot";
    slot.textContent = "—";
    slot.setAttribute("role", "listitem");
    return slot;
  }

  attachEvents() {
    this.gridEl.addEventListener("click", (e) => {
      const btn = e.target.closest("button.number-btn");
      if (!btn) return;
      this.handleMainClick(Number(btn.dataset.number));
    });

    EventBus.on("ui:clear", () => this.clearSelection());
    EventBus.on("ui:autoPick", () => this.autoPickNumbers());
  }

  handleMainClick(number) {
    const { count } = this.config.pick.main;

    if (this.selectedNumbers.has(number)) {
      this.selectedNumbers.delete(number);
    } else {
      if (this.selectedNumbers.size >= count) return;
      this.selectedNumbers.add(number);
    }

    this.updateMainUI();
    this.emitSelectionState();
  }

  updateMainUI() {
    const { pad } = this.config.pick.main;
    const sorted = this.getSortedNumbers();

    const slots = this.slotsMainEl.querySelectorAll(".slot");
    slots.forEach((slot, i) => {
      const value = sorted[i];
      if (value !== undefined) {
        slot.textContent = this.padNumber(value, pad);
        slot.classList.add("is-filled");
      } else {
        slot.textContent = "—";
        slot.classList.remove("is-filled");
      }
    });

    const buttons = this.gridEl.querySelectorAll("button.number-btn");
    buttons.forEach((btn) => {
      const num = Number(btn.dataset.number);
      btn.classList.toggle("is-selected", this.selectedNumbers.has(num));
    });
  }

  autoPickNumbers() {
    const { count, min, max } = this.config.pick.main;

    this.selectedNumbers.clear();
    const numbers = pickUniqueRandom(count, min, max);
    numbers.forEach((n) => this.selectedNumbers.add(n));

    this.updateMainUI();
    this.emitSelectionState();
  }

  clearSelection() {
    this.selectedNumbers.clear();
    this.updateMainUI();
    this.emitSelectionState();
  }

  emitSelectionState() {
    const { count } = this.config.pick.main;
    const numbers = this.getSortedNumbers();
    const isComplete = numbers.length === count;

    EventBus.emit("selection:bonoloto", {
      numbers,
      isComplete,
    });
  }

  getSelection() {
    return {
      main: this.getSortedNumbers(),
      // reintegro: NO (lo asigna el engine)
    };
  }

  isSelectionComplete() {
    const { count } = this.config.pick.main;
    return this.selectedNumbers.size === count;
  }

  getSortedNumbers() {
    return Array.from(this.selectedNumbers).sort((a, b) => a - b);
  }

  padNumber(n, width) {
    const s = String(n);
    return s.length >= width ? s : "0".repeat(width - s.length) + s;
  }

  destroy() {
    this.selectedNumbers.clear();
    if (this.gridEl) this.gridEl.innerHTML = "";
    if (this.slotsMainEl) this.slotsMainEl.innerHTML = "";
  }
}
