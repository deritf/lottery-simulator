// assets/js/games/quiniela/quiniela.ui.js

import { QuinielaConfig } from "./quiniela.config.js";
import { EventBus } from "../../shared/utils/events.js";
import { getCurrentI18nDict } from "../../app/i18n.js";
import { getByPath } from "../../shared/utils/i18n-path.js";

function t(key, fallback = "") {
  const dict = getCurrentI18nDict();
  const v = getByPath(dict, key);
  return typeof v === "string" ? v : fallback;
}

export class QuinielaUI {
  constructor() {
    this.config = QuinielaConfig;

    this.signs = Array(14).fill(null); // "1" | "X" | "2"
    this.pleno = { home: null, away: null }; // "0"|"1"|"2"|"M"

    this.mainGridContainer = null;

    this.jornadaMatches = [];
    this.jornadaPleno15 = "";

    this.autoBtn = null;
    this.clearBtn = null;
    this.originalAutoParent = null;
    this.originalClearParent = null;
    this.originalAutoNext = null;
    this.originalClearNext = null;

    this.selectNumbersH2 = null;
    this.selectNumbersH2Parent = null;
    this.selectNumbersH2Next = null;

    this.qHeader = null;

    this.onAutoPick = this.onAutoPick.bind(this);
    this.onClear = this.onClear.bind(this);
    this.onLangChanged = this.onLangChanged.bind(this);
  }

  async init() {
    this.mainGridContainer = document.getElementById("number-grid");
    if (!this.mainGridContainer) {
      console.error("QuinielaUI: no existe #number-grid");
      return;
    }

    this.setAccentColors();
    this.mountInlineControls();

    this.generateRandomJornadaForUI();

    this.renderBoard();
    this.paintSelection();
    this.emitSelectionState();

    EventBus.on("ui:autoPick", this.onAutoPick);
    EventBus.on("ui:clear", this.onClear);

    EventBus.on("lang:changed", this.onLangChanged);
  }

  destroy() {
    EventBus.off?.("ui:autoPick", this.onAutoPick);
    EventBus.off?.("ui:clear", this.onClear);
    EventBus.off?.("lang:changed", this.onLangChanged);

    this.restoreInlineControls();

    if (this.mainGridContainer) this.mainGridContainer.innerHTML = "";

    this.signs = Array(14).fill(null);
    this.pleno = { home: null, away: null };

    this.jornadaMatches = [];
    this.jornadaPleno15 = "";
  }

  onLangChanged() {
    // Actualiza textos (header + tablero) sin perder la selección
    this.updateHeaderTitle();
    this.renderBoard();
    this.paintSelection();
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

  // ---------------------------------------------------------------------------
  // Controles integrados: “Tu selección” no se usa en Quiniela
  // ---------------------------------------------------------------------------

  mountInlineControls() {
    this.autoBtn = document.getElementById("auto-pick-btn");
    this.clearBtn = document.getElementById("clear-btn");

    this.selectNumbersH2 = document.getElementById("select-numbers-title");
    const selectNumbersCard = this.selectNumbersH2?.closest("section") || null;

    if (
      !this.autoBtn ||
      !this.clearBtn ||
      !this.selectNumbersH2 ||
      !selectNumbersCard
    ) {
      console.warn("QuinielaUI: no se pudieron montar controles integrados");
      return;
    }

    this.originalAutoParent = this.autoBtn.parentNode;
    this.originalClearParent = this.clearBtn.parentNode;
    this.originalAutoNext = this.autoBtn.nextSibling;
    this.originalClearNext = this.clearBtn.nextSibling;

    this.selectNumbersH2Parent = this.selectNumbersH2.parentNode;
    this.selectNumbersH2Next = this.selectNumbersH2.nextSibling;

    this.qHeader = document.createElement("div");
    this.qHeader.className = "quiniela-header selection-card__head";

    this.selectNumbersH2Parent.insertBefore(this.qHeader, this.selectNumbersH2);

    this.qHeader.appendChild(this.selectNumbersH2);

    this.qHeader.appendChild(this.autoBtn);
    this.qHeader.appendChild(this.clearBtn);

    this.selectNumbersH2.removeAttribute("data-i18n");
    this.updateHeaderTitle();
  }

  updateHeaderTitle() {
    if (!this.selectNumbersH2) return;
    // Preferimos el label del juego si existe
    const label =
      t("games.quiniela.label", "") ||
      String(this.config?.label || "").trim() ||
      t("ui.quiniela.title", "") ||
      "La Quiniela";
    this.selectNumbersH2.textContent = label;
  }

  restoreInlineControls() {
    if (this.selectNumbersH2 && this.selectNumbersH2Parent) {
      if (this.selectNumbersH2Next) {
        this.selectNumbersH2Parent.insertBefore(
          this.selectNumbersH2,
          this.selectNumbersH2Next,
        );
      } else {
        this.selectNumbersH2Parent.appendChild(this.selectNumbersH2);
      }
    }

    if (this.autoBtn && this.originalAutoParent) {
      if (this.originalAutoNext) {
        this.originalAutoParent.insertBefore(
          this.autoBtn,
          this.originalAutoNext,
        );
      } else {
        this.originalAutoParent.appendChild(this.autoBtn);
      }
    }

    if (this.clearBtn && this.originalClearParent) {
      if (this.originalClearNext) {
        this.originalClearParent.insertBefore(
          this.clearBtn,
          this.originalClearNext,
        );
      } else {
        this.originalClearParent.appendChild(this.clearBtn);
      }
    }

    if (this.qHeader && this.qHeader.parentNode) {
      this.qHeader.parentNode.removeChild(this.qHeader);
    }

    this.qHeader = null;
  }

  generateRandomJornadaForUI() {
    const teams = Array.isArray(this.config.teams) ? this.config.teams : [];

    const jornada = buildRandomMatchesFromTeams(teams, 14);

    if (jornada) {
      this.jornadaMatches = jornada.matches;
      this.jornadaPleno15 = jornada.plenoMatch;
      return;
    }

    const matches = Array.isArray(this.config.matches)
      ? this.config.matches
      : [];
    this.jornadaMatches =
      matches.length >= 14
        ? matches.slice(0, 14)
        : Array.from({ length: 14 }, (_, i) =>
            t("ui.quiniela.matchN", "Partido {n}").replace(
              "{n}",
              String(i + 1),
            ),
          );

    const p15 = String(this.config.pleno15 || "").trim();
    this.jornadaPleno15 =
      p15 || t("ui.quiniela.matchN", "Partido {n}").replace("{n}", "15");
  }

  // ---------------------------------------------------------------------------
  // Render UI Quiniela
  // ---------------------------------------------------------------------------

  renderBoard() {
    this.mainGridContainer.innerHTML = "";

    const wrap = document.createElement("div");
    wrap.className = "quiniela";

    const list = document.createElement("div");
    list.className = "quiniela__list";

    const matches = Array.isArray(this.jornadaMatches)
      ? this.jornadaMatches
      : [];

    for (let i = 0; i < 14; i++) {
      const row = document.createElement("div");
      row.className = "quiniela__row";

      const idx = document.createElement("div");
      idx.className = "quiniela__idx";
      idx.textContent = String(i + 1);

      const name = document.createElement("div");
      name.className = "quiniela__match";

      const fallbackMatch = t("ui.quiniela.matchN", "Partido {n}").replace(
        "{n}",
        String(i + 1),
      );
      const { home, away } = splitMatch(matches[i] || fallbackMatch);

      name.innerHTML = `
        <span class="quiniela__team quiniela__team--home">${escapeHtml(home)}</span>
        <span class="quiniela__vs">${escapeHtml(t("ui.quiniela.vs", "vs"))}</span>
        <span class="quiniela__team quiniela__team--away">${escapeHtml(away)}</span>
      `;

      const pick = document.createElement("div");
      pick.className = "quiniela__pick";
      pick.setAttribute("role", "group");

      const aria = t(
        "ui.quiniela.ariaPredictionMatchN",
        "Pronóstico partido {n}",
      ).replace("{n}", String(i + 1));
      pick.setAttribute("aria-label", aria);

      ["1", "X", "2"].forEach((v) => {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "quiniela__btn";
        b.dataset.qIndex = String(i);
        b.dataset.qVal = v;
        b.textContent = v;
        b.addEventListener("click", () => this.toggleSign(i, v));
        pick.appendChild(b);
      });

      row.appendChild(idx);
      row.appendChild(name);
      row.appendChild(pick);
      list.appendChild(row);
    }

    const pleno = document.createElement("div");
    pleno.className = "quiniela__pleno";

    const plenoTitle = document.createElement("div");
    plenoTitle.className = "quiniela__pleno-title";

    const p15Fallback = t("ui.quiniela.matchN", "Partido {n}").replace(
      "{n}",
      "15",
    );
    const { home: pHome, away: pAway } = splitMatch(
      this.jornadaPleno15 || p15Fallback,
    );

    plenoTitle.innerHTML = `
      <span class="quiniela__pleno-label">${escapeHtml(t("ui.quiniela.pleno15", "Pleno al 15"))}</span>
      <span class="quiniela__pleno-match">
        <span class="quiniela__team quiniela__team--home">${escapeHtml(pHome)}</span>
        <span class="quiniela__vs">${escapeHtml(t("ui.quiniela.vs", "vs"))}</span>
        <span class="quiniela__team quiniela__team--away">${escapeHtml(pAway)}</span>
      </span>
    `;

    const plenoPick = document.createElement("div");
    plenoPick.className = "quiniela__pleno-pick";

    const homeBox = document.createElement("div");
    homeBox.className = "quiniela__pleno-box";
    homeBox.innerHTML = `<div class="quiniela__pleno-side">${escapeHtml(
      t("ui.quiniela.home", "Local"),
    )}</div>`;

    const awayBox = document.createElement("div");
    awayBox.className = "quiniela__pleno-box";
    awayBox.innerHTML = `<div class="quiniela__pleno-side">${escapeHtml(
      t("ui.quiniela.away", "Visitante"),
    )}</div>`;

    const homeBtns = this.createGoalButtons("home");
    const awayBtns = this.createGoalButtons("away");

    homeBox.appendChild(homeBtns);
    awayBox.appendChild(awayBtns);

    plenoPick.appendChild(homeBox);
    plenoPick.appendChild(awayBox);

    pleno.appendChild(plenoTitle);
    pleno.appendChild(plenoPick);

    wrap.appendChild(list);
    wrap.appendChild(pleno);

    this.mainGridContainer.appendChild(wrap);
  }

  createGoalButtons(side) {
    const grp = document.createElement("div");
    grp.className = "quiniela__goals";
    grp.setAttribute("role", "group");

    const aria = t(
      side === "home"
        ? "ui.quiniela.ariaGoalsHome"
        : "ui.quiniela.ariaGoalsAway",
      side === "home" ? "Goles local" : "Goles visitante",
    );
    grp.setAttribute("aria-label", aria);

    ["0", "1", "2", "M"].forEach((code) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "quiniela__goal-btn";
      b.dataset.side = side;
      b.dataset.code = code;
      b.textContent = code;
      b.addEventListener("click", () => this.setPleno(side, code));
      grp.appendChild(b);
    });

    return grp;
  }

  // ---------------------------------------------------------------------------
  // Estado
  // ---------------------------------------------------------------------------

  toggleSign(i, v) {
    this.signs[i] = this.signs[i] === v ? null : v;
    this.paintSelection();
    this.emitSelectionState();
  }

  setPleno(side, code) {
    this.pleno = {
      ...this.pleno,
      [side]: this.pleno[side] === code ? null : code,
    };
    this.paintSelection();
    this.emitSelectionState();
  }

  paintSelection() {
    // 1X2
    this.mainGridContainer.querySelectorAll(".quiniela__btn").forEach((b) => {
      const i = Number(b.dataset.qIndex);
      const v = b.dataset.qVal;
      const isOn = this.signs[i] === v;
      b.classList.toggle("is-selected", isOn);
      b.setAttribute("aria-pressed", isOn ? "true" : "false");
    });

    // Pleno
    this.mainGridContainer
      .querySelectorAll(".quiniela__goal-btn")
      .forEach((b) => {
        const side = b.dataset.side;
        const code = b.dataset.code;
        const isOn = this.pleno?.[side] === code;
        b.classList.toggle("is-selected", isOn);
        b.setAttribute("aria-pressed", isOn ? "true" : "false");
      });
  }

  onAutoPick() {
    for (let i = 0; i < 14; i++) {
      this.signs[i] = pickRandom(["1", "X", "2"]);
    }
    this.pleno = {
      home: pickRandom(["0", "1", "2", "M"]),
      away: pickRandom(["0", "1", "2", "M"]),
    };

    this.paintSelection();
    this.emitSelectionState();
  }

  onClear() {
    this.signs = Array(14).fill(null);
    this.pleno = { home: null, away: null };

    this.paintSelection();
    this.emitSelectionState();
  }

  emitSelectionState() {
    const isComplete =
      this.signs.every((v) => v === "1" || v === "X" || v === "2") &&
      this.pleno.home != null &&
      this.pleno.away != null;

    EventBus.emit("selection:quiniela", {
      signs: [...this.signs],
      pleno: { ...this.pleno },
      isComplete,
    });
  }

  getSelection() {
    return { signs: [...this.signs], pleno: { ...this.pleno } };
  }

  isSelectionComplete() {
    return (
      this.signs.every((v) => v === "1" || v === "X" || v === "2") &&
      this.pleno.home != null &&
      this.pleno.away != null
    );
  }
}

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function splitMatch(s) {
  const raw = String(s || "").trim();

  // Soporta "Equipo A - Equipo B" o "Equipo A–Equipo B"
  const parts = raw
    .split(/\s*[-–]\s*/)
    .map((x) => x.trim())
    .filter(Boolean);
  if (parts.length >= 2)
    return { home: parts[0], away: parts.slice(1).join(" - ") };

  return { home: raw, away: "" };
}

function escapeHtml(str) {
  return String(str || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function shuffleInPlace(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

function buildRandomMatchesFromTeams(teams, matchCount = 14) {
  const t = Array.isArray(teams) ? teams.filter(Boolean) : [];
  if (t.length < (matchCount + 1) * 2) return null;

  const pool = [...t];
  shuffleInPlace(pool);

  const matches = [];
  for (let i = 0; i < matchCount; i++) {
    if (pool.length < 2) return null;
    const home = pool.pop();
    const away = pool.pop();
    matches.push(`${home} - ${away}`);
  }

  if (pool.length < 2) return null;
  const plenoHome = pool.pop();
  const plenoAway = pool.pop();

  return { matches, plenoMatch: `${plenoHome} - ${plenoAway}` };
}
