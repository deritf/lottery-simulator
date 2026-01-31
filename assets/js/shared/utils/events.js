// assets/js/shared/utils/events.js

class EventBusClass {
  constructor() {
    this.listeners = new Map();
  }

  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  off(event, callback) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) callbacks.splice(index, 1);
    }
  }

  emit(event, data) {
    const callbacks = this.listeners.get(event) || [];
    callbacks.forEach((cb) => {
      try {
        cb(data);
      } catch (error) {
        console.error(`Error en evento "${event}":`, error);
      }
    });
  }

  once(event, callback) {
    const onceCallback = (data) => {
      callback(data);
      this.off(event, onceCallback);
    };
    this.on(event, onceCallback);
  }

  removeAllListeners(event) {
    if (event) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
  }
}

export const EventBus = new EventBusClass();

export const Events = {
  SELECTION_PRIMITIVA: "selection:primitiva",
  SELECTION_JOKER: "selection:joker",
  UI_CLEAR: "ui:clear",
  UI_AUTO_PICK: "ui:autoPick",
  GAME_CHANGED: "game:changed",
  SIM_START: "sim:start",
  SIM_DONE: "sim:done",
  LANG_CHANGED: "lang:changed",
  THEME_CHANGED: "theme:changed",
};
