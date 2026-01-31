// assets/js/games/primitiva/primitiva.joker.js

import { PrimitivaConfig } from "./primitiva.config.js";
import { EventBus } from "../../shared/utils/events.js";

/**
 * Gestión del Joker de La Primitiva
 * Adaptado de joker-ui.js original
 */
export class PrimitivaJoker {
  constructor() {
    this.enabled = false;
    this.config = PrimitivaConfig.extras.joker;

    this.jokerWrap = null;
    this.yesBtn = null;
    this.noBtn = null;
  }

  init() {
    if (!this.config.enabled) {
      this.hideJokerSection();
      this.emitState();
      return;
    }

    this.jokerWrap = document.querySelector(".joker-toggle");

    if (!this.jokerWrap) {
      console.warn("Joker: .joker-toggle no encontrado");
      this.emitState();
      return;
    }

    this.yesBtn = this.jokerWrap.querySelector('.joker-btn[data-joker="yes"]');
    this.noBtn = this.jokerWrap.querySelector('.joker-btn[data-joker="no"]');

    const section = this.getJokerSection();
    if (section) section.hidden = false;

    const initialEnabled =
      this.yesBtn?.classList.contains("is-active") === true;
    this.enabled = initialEnabled;

    this.updateUI();
    this.attachEvents();
    this.emitState();
  }

  attachEvents() {
    if (!this.jokerWrap) return;

    this.jokerWrap.addEventListener("click", (e) => {
      const btn = e.target.closest("button.joker-btn");
      if (!btn) return;

      const value = btn.dataset.joker;
      this.setEnabled(value === "yes");
    });

    EventBus.on("ui:clear", () => this.setEnabled(false));
  }

  setEnabled(enabled) {
    this.enabled = enabled;
    this.updateUI();
    this.emitState();
  }

  updateUI() {
    if (!this.yesBtn || !this.noBtn) return;

    this.yesBtn.classList.toggle("is-active", this.enabled);
    this.noBtn.classList.toggle("is-active", !this.enabled);
  }

  emitState() {
    EventBus.emit("selection:joker", {
      joker: this.enabled ? "yes" : "no",
      enabled: this.enabled,
      price: this.enabled ? this.config.pricePerBet : 0,
    });
  }

  isEnabled() {
    return this.enabled;
  }

  hideJokerSection() {
    const section = this.getJokerSection();
    if (section) section.hidden = true;
  }

  getJokerSection() {
    if (!this.jokerWrap) return null;
    return (
      this.jokerWrap.closest("section") ||
      this.jokerWrap.closest(".card") ||
      this.jokerWrap.closest("article") ||
      this.jokerWrap.parentElement
    );
  }

  destroy() {
    this.enabled = false;
    this.jokerWrap = null;
    this.yesBtn = null;
    this.noBtn = null;
  }
}

/**
 * Funciones estáticas para generar y evaluar Joker
 */
export const JokerHelper = {
  /**
   * Genera un número de Joker de 7 dígitos
   */
  generate() {
    let n = "";
    for (let i = 0; i < 7; i++) {
      n += Math.floor(Math.random() * 10);
    }
    return n;
  },

  /**
   * Evalúa coincidencias por primeras o por últimas cifras (se toma el mayor)
   */
  evaluate(played, drawn) {
    if (!played || !drawn) {
      return { matches: 0, prize: 0 };
    }

    const p = String(played).padStart(7, "0");
    const d = String(drawn).padStart(7, "0");

    // Prefijo
    let pref = 0;
    for (let i = 0; i < 7; i++) {
      if (p[i] === d[i]) pref++;
      else break;
    }

    // Sufijo
    let suf = 0;
    for (let i = 6; i >= 0; i--) {
      if (p[i] === d[i]) suf++;
      else break;
    }

    const matches = Math.max(pref, suf);

    const prizes = PrimitivaConfig.jokerPrizes;
    const prize = prizes[matches] || 0;

    return {
      matches,
      prize,
      played: p,
      drawn: d,
    };
  },

  /**
   * Formatea para visualización
   */
  format(number) {
    const str = String(number).padStart(7, "0");
    return `${str.slice(0, 3)} ${str.slice(3, 5)} ${str.slice(5, 7)}`;
  },
};
