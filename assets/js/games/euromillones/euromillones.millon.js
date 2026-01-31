// assets/js/games/euromillones/euromillones.millon.js

import { EventBus } from "../../shared/utils/events.js";

export class EuromillonesMillon {
  constructor() {
    this.enabled = true;

    this.available = false;

    this._onClear = this._onClear.bind(this);
  }

  init(gameConfig) {
    this.config = gameConfig?.extras?.millon || null;

    this.available = Boolean(this.config?.enabled);

    const yesBtn = document.querySelector('[data-millon="yes"]');
    const noBtn = document.querySelector('[data-millon="no"]');
    const card = yesBtn?.closest('[data-game-only="euromillones"]') || null;

    if (!this.available) {
      if (card) card.hidden = true;
      this.enabled = false;
      EventBus.emit("extras:millon", { enabled: false, automatic: false });
      return;
    }

    const isAutomatic = Boolean(this.config?.automatic);
    this.enabled = isAutomatic ? true : true;

    if (yesBtn && noBtn) {
      const syncUI = () => {
        yesBtn.classList.toggle("is-active", true);
        noBtn.classList.toggle("is-active", false);
        yesBtn.setAttribute("aria-pressed", "true");
        noBtn.setAttribute("aria-pressed", "false");

        yesBtn.disabled = true;
        noBtn.disabled = true;
        yesBtn.setAttribute("aria-disabled", "true");
        noBtn.setAttribute("aria-disabled", "true");

        noBtn.hidden = true;
      };

      EventBus.on("ui:clear", this._onClear);

      syncUI();
    } else {
      EventBus.on("ui:clear", this._onClear);
    }

    EventBus.emit("extras:millon", { enabled: this.enabled, automatic: true });
  }

  isEnabled() {
    return this.enabled;
  }

  destroy() {
    EventBus.off?.("ui:clear", this._onClear);
  }

  _onClear() {}
}
