// assets/js/games/loterianacional/loterianacional.ui.js

import { LoteriaNacionalConfig } from "./loterianacional.config.js";
import { EventBus } from "../../shared/utils/events.js";

export class LoteriaNacionalUI {
  constructor() {
    this.config = LoteriaNacionalConfig;

    this.digits = Array(this.config.pick.main.count).fill(null);

    this.cursor = 0;

    this.activeReplaceIndex = null;

    this.decimos = 1;
    this.drawType = "navidad";

    this.gridEl = null;
    this.slotsEl = null;

    this.panelEl = null;
    this.decimosEl = null;
    this.subhintEl = null;
    this.drawButtons = [];

    this.clearBtn = null;
    this.autoBtn = null;

    this._onGridClick = null;
    this._onSlotsClick = null;
    this._onClearClick = null;
    this._onAutoClick = null;

    this._themeObserver = null;
  }

  async init() {
    this.gridEl = document.getElementById("number-grid");
    this.slotsEl = document.getElementById("slots-main");

    this.clearBtn = document.getElementById("clear-btn");
    this.autoBtn = document.getElementById("auto-pick-btn");

    if (!this.gridEl || !this.slotsEl) {
      console.error("Lotería Nacional UI: faltan #number-grid o #slots-main");
      return;
    }

    // 1) Engancharse al panel que ya está en el HTML
    this.hookExistingPanel();

    // 2) Si por lo que sea no existe, crearlo como fallback
    if (!this.decimosEl || !this.subhintEl || this.drawButtons.length === 0) {
      this.ensurePanelFallback();
      this.hookExistingPanel();
    }

    this.applyAccentTextForTheme();
    this.observeThemeChanges();

    this.renderGrid();
    this.renderSlots();

    this.wireDrawTypeButtons();
    this.wireDecimos();
    this.wireGlobalButtons();

    this.updateSubhint();
    this.updateClearButtonState();
    this.emitSelectionState();

    this.emitMetaChanged();
  }

  hookExistingPanel() {
    this.panelEl = document.querySelector(
      '.ln-panel[data-game-only="loteria-nacional"]',
    );
    this.decimosEl = document.getElementById("ln-decimos");
    this.subhintEl = document.getElementById("ln-subhint");
    this.drawButtons = Array.from(document.querySelectorAll("[data-ln-draw]"));

    if (this.drawButtons.length) {
      const active =
        this.drawButtons.find((b) => b.classList.contains("is-active")) ||
        this.drawButtons.find((b) => b.dataset.lnDraw === "navidad");

      if (active) {
        this.drawType = String(active.dataset.lnDraw || "navidad");
        this.drawButtons.forEach((b) =>
          b.classList.toggle("is-active", b === active),
        );
      }
    }

    if (this.decimosEl) {
      const v = Number(this.decimosEl.value);
      this.decimos = Math.max(1, Math.min(10, Number.isFinite(v) ? v : 1));
      this.decimosEl.value = String(this.decimos);
    }
  }

  ensurePanelFallback() {
    const title = document.getElementById("select-numbers-title");
    const card = title ? title.closest(".card") : null;
    if (!card) return;

    if (document.getElementById("ln-decimos")) return;

    const panel = document.createElement("div");
    panel.className = "ln-panel";
    panel.setAttribute("data-game-only", "loteria-nacional");

    panel.innerHTML = `
      <div class="ln-panel__row">
        <div class="ln-panel__label">Sorteo:</div>
        <div class="ln-panel__draws" role="group" aria-label="Sorteo">
          <button type="button" class="ln-draw-btn is-active" data-ln-draw="navidad">Navidad</button>
          <button type="button" class="ln-draw-btn" data-ln-draw="nino">El Niño</button>
          <button type="button" class="ln-draw-btn" data-ln-draw="jueves">Jueves</button>
          <button type="button" class="ln-draw-btn" data-ln-draw="sabado">Sábado</button>
        </div>
      </div>

      <div class="ln-panel__row">
        <label class="ln-panel__label" for="ln-decimos">Décimos:</label>
        <input id="ln-decimos" class="ln-decimos" type="number" min="1" max="10" step="1" value="1" inputmode="numeric" />
      </div>

      <p class="ln-subhint" id="ln-subhint"></p>
    `;

    const grid = document.getElementById("number-grid");
    if (grid) grid.insertAdjacentElement("afterend", panel);
  }

  applyAccentTextForTheme() {
    document.body.style.setProperty("--color-acento-text", "#ffffff");
  }

  observeThemeChanges() {
    if (this._themeObserver) return;

    this._themeObserver = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.type === "attributes" && m.attributeName === "data-theme") {
          this.applyAccentTextForTheme();
        }
      }
    });

    this._themeObserver.observe(document.body, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
  }

  renderGrid() {
    this.gridEl.innerHTML = "";
    this.gridEl.style.setProperty("--grid-cols", "10");

    const frag = document.createDocumentFragment();
    for (let n = 0; n <= 9; n++) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "number-btn";
      btn.dataset.digit = String(n);
      btn.textContent = String(n);
      frag.appendChild(btn);
    }
    this.gridEl.appendChild(frag);

    this._onGridClick = (e) => {
      const btn = e.target.closest("button.number-btn");
      if (!btn) return;
      this.pickDigit(Number(btn.dataset.digit));
    };

    this.gridEl.addEventListener("click", this._onGridClick);
    this.paintSelection();
  }

  paintSelection() {
    if (!this.gridEl) return;

    const picked = new Set(
      (this.digits || []).filter((v) => v !== null && v !== undefined),
    );

    this.gridEl.querySelectorAll("button.number-btn").forEach((btn) => {
      const d = Number(btn.dataset.digit);
      const on = picked.has(d);

      btn.classList.toggle("is-selected", on);
      btn.setAttribute("aria-pressed", on ? "true" : "false");
    });
  }

  renderSlots() {
    this.slotsEl.innerHTML = "";

    for (let i = 0; i < this.config.pick.main.count; i++) {
      const slot = document.createElement("div");
      slot.className = "slot ln-slot";
      slot.dataset.pos = String(i);
      slot.textContent = "—";
      slot.setAttribute("role", "listitem");
      this.slotsEl.appendChild(slot);
    }

    this._onSlotsClick = (e) => {
      const slot = e.target.closest(".slot.ln-slot");
      if (!slot) return;

      const pos = Number(slot.dataset.pos);
      if (!Number.isInteger(pos) || pos < 0 || pos >= this.digits.length)
        return;

      if (this.activeReplaceIndex === pos) {
        this.activeReplaceIndex = null;
      } else {
        this.activeReplaceIndex = pos;
      }

      this.cursor = this.activeReplaceIndex ?? this.cursor;

      this.updateSlots();
    };

    this.slotsEl.addEventListener("click", this._onSlotsClick);
    this.updateSlots();
  }

  wireGlobalButtons() {
    if (this.clearBtn) {
      this._onClearClick = () => {
        EventBus.emit("ui:clear");
        this.clear();
      };
      this.clearBtn.addEventListener("click", this._onClearClick);
    }

    if (this.autoBtn) {
      this._onAutoClick = () => this.autoPick();
      this.autoBtn.addEventListener("click", this._onAutoClick);
    }

    EventBus.on("ui:clear", () => this.clear(false));
  }

  wireDecimos() {
    if (!this.decimosEl) return;

    const normalize = () => {
      const v = Number(this.decimosEl.value);
      this.decimos = Math.max(1, Math.min(10, Number.isFinite(v) ? v : 1));
      this.decimosEl.value = String(this.decimos);

      this.emitSelectionState();
      this.updateSubhint();
    };

    this.decimosEl.addEventListener("input", normalize);
    this.decimosEl.addEventListener("change", normalize);
  }

  getMetaDaysByDrawType(dt) {
    const k = String(dt || "navidad");
    if (k === "jueves") return ["thursday"];
    if (k === "sabado") return ["saturday"];

    return [];
  }

  emitMetaChanged() {
    const price =
      Number(this.config.pricesByDrawType?.[this.drawType]) ||
      Number(this.config.economy.pricePerDraw) ||
      0;

    EventBus.emit("ln:drawTypeChanged", {
      gameId: this.config.id,
      drawType: this.drawType,
      pricePerDraw: price,
      drawDays: this.getMetaDaysByDrawType(this.drawType),
    });
  }

  wireDrawTypeButtons() {
    if (!this.drawButtons.length) return;

    this.drawButtons.forEach((b) => {
      b.addEventListener("click", () => {
        const next = String(b.dataset.lnDraw || "navidad");
        this.drawType = next;

        this.drawButtons.forEach((x) =>
          x.classList.toggle("is-active", x.dataset.lnDraw === next),
        );

        const price = Number(this.config.pricesByDrawType?.[next]);
        if (Number.isFinite(price) && price > 0) {
          this.config.economy.pricePerDraw = price;
        }

        this.emitSelectionState();
        this.updateSubhint();

        this.emitMetaChanged();
      });
    });
  }

  pickDigit(digit) {
    const d = Number(digit);
    if (!Number.isFinite(d) || d < 0 || d > 9) return;

    if (Number.isInteger(this.activeReplaceIndex)) {
      const idx = this.activeReplaceIndex;
      this.digits[idx] = d;

      this.activeReplaceIndex = null;
      this.cursor = Math.min(idx + 1, this.digits.length - 1);
    } else {
      this.digits[this.cursor] = d;
      if (this.cursor < this.digits.length - 1) this.cursor++;
    }

    this.updateSlots();
    this.paintSelection();
    this.updateClearButtonState();
    this.emitSelectionState();
  }

  updateSlots() {
    const slots = this.slotsEl.querySelectorAll(".slot.ln-slot");
    slots.forEach((slot) => {
      const i = Number(slot.dataset.pos);
      const v = this.digits[i];

      slot.textContent = v === null || v === undefined ? "—" : String(v);
      slot.classList.toggle("is-filled", v !== null && v !== undefined);

      slot.classList.toggle("is-active", i === this.activeReplaceIndex);

      slot.classList.toggle(
        "is-cursor",
        this.activeReplaceIndex === null && i === this.cursor,
      );
    });
  }

  updateClearButtonState() {
    if (!this.clearBtn) return;

    const anyFilled = this.digits.some((v) => v !== null && v !== undefined);
    this.clearBtn.disabled = !anyFilled;
    this.clearBtn.setAttribute("aria-disabled", anyFilled ? "false" : "true");
  }

  updateSubhint() {
    if (!this.subhintEl) return;

    const price =
      Number(this.config.pricesByDrawType?.[this.drawType]) ||
      Number(this.config.economy.pricePerDraw) ||
      0;

    const total = price * this.decimos;
    this.subhintEl.textContent = `Precio: ${price.toFixed(
      2,
    )} € / décimo · Total: ${total.toFixed(2)} €`;
  }

  autoPick() {
    for (let i = 0; i < this.digits.length; i++) {
      this.digits[i] = Math.floor(Math.random() * 10);
    }
    this.cursor = 0;
    this.activeReplaceIndex = null;

    this.updateSlots();
    this.paintSelection();
    this.updateClearButtonState();
    this.emitSelectionState();
  }

  clear(emitEvent = true) {
    this.digits = Array(this.config.pick.main.count).fill(null);
    this.cursor = 0;
    this.activeReplaceIndex = null;

    this.updateSlots();
    this.paintSelection();
    this.updateClearButtonState();
    if (emitEvent) this.emitSelectionState();
  }

  emitSelectionState() {
    const complete = this.isSelectionComplete();
    const filledDigits = this.digits.filter(
      (v) => v !== null && v !== undefined,
    );

    EventBus.emit("selection:loteria-nacional", {
      digits: [...filledDigits],
      decimos: this.decimos,
      drawType: this.drawType,
      isComplete: complete,
    });
  }

  getSelection() {
    return {
      main: [...this.digits],
      decimos: this.decimos,
      drawType: this.drawType,
    };
  }

  isSelectionComplete() {
    return this.digits.every((v) => v !== null && v !== undefined);
  }

  destroy() {
    if (this.gridEl && this._onGridClick) {
      this.gridEl.removeEventListener("click", this._onGridClick);
    }
    if (this.slotsEl && this._onSlotsClick) {
      this.slotsEl.removeEventListener("click", this._onSlotsClick);
    }
    if (this.clearBtn && this._onClearClick) {
      this.clearBtn.removeEventListener("click", this._onClearClick);
    }
    if (this.autoBtn && this._onAutoClick) {
      this.autoBtn.removeEventListener("click", this._onAutoClick);
    }

    if (this._themeObserver) {
      this._themeObserver.disconnect();
      this._themeObserver = null;
    }

    this.digits = [];
    if (this.gridEl) this.gridEl.innerHTML = "";
    if (this.slotsEl) this.slotsEl.innerHTML = "";
  }
}
