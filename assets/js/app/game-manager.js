// assets/js/app/game-manager.js

import { EventBus } from "../shared/utils/events.js";
import { getGame } from "../games.registry.js";

/**
 * Gestor central de sorteos
 * Coordina el cambio entre diferentes sorteos
 * Integra funcionalidad de games-repo.js original
 */

export class GameManager {
  constructor() {
    this.currentGame = null;
    this.currentUI = null;
    this.currentEngine = null;
    this.currentJoker = null;
  }

  /**
   * Carga y activa un sorteo
   */
  async loadGame(gameId) {
    // Limpiar juego anterior
    if (this.currentUI) {
      this.currentUI.destroy();
    }
    if (this.currentJoker) {
      this.currentJoker.destroy();
    }

    // Obtener configuración del juego
    const game = getGame(gameId);

    if (!game || !game.enabled) {
      throw new Error(`Juego no disponible: ${gameId}`);
    }

    this.currentGame = game;

    // Crear instancias de UI y Engine
    this.currentUI = new game.UI();

    // El Engine es una función factory, no una clase
    this.currentEngine = game.Engine(game.config);

    // Joker (solo si existe)
    if (game.Joker) {
      this.currentJoker = new game.Joker();
    }

    // Inicializar UI
    await this.currentUI.init();

    // Inicializar Joker si existe
    if (this.currentJoker) {
      this.currentJoker.init();
    }

    // Actualizar dataset del body
    document.body.dataset.game = gameId;

    // Notificar cambio
    EventBus.emit("game:changed", { gameId, game });
  }

  getCurrentGame() {
    return this.currentGame;
  }

  getCurrentEngine() {
    return this.currentEngine;
  }

  getCurrentSelection() {
    if (!this.currentUI) return null;
    return this.currentUI.getSelection();
  }

  isSelectionComplete() {
    if (!this.currentUI) return false;
    return this.currentUI.isSelectionComplete();
  }
}
