// assets/js/app/app.js

import { GameManager } from "./game-manager.js";
import { initTheme } from "./theme.js";
import { initI18n, getCurrentI18nDict } from "./i18n.js";
import { initSEO, applySEO } from "./seo.js";
import { initResultsDisplay } from "../shared/ui/results-display.js";
import { initSimulationControls } from "../shared/ui/simulation-controls.js";
import { initDrawLog } from "../shared/ui/draw-log.js";
import { initGameHero } from "../shared/ui/game-hero.js";
import { EventBus } from "../shared/utils/events.js";
import { initDrawDebugModal } from "../shared/ui/draw-debug-modal.js";
import { initGameSelector } from "./game-selector.js";
import { initMobileNav } from "./mobile-nav.js";

async function init() {
  try {
    initTheme();
    initI18n();

    initSEO();

    initResultsDisplay();
    initDrawLog();
    initDrawDebugModal();
    initGameHero();

    initGlobalButtons();

    initMobileNav();

    EventBus.on("game:changed", ({ game }) => {
      const cfg = game?.config || null;

      if (cfg?.accentVar) {
        document.body.style.setProperty(
          "--color-acento",
          `var(${cfg.accentVar})`,
        );
      } else {
        document.body.style.removeProperty("--color-acento");
      }

      if (cfg?.accentText) {
        document.body.style.setProperty("--color-acento-text", cfg.accentText);
      } else {
        document.body.style.removeProperty("--color-acento-text");
      }

      const dict = getCurrentI18nDict();
      if (dict) applySEO(dict);
    });

    const gameManager = new GameManager();

    await gameManager.loadGame("primitiva");

    const dict = getCurrentI18nDict();
    if (dict) applySEO(dict);

    initSimulationControls(gameManager);
    initGameSelector(gameManager);
  } catch (error) {
    console.error("Error inicializando la aplicación:", error);
  }
}

function initGlobalButtons() {
  const clearBtn = document.getElementById("clear-btn");
  if (clearBtn) {
    const updateClearState = (e, gameId) => {
      const current = document.body.dataset.game;
      if (current !== gameId) return;

      if (gameId === "primitiva") {
        const hasSelection =
          (e.numbers && e.numbers.length > 0) || e.reintegro !== null;
        clearBtn.disabled = !hasSelection;
        return;
      }

      if (gameId === "euromillones") {
        const hasSelection =
          (e.main && e.main.length > 0) || (e.stars && e.stars.length > 0);
        clearBtn.disabled = !hasSelection;
        return;
      }

      if (gameId === "bonoloto") {
        const hasSelection = e.numbers && e.numbers.length > 0;
        clearBtn.disabled = !hasSelection;
        return;
      }

      if (gameId === "gordo") {
        const hasSelection = (e.main && e.main.length > 0) || e.clave !== null;
        clearBtn.disabled = !hasSelection;
        return;
      }

      if (gameId === "eurodreams") {
        const hasSelection = (e.main && e.main.length > 0) || e.dream !== null;
        clearBtn.disabled = !hasSelection;
        return;
      }

      if (gameId === "loteria-nacional") {
        const digits = e.digits || e.numbers || e.main || [];
        const hasSelection = Array.isArray(digits) && digits.length > 0;
        clearBtn.disabled = !hasSelection;
        return;
      }

      if (gameId === "quiniela") {
        const has14 =
          Array.isArray(e.signs) &&
          e.signs.length === 14 &&
          e.signs.some(Boolean);

        const hasPleno =
          !!e.pleno && (e.pleno.home != null || e.pleno.away != null);

        clearBtn.disabled = !(has14 || hasPleno);
        return;
      }

      if (gameId === "lototurf") {
        const nums = e.numbers || e.main || [];
        const hasNums = Array.isArray(nums) && nums.length > 0;
        const hasHorse = e.horse != null;
        const hasReintegro = e.reintegro != null;
        clearBtn.disabled = !(hasNums || hasHorse || hasReintegro);
        return;
      }

      if (gameId === "quinigol") {
        const m = Array.isArray(e.matches) ? e.matches : [];
        const hasAny = m.some((x) => x != null);
        clearBtn.disabled = !hasAny;
        return;
      }

      clearBtn.disabled = true;
    };

    EventBus.on("selection:primitiva", (e) => updateClearState(e, "primitiva"));
    EventBus.on("selection:euromillones", (e) =>
      updateClearState(e, "euromillones"),
    );
    EventBus.on("selection:bonoloto", (e) => updateClearState(e, "bonoloto"));
    EventBus.on("selection:gordo", (e) => updateClearState(e, "gordo"));
    EventBus.on("selection:eurodreams", (e) =>
      updateClearState(e, "eurodreams"),
    );

    EventBus.on("selection:loteria-nacional", (e) =>
      updateClearState(e, "loteria-nacional"),
    );
    EventBus.on("selection:loteria_nacional", (e) =>
      updateClearState(e, "loteria-nacional"),
    );

    EventBus.on("selection:quiniela", (e) => updateClearState(e, "quiniela"));

    EventBus.on("selection:lototurf", (e) => updateClearState(e, "lototurf"));

    EventBus.on("selection:quinigol", (e) => updateClearState(e, "quinigol"));

    clearBtn.addEventListener("click", () => {
      if (!clearBtn.disabled) {
        EventBus.emit("ui:clear");
        const resultsSection = document.getElementById("results");
        if (resultsSection) resultsSection.hidden = true;
      }
    });

    clearBtn.disabled = true;
  }

  const autoPickBtn = document.getElementById("auto-pick-btn");
  if (autoPickBtn) {
    autoPickBtn.addEventListener("click", () => {
      EventBus.emit("ui:autoPick");
    });
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}

window.__lotteryApp = {
  EventBus,
  version: "2.0.0",
};
