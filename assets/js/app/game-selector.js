// assets/js/app/game-selector.js

import { EventBus } from "../shared/utils/events.js";
import { getGame, getEnabledGames } from "../games.registry.js";

/**
 * Gestor del selector de juegos en el navbar
 * Permite cambiar entre juegos habilitados
 */

export function initGameSelector(gameManager) {
  const navButtons = document.querySelectorAll(".nav-games__item");

  if (!navButtons.length) {
    console.warn("GameSelector: No se encontraron botones de navegación");
    return;
  }

  // Habilitar/deshabilitar botones según disponibilidad
  navButtons.forEach((btn) => {
    const gameId = btn.dataset.game;
    const game = getGame(gameId);

    if (game && game.enabled) {
      btn.disabled = false;
      btn.removeAttribute("disabled");

      btn.addEventListener("click", async () => {
        if (btn.classList.contains("is-active")) return;

        try {
          await switchGame(gameId, gameManager);
        } catch (error) {
          console.error(`Error cambiando a ${gameId}:`, error);
          alert(`Error al cargar ${game.name}. Por favor, recarga la página.`);
        }
      });
    } else {
      btn.disabled = true;
      btn.setAttribute("disabled", "disabled");
    }
  });

  EventBus.on("game:changed", ({ gameId }) => {
    updateActiveButton(gameId);
  });
}

/**
 * Cambia al juego especificado
 */
async function switchGame(gameId, gameManager) {
  const resultsSection = document.getElementById("results");
  if (resultsSection) {
    resultsSection.hidden = true;
  }

  const logContainer = document.getElementById("draw-log-body");
  if (logContainer) {
    logContainer.innerHTML = "";
  }

  await gameManager.loadGame(gameId);

  updateActiveButton(gameId);

  EventBus.emit("ui:clear");
}

/**
 * Actualiza el botón activo en el navbar
 */
function updateActiveButton(gameId) {
  const navButtons = document.querySelectorAll(".nav-games__item");

  navButtons.forEach((btn) => {
    const isActive = btn.dataset.game === gameId;
    btn.classList.toggle("is-active", isActive);

    if (isActive) {
      btn.setAttribute("aria-current", "page");
      btn.disabled = true;
    } else {
      btn.removeAttribute("aria-current");
      btn.disabled = false;
    }
  });
}
