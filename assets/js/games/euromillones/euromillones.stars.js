// assets/js/games/euromillones/euromillones.stars.js

import { EuromillonesConfig } from "./euromillones.config.js";
import { EventBus } from "../../shared/utils/events.js";

/**
 * Componente de Estrellas para Euromillones
 * Gestiona la selección de 2 estrellas (números del 1 al 12)
 */
export class EuromillonesStars {
  constructor() {
    this.config = EuromillonesConfig.pick.stars;
    this.selectedStars = new Set();

    this.gridEl = null;
    this.slotsEl = null;
  }

  init() {
    this.gridEl = document.getElementById("stars-grid");
    this.slotsEl = document.getElementById("slots-stars");

    if (!this.gridEl || !this.slotsEl) {
      console.warn("EuromillonesStars: Elementos DOM no encontrados");
      return;
    }

    this.renderGrid();
    this.renderSlots();
    this.attachEvents();
  }

  renderGrid() {
    const { min, max, pad } = this.config;

    // NOTA: tu CSS usa flex en #stars-grid, así que --grid-cols no aplica.
    // Si en el futuro vuelves a grid, puedes reintroducirlo.
    this.gridEl.innerHTML = "";

    const fragment = document.createDocumentFragment();
    for (let n = min; n <= max; n++) {
      const btn = this.createStarButton(n, pad);
      fragment.appendChild(btn);
    }
    this.gridEl.appendChild(fragment);
  }

  renderSlots() {
    this.slotsEl.innerHTML = "";
    for (let i = 0; i < this.config.count; i++) {
      const slot = this.createSlot();
      this.slotsEl.appendChild(slot);
    }
  }

  createStarButton(value, pad) {
    const btn = document.createElement("button");
    btn.type = "button";

    btn.className = "star-btn";
    btn.dataset.star = String(value);

    btn.textContent = this.padNumber(value, pad);
    return btn;
  }

  createSlot() {
    const slot = document.createElement("div");

    slot.className = "slot slot--star slot-star";

    slot.textContent = "—";
    slot.setAttribute("role", "listitem");
    return slot;
  }

  attachEvents() {
    this.gridEl.addEventListener("click", (e) => {
      const btn = e.target.closest("button.star-btn");
      if (!btn) return;
      this.handleClick(Number(btn.dataset.star));
    });

    EventBus.on("ui:clear", () => this.clear());
    EventBus.on("ui:autoPick", () => this.autoPick());
  }

  handleClick(star) {
    if (this.selectedStars.has(star)) {
      this.selectedStars.delete(star);
    } else {
      if (this.selectedStars.size >= this.config.count) return;
      this.selectedStars.add(star);
    }

    this.updateUI();
    this.emitState();
  }

  updateUI() {
    const sorted = this.getSortedStars();

    const slots = this.slotsEl.querySelectorAll(".slot-star");
    slots.forEach((slot, i) => {
      const value = sorted[i];
      if (value !== undefined) {
        slot.textContent = this.padNumber(value, this.config.pad);
        slot.classList.add("is-filled");
      } else {
        slot.textContent = "—";
        slot.classList.remove("is-filled");
      }
    });

    const buttons = this.gridEl.querySelectorAll("button.star-btn");
    buttons.forEach((btn) => {
      const num = Number(btn.dataset.star);
      btn.classList.toggle("is-selected", this.selectedStars.has(num));
    });
  }

  autoPick() {
    this.selectedStars.clear();

    const { count, min, max } = this.config;
    const picked = this.pickUnique(count, min, max);
    picked.forEach((n) => this.selectedStars.add(n));

    this.updateUI();
    this.emitState();
  }

  clear() {
    this.selectedStars.clear();
    this.updateUI();
    this.emitState();
  }

  emitState() {
    const stars = this.getSortedStars();
    const isComplete = stars.length === this.config.count;

    EventBus.emit("selection:euromillones:stars", {
      stars,
      isComplete,
    });
  }

  getSelection() {
    return this.getSortedStars();
  }

  isComplete() {
    return this.selectedStars.size === this.config.count;
  }

  getSortedStars() {
    return Array.from(this.selectedStars).sort((a, b) => a - b);
  }

  padNumber(n, width) {
    const s = String(n);
    return s.length >= width ? s : "0".repeat(width - s.length) + s;
  }

  pickUnique(count, min, max) {
    const s = new Set();
    while (s.size < count) {
      s.add(Math.floor(Math.random() * (max - min + 1)) + min);
    }
    return Array.from(s).sort((a, b) => a - b);
  }

  destroy() {
    this.selectedStars.clear();
    if (this.gridEl) this.gridEl.innerHTML = "";
    if (this.slotsEl) this.slotsEl.innerHTML = "";
  }
}
