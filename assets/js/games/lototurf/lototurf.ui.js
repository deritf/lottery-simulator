// assets/js/games/lototurf/lototurf.ui.js

import { LototurfConfig } from "./lototurf.config.js";
import { EventBus } from "../../shared/utils/events.js";
import { getCurrentI18nDict } from "../../app/i18n.js";
import { getByPath } from "../../shared/utils/i18n-path.js";

function t(key, fallback = "") {
  const dict = getCurrentI18nDict();
  const v = getByPath(dict, key);
  return typeof v === "string" ? v : fallback;
}

export class LototurfUI {
  constructor() {
    this.config = LototurfConfig;

    this.mainGridContainer = null;

    this.horseGridContainer = null;
    this.reintegroGridContainer = null;

    // --- slots (Tu selección) ---
    this.slotsMainEl = null; // 6 slots
    this.slotsHorseEl = null; // 1 slot
    this.slotsReintegroEl = null; // 1 slot (opcional)

    this.numbers = []; // 6 únicos
    this.horse = null; // 1..12 (pick "raw"; la sustitución por retirado se aplica en engine)
    this.reintegro = null; // 0..9 (opcional: si no se elige, el engine asigna el reintegro del resguardo)

    this.onAutoPick = this.onAutoPick.bind(this);
    this.onClear = this.onClear.bind(this);

    this.onLangChanged = this.onLangChanged.bind(this);
  }

  async init() {
    this.mainGridContainer = document.getElementById("number-grid");
    if (!this.mainGridContainer) {
      console.error("LototurfUI: no existe #number-grid");
      return;
    }

    this.slotsMainEl = document.getElementById("slots-main");

    this.setAccentColors();

    this.ensurePickCards();

    this.ensureSelectionRows();
    this.renderSlots();
    this.renderBoard();
    this.paintSelection();
    this.updateSlots();
    this.emitSelectionState();

    EventBus.on("ui:autoPick", this.onAutoPick);
    EventBus.on("ui:clear", this.onClear);

    EventBus.on("lang:changed", this.onLangChanged);
  }

  destroy() {
    EventBus.off?.("ui:autoPick", this.onAutoPick);
    EventBus.off?.("ui:clear", this.onClear);
    EventBus.off?.("lang:changed", this.onLangChanged);

    if (this.mainGridContainer) this.mainGridContainer.innerHTML = "";

    if (this.slotsMainEl) this.slotsMainEl.innerHTML = "";
    if (this.slotsHorseEl) this.slotsHorseEl.innerHTML = "";
    if (this.slotsReintegroEl) this.slotsReintegroEl.innerHTML = "";

    if (this.horseGridContainer) this.horseGridContainer.innerHTML = "";
    if (this.reintegroGridContainer) this.reintegroGridContainer.innerHTML = "";

    document.getElementById("lototurf-horse-section")?.remove();
    document.getElementById("lototurf-reintegro-section")?.remove();

    this.horseGridContainer = null;
    this.reintegroGridContainer = null;

    this.numbers = [];
    this.horse = null;
    this.reintegro = null;
  }

  onLangChanged() {
    this.ensurePickCards();
    this.updatePickCardTitles();
    this.ensureSelectionRows();
    this.updateSelectionRowLabels();
    this.renderBoard();
    this.paintSelection();
    this.updateSlots();
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

  ensurePickCards() {
    const mainSection = this.mainGridContainer?.closest("section");
    if (!mainSection || !mainSection.parentElement) return;

    // ---------- CABALLO ----------
    let horseSection = document.getElementById("lototurf-horse-section");
    if (!horseSection) {
      horseSection = document.createElement("section");
      horseSection.id = "lototurf-horse-section";
      horseSection.className = "card card--padded";
      horseSection.setAttribute("data-game-only", "lototurf");
      horseSection.setAttribute("aria-labelledby", "lototurf-horse-title");

      const title = document.createElement("h2");
      title.id = "lototurf-horse-title";
      title.className = "card-title";
      title.textContent = t(
        "ui.lototurf.horseRace",
        "Caballo (ganador de la carrera)",
      );

      const grid = document.createElement("div");
      grid.id = "lototurf-horse-grid";
      grid.className = "number-grid";

      const hint = document.createElement("p");
      hint.className = "muted";
      hint.textContent = t(
        "ui.lototurf.horseSubstitutionHint",
        "Si en la carrera participan menos de 12 caballos, los que faltan se consideran retirados y tu pronóstico se sustituye por el número anterior disponible.",
      );

      horseSection.appendChild(title);
      horseSection.appendChild(grid);
      horseSection.appendChild(hint);

      mainSection.parentElement.insertBefore(
        horseSection,
        mainSection.nextSibling,
      );
    }

    // ---------- REINTEGRO ----------
    let reinSection = document.getElementById("lototurf-reintegro-section");
    if (!reinSection) {
      reinSection = document.createElement("section");
      reinSection.id = "lototurf-reintegro-section";
      reinSection.className = "card card--padded";
      reinSection.setAttribute("data-game-only", "lototurf");
      reinSection.setAttribute("aria-labelledby", "lototurf-reintegro-title");

      const title = document.createElement("h2");
      title.id = "lototurf-reintegro-title";
      title.className = "card-title";
      title.textContent = t("ui.lototurf.reintegro", "Reintegro");

      const grid = document.createElement("div");
      grid.id = "lototurf-reintegro-grid";
      grid.className = "reintegro-grid";

      const hint = document.createElement("p");
      hint.className = "muted";
      hint.textContent = t(
        "ui.lototurf.reintegroOptionalHint",
        "Opcional: si no lo eliges, el reintegro del resguardo se asigna automáticamente.",
      );

      reinSection.appendChild(title);
      reinSection.appendChild(grid);
      reinSection.appendChild(hint);

      const after =
        document.getElementById("lototurf-horse-section") || mainSection;
      after.parentElement.insertBefore(reinSection, after.nextSibling);
    }

    this.horseGridContainer = document.getElementById("lototurf-horse-grid");
    this.reintegroGridContainer = document.getElementById(
      "lototurf-reintegro-grid",
    );

    this.updatePickCardTitles();
  }

  updatePickCardTitles() {
    const horseTitle = document.getElementById("lototurf-horse-title");
    if (horseTitle) {
      horseTitle.textContent = t(
        "ui.lototurf.horseRace",
        "Caballo (ganador de la carrera)",
      );
    }

    const reinTitle = document.getElementById("lototurf-reintegro-title");
    if (reinTitle) {
      reinTitle.textContent = t("ui.lototurf.reintegro", "Reintegro");
    }
  }

  // =========================
  // Selection rows (Tu selección)
  // =========================
  ensureSelectionRows() {
    const selectionBlock = document.querySelector(".selection-block");
    if (!selectionBlock) return;

    if (!this.slotsMainEl) return;

    const horseId = "slots-lototurf-horse";
    let horseSlots = document.getElementById(horseId);

    if (!horseSlots) {
      const row = document.createElement("div");
      row.className = "selection-row";
      row.setAttribute("data-game-only", "lototurf");
      row.setAttribute("data-pick", "horse");

      const label = document.createElement("div");
      label.className = "selection-label";
      label.setAttribute("data-i18n", "ui.lototurf.horseLabel");
      label.textContent = t("ui.lototurf.horseLabel", "Caballo:");

      horseSlots = document.createElement("div");
      horseSlots.className = "selection-slots";
      horseSlots.id = horseId;
      horseSlots.setAttribute("role", "list");

      row.appendChild(label);
      row.appendChild(horseSlots);

      selectionBlock.appendChild(row);
    }

    const reinId = "slots-lototurf-reintegro";
    let reinSlots = document.getElementById(reinId);

    if (!reinSlots) {
      const row = document.createElement("div");
      row.className = "selection-row";
      row.setAttribute("data-game-only", "lototurf");
      row.setAttribute("data-pick", "reintegro");

      const label = document.createElement("div");
      label.className = "selection-label";
      label.setAttribute("data-i18n", "ui.lototurf.reintegroLabel");
      label.textContent = t("ui.lototurf.reintegroLabel", "Reintegro:");

      reinSlots = document.createElement("div");
      reinSlots.className = "selection-slots";
      reinSlots.id = reinId;
      reinSlots.setAttribute("role", "list");

      row.appendChild(label);
      row.appendChild(reinSlots);

      selectionBlock.appendChild(row);
    }

    this.slotsHorseEl = horseSlots;
    this.slotsReintegroEl = reinSlots;
  }

  updateSelectionRowLabels() {
    const horseLabel = document.querySelector(
      '.selection-row[data-game-only="lototurf"][data-pick="horse"] .selection-label',
    );
    if (horseLabel) {
      horseLabel.textContent = t("ui.lototurf.horseLabel", "Caballo:");
    }

    const reinLabel = document.querySelector(
      '.selection-row[data-game-only="lototurf"][data-pick="reintegro"] .selection-label',
    );
    if (reinLabel) {
      reinLabel.textContent = t("ui.lototurf.reintegroLabel", "Reintegro:");
    }
  }

  renderSlots() {
    if (this.slotsMainEl) {
      this.slotsMainEl.innerHTML = "";
      for (let i = 0; i < 6; i++)
        this.slotsMainEl.appendChild(this.createSlot());
    }

    if (this.slotsHorseEl) {
      this.slotsHorseEl.innerHTML = "";
      const slot = this.createSlot();
      slot.classList.add("slot--horse");
      this.slotsHorseEl.appendChild(slot);
    }

    if (this.slotsReintegroEl) {
      this.slotsReintegroEl.innerHTML = "";
      this.slotsReintegroEl.appendChild(this.createSlot());
    }
  }

  createSlot() {
    const slot = document.createElement("div");
    slot.className = "slot";
    slot.textContent = "—";
    slot.setAttribute("role", "listitem");
    return slot;
  }

  updateSlots() {
    if (this.slotsMainEl) {
      const slots = this.slotsMainEl.querySelectorAll(".slot");
      for (let i = 0; i < slots.length; i++) {
        const value = this.numbers[i];
        if (value != null) {
          slots[i].textContent = String(value).padStart(2, "0");
          slots[i].classList.add("is-filled");
        } else {
          slots[i].textContent = "—";
          slots[i].classList.remove("is-filled");
        }
      }
    }

    if (this.slotsHorseEl) {
      const slot = this.slotsHorseEl.querySelector(".slot");
      if (slot) {
        if (this.horse != null) {
          slot.textContent = String(this.horse);
          slot.classList.add("is-filled");
        } else {
          slot.textContent = "—";
          slot.classList.remove("is-filled");
        }
      }
    }

    if (this.slotsReintegroEl) {
      const slot = this.slotsReintegroEl.querySelector(".slot");
      if (slot) {
        if (this.reintegro != null) {
          slot.textContent = String(this.reintegro);
          slot.classList.add("is-filled");
        } else {
          slot.textContent = "—";
          slot.classList.remove("is-filled");
        }
      }
    }
  }

  // =========================
  // TABLEROS (cards)
  // =========================
  renderBoard() {
    this.mainGridContainer.innerHTML = "";

    // Recupera el grid y clases originales de Lototurf (CSS)
    const numbersGrid = document.createElement("div");
    numbersGrid.className = "lototurf__grid";

    for (let n = 1; n <= 31; n++) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "lototurf__btn lototurf__btn--num number";
      b.dataset.kind = "num";
      b.dataset.value = String(n);
      b.textContent = String(n).padStart(2, "0");
      b.addEventListener("click", () => this.toggleNumber(n));
      numbersGrid.appendChild(b);
    }

    this.mainGridContainer.appendChild(numbersGrid);

    // Caballo y reintegro en SUS cards
    this.renderHorseBoard();
    this.renderReintegroBoard();
  }

  renderHorseBoard() {
    if (!this.horseGridContainer) return;
    this.horseGridContainer.innerHTML = "";

    for (let h = 1; h <= 12; h++) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "reintegro-btn";
      b.dataset.kind = "horse";
      b.dataset.value = String(h);
      b.textContent = String(h);
      b.addEventListener("click", () => this.setHorse(h));
      this.horseGridContainer.appendChild(b);
    }
  }

  renderReintegroBoard() {
    if (!this.reintegroGridContainer) return;
    this.reintegroGridContainer.innerHTML = "";

    for (let r = 0; r <= 9; r++) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "reintegro-btn";
      b.dataset.kind = "reintegro";
      b.dataset.value = String(r);
      b.textContent = String(r);
      b.addEventListener("click", () => this.setReintegro(r));
      this.reintegroGridContainer.appendChild(b);
    }
  }

  toggleNumber(n) {
    const exists = this.numbers.includes(n);

    if (exists) {
      this.numbers = this.numbers.filter((x) => x !== n);
    } else {
      if (this.numbers.length >= 6) return;
      this.numbers = [...this.numbers, n].sort((a, b) => a - b);
    }

    this.paintSelection();
    this.updateSlots();
    this.emitSelectionState();
  }

  setHorse(h) {
    this.horse = this.horse === h ? null : h;
    this.paintSelection();
    this.updateSlots();
    this.emitSelectionState();
  }

  setReintegro(r) {
    this.reintegro = this.reintegro === r ? null : r;
    this.paintSelection();
    this.updateSlots();
    this.emitSelectionState();
  }

  paintSelection() {
    const roots = [
      this.mainGridContainer,
      this.horseGridContainer,
      this.reintegroGridContainer,
    ].filter(Boolean);

    roots.forEach((root) => {
      root.querySelectorAll('[data-kind="num"]').forEach((b) => {
        const n = Number(b.dataset.value);
        const on = this.numbers.includes(n);
        b.classList.toggle("is-selected", on);
        b.setAttribute("aria-pressed", on ? "true" : "false");
      });

      root.querySelectorAll('[data-kind="horse"]').forEach((b) => {
        const h = Number(b.dataset.value);
        const on = this.horse === h;
        b.classList.toggle("is-selected", on);
        b.setAttribute("aria-pressed", on ? "true" : "false");
      });

      root.querySelectorAll('[data-kind="reintegro"]').forEach((b) => {
        const r = Number(b.dataset.value);
        const on = this.reintegro === r;
        b.classList.toggle("is-selected", on);
        b.setAttribute("aria-pressed", on ? "true" : "false");
      });
    });
  }

  onAutoPick() {
    this.numbers = pickUnique(6, 1, 31).sort((a, b) => a - b);
    this.horse = pickInt(1, 12);

    this.reintegro = pickInt(0, 9);

    this.paintSelection();
    this.updateSlots();
    this.emitSelectionState();
  }

  onClear() {
    this.numbers = [];
    this.horse = null;
    this.reintegro = null;

    this.paintSelection();
    this.updateSlots();
    this.emitSelectionState();
  }

  emitSelectionState() {
    const isComplete =
      Array.isArray(this.numbers) &&
      this.numbers.length === 6 &&
      this.horse !== null &&
      this.horse !== undefined;

    EventBus.emit("selection:lototurf", {
      numbers: [...this.numbers],
      horse: this.horse,
      reintegro: this.reintegro,
      isComplete,
    });
  }

  getSelection() {
    return {
      main: [...this.numbers],
      horse: this.horse,
      reintegro: this.reintegro,
    };
  }

  isSelectionComplete() {
    return (
      Array.isArray(this.numbers) &&
      this.numbers.length === 6 &&
      this.horse !== null &&
      this.horse !== undefined
    );
  }
}

function pickInt(min, max) {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function pickUnique(count, min, max) {
  const set = new Set();
  while (set.size < count) set.add(pickInt(min, max));
  return Array.from(set);
}
