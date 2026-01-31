// assets/js/games/quinigol/quinigol.ui.js

import { QuinigolConfig } from "./quinigol.config.js";
import { EventBus } from "../../shared/utils/events.js";
import { getCurrentI18nDict } from "../../app/i18n.js";

export class QuinigolUI {
  constructor() {
    this.config = QuinigolConfig;

    this.root = null;

    // selections: Array<Set<string>> length 6, cada set contiene resultados "A-B"
    // (en UI hacemos 1 solo resultado por partido)
    this.selections = Array.from({ length: 6 }, () => new Set());

    this.matchNames = [];

    this.autoBtn = null;
    this.clearBtn = null;
    this.originalAutoParent = null;
    this.originalClearParent = null;
    this.originalAutoNext = null;
    this.originalClearNext = null;

    this.selectNumbersH2 = null;
    this.selectNumbersH2Parent = null;
    this.selectNumbersH2Next = null;

    this.originalSelectNumbersDataI18n = null;
    this.originalSelectNumbersText = null;

    this.qHeader = null;

    this.onAutoPick = this.onAutoPick.bind(this);
    this.onClear = this.onClear.bind(this);
    this.onLangChanged = this.onLangChanged.bind(this);

    this.onGameChanged = this.onGameChanged.bind(this);
    this.inlineMounted = false;
  }

  async init() {
    this.root = document.getElementById("number-grid");
    if (!this.root) {
      console.error("QuinigolUI: no existe #number-grid");
      return;
    }

    this.setAccentColors();
    this.mountInlineControls();

    this.generateRandomMatchesForUI();

    this.render();
    this.emitSelectionState();

    EventBus.on("ui:autoPick", this.onAutoPick);
    EventBus.on("ui:clear", this.onClear);
    EventBus.on("lang:changed", this.onLangChanged);

    EventBus.on("game:changed", this.onGameChanged);
  }

  destroy() {
    EventBus.off?.("ui:autoPick", this.onAutoPick);
    EventBus.off?.("ui:clear", this.onClear);
    EventBus.off?.("lang:changed", this.onLangChanged);
    EventBus.off?.("game:changed", this.onGameChanged);

    this.restoreInlineControls();

    if (this.root) this.root.innerHTML = "";
    this.selections = Array.from({ length: 6 }, () => new Set());
    this.matchNames = [];
  }

  onGameChanged({ gameId } = {}) {
    if (String(gameId || "") !== "quinigol") {
      this.restoreInlineControls();

      EventBus.off?.("game:changed", this.onGameChanged);
    }
  }

  onLangChanged() {
    this.updateHeaderTitle();
    this.render();
    this.paintAll();
    this.updateSummary();
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
      console.warn("QuinigolUI: no se pudieron montar controles integrados");
      return;
    }

    this.originalAutoParent = this.autoBtn.parentNode;
    this.originalClearParent = this.clearBtn.parentNode;
    this.originalAutoNext = this.autoBtn.nextSibling;
    this.originalClearNext = this.clearBtn.nextSibling;

    this.selectNumbersH2Parent = this.selectNumbersH2.parentNode;
    this.selectNumbersH2Next = this.selectNumbersH2.nextSibling;

    this.originalSelectNumbersDataI18n =
      this.selectNumbersH2.getAttribute("data-i18n");
    this.originalSelectNumbersText = this.selectNumbersH2.textContent;

    this.qHeader = document.createElement("div");
    this.qHeader.className = "quinigol-header selection-card__head";

    this.selectNumbersH2Parent.insertBefore(this.qHeader, this.selectNumbersH2);

    this.qHeader.appendChild(this.selectNumbersH2);
    this.qHeader.appendChild(this.autoBtn);
    this.qHeader.appendChild(this.clearBtn);

    this.selectNumbersH2.removeAttribute("data-i18n");
    this.updateHeaderTitle();

    this.inlineMounted = true;
  }

  updateHeaderTitle() {
    if (!this.selectNumbersH2) return;

    const label =
      this.t("games.quinigol.label", "") ||
      String(this.config?.label || "").trim() ||
      this.t("ui.quinigol.title", "El Quinigol");

    this.selectNumbersH2.textContent = label;
  }

  restoreInlineControls() {
    if (!this.inlineMounted) return;
    this.inlineMounted = false;

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

    if (this.selectNumbersH2) {
      const original = this.originalSelectNumbersDataI18n;

      const safeKey = "ui.selectNumbers";

      if (original && !String(original).startsWith("games.")) {
        this.selectNumbersH2.setAttribute("data-i18n", original);
      } else {
        this.selectNumbersH2.setAttribute("data-i18n", safeKey);
      }

      if (this.originalSelectNumbersText != null) {
        this.selectNumbersH2.textContent = this.originalSelectNumbersText;
      }
    }
  }

  t(path, fallback = "") {
    const dict = getCurrentI18nDict();
    if (!dict) return fallback;

    const parts = String(path || "").split(".");
    let cur = dict;
    for (const p of parts) {
      if (cur && Object.prototype.hasOwnProperty.call(cur, p)) cur = cur[p];
      else return fallback;
    }
    return typeof cur === "string" ? cur : fallback;
  }

  generateRandomMatchesForUI() {
    const teams = Array.isArray(this.config.teams) ? this.config.teams : [];
    const jornada = buildRandomMatchesFromTeams(teams, 6);

    if (jornada) {
      this.matchNames = jornada.matches;
      return;
    }

    const fallback = Array.isArray(this.config.matches)
      ? this.config.matches
      : [];
    this.matchNames =
      fallback.length >= 6
        ? fallback.slice(0, 6)
        : Array.from({ length: 6 }, (_, i) => `Partido ${i + 1}`);
  }

  render() {
    const tokens = this.config.tokens || ["0", "1", "2", "M"];

    const wrap = document.createElement("div");
    wrap.className = "quinigol";

    const hint = document.createElement("div");
    hint.className = "quinigol__hint";
    hint.textContent = this.t(
      "ui.quinigol.hint",
      "Elige el resultado exacto de cada partido. Para cada equipo puedes marcar 0, 1, 2 o M (3 o más).",
    );
    wrap.appendChild(hint);

    const grid = document.createElement("div");
    grid.className = "quinigol__matches";
    wrap.appendChild(grid);

    for (let i = 0; i < 6; i++) {
      const card = document.createElement("div");
      card.className = "quinigol__card";
      card.dataset.matchIndex = String(i);

      const cardTitle = document.createElement("div");
      cardTitle.className = "quinigol__cardTitle";
      cardTitle.textContent = this.t(
        "ui.quinigol.matchLabel",
        "Partido {n}",
      ).replace("{n}", String(i + 1));

      const matchLine = document.createElement("div");
      matchLine.className = "quinigol__matchLine";
      matchLine.textContent = this.formatMatchLine(i);

      const matrix = document.createElement("div");
      matrix.className = "quinigol__matrix";

      for (const a of tokens) {
        for (const b of tokens) {
          const res = `${a}-${b}`;
          const btn = document.createElement("button");
          btn.type = "button";
          btn.className = "quinigol__btn";
          btn.dataset.res = res;
          btn.textContent = res;

          btn.addEventListener("click", () => this.toggle(i, res));
          matrix.appendChild(btn);
        }
      }

      const footer = document.createElement("div");
      footer.className = "quinigol__cardFooter";
      footer.textContent = this.t(
        "ui.quinigol.singleOnly",
        "Solo puedes marcar uno.",
      );

      card.appendChild(cardTitle);
      card.appendChild(matchLine);
      card.appendChild(matrix);
      card.appendChild(footer);
      grid.appendChild(card);
    }

    const summary = document.createElement("div");
    summary.className = "quinigol__summary";
    summary.id = "quinigol-summary";
    wrap.appendChild(summary);

    this.root.innerHTML = "";
    this.root.appendChild(wrap);

    this.paintAll();
    this.updateSummary();
  }

  formatMatchLine(i) {
    const raw = String(this.matchNames[i] || "").trim() || `Partido ${i + 1}`;
    const { home, away } = splitMatch(raw);
    const vs = this.t("ui.quinigol.vs", "vs");
    return `${home} ${vs} ${away}`;
  }

  toggle(matchIndex, res) {
    const set = this.selections[matchIndex] || new Set();

    if (set.has(res)) {
      set.clear();
    } else {
      set.clear();
      set.add(res);
    }

    this.selections[matchIndex] = set;

    this.paintAll();
    this.updateSummary();
    this.emitSelectionState();
  }

  paintAll() {
    if (!this.root) return;

    for (let i = 0; i < 6; i++) {
      const card = this.root.querySelector(
        `.quinigol__card[data-match-index="${i}"]`,
      );
      if (!card) continue;

      const set = this.selections[i] || new Set();

      card.querySelectorAll(".quinigol__btn").forEach((b) => {
        const res = String(b.dataset.res || "");
        const on = set.has(res);
        b.classList.toggle("is-selected", on);
        b.setAttribute("aria-pressed", on ? "true" : "false");
      });
    }
  }

  computeBetsCount() {
    for (let i = 0; i < 6; i++) {
      const c = (this.selections[i] && this.selections[i].size) || 0;
      if (c !== 1) return 0;
    }
    return 1;
  }

  updateSummary() {
    const el = document.getElementById("quinigol-summary");
    if (!el) return;

    const bets = this.computeBetsCount();
    const label = this.t("ui.quinigol.betsCount", "Apuestas: {n}").replace(
      "{n}",
      String(bets),
    );

    const range = this.t("ui.quinigol.betsRange", "Rango: {min}–{max}")
      .replace("{min}", "1")
      .replace("{max}", "1");

    el.textContent = `${label} · ${range}`;
  }

  onAutoPick() {
    const tokens = this.config.tokens || ["0", "1", "2", "M"];
    this.selections = Array.from({ length: 6 }, () => new Set());

    for (let i = 0; i < 6; i++) {
      const a = tokens[Math.floor(Math.random() * tokens.length)];
      const b = tokens[Math.floor(Math.random() * tokens.length)];
      this.selections[i].add(`${a}-${b}`);
    }

    this.paintAll();
    this.updateSummary();
    this.emitSelectionState();
  }

  onClear() {
    this.selections = Array.from({ length: 6 }, () => new Set());
    this.paintAll();
    this.updateSummary();
    this.emitSelectionState();
  }

  emitSelectionState() {
    const flat = this.selections.map((s) => Array.from(s)[0] || null);
    const betsCount = this.computeBetsCount();
    const isComplete = betsCount === 1;

    EventBus.emit("selection:quinigol", {
      matches: flat,
      betsCount,
      isComplete,
    });
  }

  getSelection() {
    return {
      matches: this.selections.map((s) => Array.from(s)[0] || null),
      betsCount: this.computeBetsCount(),
    };
  }

  isSelectionComplete() {
    return this.computeBetsCount() === 1;
  }
}

function splitMatch(s) {
  const raw = String(s || "").trim();
  const parts = raw
    .split(/\s*[-–]\s*/)
    .map((x) => x.trim())
    .filter(Boolean);

  if (parts.length >= 2)
    return { home: parts[0], away: parts.slice(1).join(" - ") };
  return { home: raw || "", away: "" };
}

function shuffleInPlace(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

function buildRandomMatchesFromTeams(teams, matchCount = 6) {
  const t = Array.isArray(teams) ? teams.filter(Boolean) : [];
  if (t.length < matchCount * 2) return null;

  const pool = [...t];
  shuffleInPlace(pool);

  const matches = [];
  for (let i = 0; i < matchCount; i++) {
    const home = pool.pop();
    const away = pool.pop();
    matches.push(`${home} - ${away}`);
  }

  return { matches };
}
