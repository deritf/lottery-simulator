// assets/js/games/euromillones/euromillones.ui.js

import { EuromillonesConfig } from "./euromillones.config.js";
import { EuromillonesStars } from "./euromillones.stars.js";
import { EuromillonesMillon } from "./euromillones.millon.js";
import { EventBus } from "../../shared/utils/events.js";
import { pickUniqueRandom } from "../../shared/utils/random.js";

/**
 * UI Principal de Euromillones
 * Gestiona la selección de 5 números (1-50) + 2 estrellas (1-12)
 *
 * España: El Millón es automático (no elegible). El componente euromillones.millon.js
 * lo deja activo y deshabilita/oculta el toggle si existe.
 */
export class EuromillonesUI {
  constructor() {
    this.config = EuromillonesConfig;

    this.selectedNumbers = new Set();
    this.stars = null;

    this.millon = null;

    this.gridEl = null;
    this.slotsMainEl = null;
  }

  async init() {
    this.gridEl = document.getElementById("number-grid");
    this.slotsMainEl = document.getElementById("slots-main");

    if (!this.gridEl || !this.slotsMainEl) {
      console.error("Euromillones UI: Elementos DOM necesarios no encontrados");
      return;
    }

    this.stars = new EuromillonesStars();
    await this.stars.init();

    this.millon = new EuromillonesMillon();
    this.millon.init(this.config);

    this.setAccentColors();
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

    const cols = 10;
    this.gridEl.style.setProperty("--grid-cols", String(cols));

    this.gridEl.innerHTML = "";
    const fragment = document.createDocumentFragment();

    for (let n = min; n <= max; n++) {
      const btn = this.createNumberButton(n, pad);
      fragment.appendChild(btn);
    }
    this.gridEl.appendChild(fragment);
  }

  renderSlots() {
    const { count } = this.config.pick.main;
    this.slotsMainEl.innerHTML = "";

    for (let i = 0; i < count; i++) {
      this.slotsMainEl.appendChild(this.createSlot());
    }
  }

  createNumberButton(value, pad) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "number-btn";
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

    EventBus.on("selection:euromillones:stars", () => {
      this.emitSelectionState();
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

    this.updateButtonsClass();
  }

  updateButtonsClass() {
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

    if (this.stars) this.stars.autoPick();
  }

  clearSelection() {
    this.selectedNumbers.clear();
    this.updateMainUI();
    this.emitSelectionState();

    if (this.stars) this.stars.clear();
  }

  emitSelectionState() {
    const { count } = this.config.pick.main;
    const main = this.getSortedNumbers();
    const stars = this.stars ? this.stars.getSelection() : [];

    const mainComplete = main.length === count;
    const starsComplete = this.stars ? this.stars.isComplete() : false;
    const isComplete = mainComplete && starsComplete;

    EventBus.emit("selection:euromillones", {
      main,
      stars,
      isComplete,
      mainComplete,
      starsComplete,
      numbers: main,
      numbersComplete: mainComplete,
    });
  }

  getSelection() {
    return {
      main: this.getSortedNumbers(),
      stars: this.stars ? this.stars.getSelection() : [],
    };
  }

  isSelectionComplete() {
    const { count } = this.config.pick.main;
    const mainOk = this.selectedNumbers.size === count;
    const starsOk = this.stars ? this.stars.isComplete() : false;
    return mainOk && starsOk;
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
    if (this.stars) {
      this.stars.destroy();
      this.stars = null;
    }
    if (this.millon) {
      this.millon.destroy?.();
      this.millon = null;
    }
    if (this.gridEl) this.gridEl.innerHTML = "";
    if (this.slotsMainEl) this.slotsMainEl.innerHTML = "";
  }
}
