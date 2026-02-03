// assets/js/games/primitiva/primitiva.ui.js

import { PrimitivaConfig } from "./primitiva.config.js";
import { EventBus } from "../../shared/utils/events.js";
import { randInt, pickUniqueRandom } from "../../shared/utils/random.js";

export class PrimitivaUI {
  constructor() {
    this.config = PrimitivaConfig;

    // Estado
    this.selectedNumbers = new Set();
    this.reintegro = null;

    // Referencias DOM
    this.gridEl = null;
    this.reintegroGridEl = null;
    this.slotsMainEl = null;
    this.slotsReintegroEl = null;
  }

  async init() {
    // Obtener elementos del DOM
    this.gridEl = document.getElementById("number-grid");
    this.reintegroGridEl = document.getElementById("reintegro-grid");
    if (this.reintegroGridEl) {
      this.reintegroGridEl.classList.add(
        "reintegro-grid",
        "reintegro-grid--center-wrap",
      );
    }
    this.slotsMainEl = document.getElementById("slots-main");
    this.slotsReintegroEl = document.getElementById("slots-reintegro");

    if (!this.gridEl || !this.slotsMainEl) {
      console.error("Primitiva UI: Elementos DOM necesarios no encontrados");
      return;
    }

    this.setAccentColors();

    this.gridEl.innerHTML = "";
    if (this.reintegroGridEl) this.reintegroGridEl.innerHTML = "";

    this.renderMainGrid();
    this.renderReintegroGrid();
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

    // Configurar grid (7x7 para 49 números)
    const total = max - min + 1;
    const cols = Math.ceil(Math.sqrt(total));
    this.gridEl.style.setProperty("--grid-cols", String(cols));

    // Crear botones
    const fragment = document.createDocumentFragment();
    for (let n = min; n <= max; n++) {
      const btn = this.createNumberButton(n, pad, "number-btn");
      fragment.appendChild(btn);
    }
    this.gridEl.appendChild(fragment);
  }

  renderReintegroGrid() {
    if (!this.reintegroGridEl) return;

    const { min, max, pad } = this.config.pick.reintegro;

    const fragment = document.createDocumentFragment();
    for (let n = min; n <= max; n++) {
      const btn = this.createNumberButton(n, pad, "reintegro-btn");
      fragment.appendChild(btn);
    }
    this.reintegroGridEl.appendChild(fragment);
  }

  renderSlots() {
    // Slots principales
    const { count: mainCount } = this.config.pick.main;
    this.slotsMainEl.innerHTML = "";
    for (let i = 0; i < mainCount; i++) {
      this.slotsMainEl.appendChild(this.createSlot());
    }

    // Slot reintegro
    if (this.slotsReintegroEl) {
      this.slotsReintegroEl.innerHTML = "";
      this.slotsReintegroEl.appendChild(this.createSlot());
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

    if (this.reintegroGridEl) {
      this.reintegroGridEl.addEventListener("click", (e) => {
        const btn = e.target.closest("button.reintegro-btn");
        if (!btn) return;
        this.handleReintegroClick(Number(btn.dataset.number));
      });
    }

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

  handleReintegroClick(number) {
    this.reintegro = this.reintegro === number ? null : number;
    this.updateReintegroUI();
    this.emitSelectionState();
  }

  updateMainUI() {
    const { pad } = this.config.pick.main;
    const sorted = this.getSortedNumbers();

    // Actualizar slots
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

    this.updateButtonsClass(this.gridEl, this.selectedNumbers);
  }

  updateReintegroUI() {
    if (!this.slotsReintegroEl || !this.reintegroGridEl) return;

    const { pad } = this.config.pick.reintegro;

    const slot = this.slotsReintegroEl.querySelector(".slot");
    if (slot) {
      if (this.reintegro !== null) {
        slot.textContent = this.padNumber(this.reintegro, pad);
        slot.classList.add("is-filled");
      } else {
        slot.textContent = "—";
        slot.classList.remove("is-filled");
      }
    }

    this.updateButtonsClass(this.reintegroGridEl, this.reintegro);
  }

  updateButtonsClass(container, selectedSetOrValue) {
    const buttons = container.querySelectorAll("button[data-number]");
    buttons.forEach((btn) => {
      const num = Number(btn.dataset.number);
      const isSelected =
        selectedSetOrValue instanceof Set
          ? selectedSetOrValue.has(num)
          : selectedSetOrValue === num;
      btn.classList.toggle("is-selected", isSelected);
    });
  }

  autoPickNumbers() {
    const { count, min, max } = this.config.pick.main;
    const { min: rMin, max: rMax } = this.config.pick.reintegro;

    // Generar números únicos
    this.selectedNumbers.clear();
    const numbers = pickUniqueRandom(count, min, max);
    numbers.forEach((n) => this.selectedNumbers.add(n));

    // Generar reintegro
    this.reintegro = randInt(rMin, rMax);

    this.updateMainUI();
    this.updateReintegroUI();
    this.emitSelectionState();
  }

  clearSelection() {
    this.selectedNumbers.clear();
    this.reintegro = null;
    this.updateMainUI();
    this.updateReintegroUI();
    this.emitSelectionState();
  }

  emitSelectionState() {
    const { count } = this.config.pick.main;
    const numbers = this.getSortedNumbers();
    const isComplete = numbers.length === count && this.reintegro !== null;

    EventBus.emit("selection:primitiva", {
      numbers,
      reintegro: this.reintegro,
      isComplete,
    });
  }

  getSelection() {
    return {
      main: this.getSortedNumbers(),
      reintegro: this.reintegro,
    };
  }

  isSelectionComplete() {
    const { count } = this.config.pick.main;
    return this.selectedNumbers.size === count && this.reintegro !== null;
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
    this.reintegro = null;
    if (this.gridEl) this.gridEl.innerHTML = "";
    if (this.reintegroGridEl) this.reintegroGridEl.innerHTML = "";
    if (this.slotsMainEl) this.slotsMainEl.innerHTML = "";
    if (this.slotsReintegroEl) this.slotsReintegroEl.innerHTML = "";
  }
}
