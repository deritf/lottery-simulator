// assets/js/shared/ui/simulation-controls.js

import { EventBus } from "../utils/events.js";
import { getNextDrawDate } from "../utils/dates.js";
import { buildInvestmentSeries } from "../utils/investment-simulator.js";
import { getCurrentI18nDict } from "../../app/i18n.js";
import { getByPath } from "../utils/i18n-path.js";

export function initSimulationControls(gameManager) {
  const wrap = document.querySelector(".sim-buttons");
  if (!wrap) return;

  const addWrap = document.querySelector(".addsim-buttons");

  let simState = null;
  let requiredKeys = [];
  let complete = {};
  let selection = {};

  let millonEnabled = false;

  let lastInvestmentInput = null;

  setupRequirements();
  setupMainButtons(wrap);
  if (addWrap) setupAddButtons(addWrap);
  setupSelectionListeners();
  setupInvestmentAutoRefresh();
  setupExtrasListeners();

  EventBus.on("game:changed", ({ gameId }) => {
    setupRequirements();

    simState = null;
    lastInvestmentInput = null;
    setAddButtonsEnabled(false);

    millonEnabled = false;

    window.dispatchEvent(
      new CustomEvent("investment:update", {
        detail: { labels: [], series: [] },
      }),
    );

    if (gameId === "euromillones") {
    }
  });

  EventBus.on("lang:changed", () => {
    recompute();
  });

  function isScalarPick(key, cfg) {
    if (
      key === "reintegro" ||
      key === "clave" ||
      key === "dream" ||
      key === "pleno" ||
      key === "horse"
    )
      return true;
    return Boolean(cfg?.scalar === true);
  }

  function setupRequirements() {
    const game = gameManager.getCurrentGame();
    if (!game || !game.config) return;

    const gameId = game.id || document.body.dataset.game;

    if (!game.config.pick || typeof game.config.pick !== "object") {
      if (gameId === "quiniela") {
        requiredKeys = ["signs", "pleno"];
        complete = { signs: false, pleno: false };
        selection = { signs: [], pleno: null };
        recompute();
        return;
      }

      requiredKeys = [];
      complete = {};
      selection = {};
      recompute();
      return;
    }

    requiredKeys = Object.entries(game.config.pick || {})
      .filter(([, cfg]) => cfg && typeof cfg === "object" && cfg.count > 0)
      .map(([key]) => key);

    complete = Object.fromEntries(requiredKeys.map((k) => [k, false]));

    selection = {};
    for (const k of requiredKeys) {
      const cfg = game.config.pick?.[k] || null;
      selection[k] = isScalarPick(k, cfg) ? null : [];
    }

    recompute();
  }

  function setupExtrasListeners() {
    EventBus.on("extras:millon", (e) => {
      if (document.body.dataset.game !== "euromillones") return;
      millonEnabled = Boolean(e?.enabled);
    });
  }

  function isReady() {
    return requiredKeys.every((k) => complete[k] === true);
  }

  function getCardByTitleId(titleId) {
    const titleEl = document.getElementById(titleId);
    return titleEl ? titleEl.closest(".card, .lototurf__card") : null;
  }

  function updateGuidedCards() {
    const gameId = document.body.dataset.game || "primitiva";

    const keyToTitleId = {
      main: "select-numbers-title",
      digits: "select-numbers-title",
      signs: "select-numbers-title",
      matches: "select-numbers-title",

      reintegro: "reintegro-title",

      stars: "stars-title",
      clave: "gordo-clave-title",
      dream: "eurodreams-dream-title",
      pleno: "pleno-title",
      decimos: "decimos-title",
      drawType: "drawtype-title",

      horse: "horse-title",
    };

    if (gameId === "lototurf") {
      keyToTitleId.horse = "lototurf-horse-title";
      keyToTitleId.reintegro = "lototurf-reintegro-title";
    }

    document
      .querySelectorAll(".card.card--guide, .lototurf__card.card--guide")
      .forEach((c) => c.classList.remove("card--guide"));

    for (const k of requiredKeys) {
      if (complete[k] === true) continue;

      const titleId = keyToTitleId[k];
      if (!titleId) continue;

      const card = getCardByTitleId(titleId);
      if (card) card.classList.add("card--guide");
    }
  }

  function recompute() {
    const ready = isReady();
    setButtonsEnabled(ready);

    const hint = ready ? "" : getSelectionHint();
    setHint(hint);

    updateGuidedCards();
  }

  function getSelectionHint() {
    const lang = document.body.dataset.lang || "es";
    const dict = getCurrentI18nDict();

    const gameId = document.body.dataset.game || "primitiva";

    const keyByGame = {
      primitiva: "ui.hints.selectToStart",
      euromillones: "ui.hints.selectToStartEuro",
      bonoloto: "ui.hints.selectToStartBonoloto",
      gordo: "ui.hints.selectToStartGordo",
      eurodreams: "ui.hints.selectToStartEurodreams",
      "loteria-nacional": "ui.hints.selectToStartLoteriaNacional",
      quiniela: "ui.hints.selectToStartQuiniela",
      lototurf: "ui.hints.selectToStartLototurf",
      quinigol: "ui.hints.selectToStartQuinigol",
    };

    const key = keyByGame[gameId] || "ui.hints.selectToStart";

    const fallbackByGame = {
      primitiva:
        lang === "en"
          ? "Select the numbers and a reintegro to start"
          : "Selecciona los números y un reintegro para empezar",
      euromillones:
        lang === "en"
          ? "Select 5 numbers and 2 stars to start"
          : "Selecciona 5 números y 2 estrellas para empezar",
      bonoloto:
        lang === "en"
          ? "Select 6 numbers to start"
          : "Selecciona 6 números para empezar",
      gordo:
        lang === "en"
          ? "Select 5 numbers and a key number to start"
          : "Selecciona 5 números y una clave para empezar",
      eurodreams:
        lang === "en"
          ? "Select 6 numbers and a dream to start"
          : "Selecciona 6 números y un sueño para empezar",
      "loteria-nacional":
        lang === "en"
          ? "Select a 5-digit number and décimos to start"
          : "Selecciona un número de 5 cifras y los décimos para empezar",
      quiniela:
        lang === "en"
          ? "Select the 14 picks (1/X/2) and the correct score for the match 15"
          : "Selecciona los 14 pronósticos (1/X/2) y el Pleno al 15",
      lototurf:
        lang === "en"
          ? "Select 6 numbers (1–31), a horse (1–12) and reintegro to start"
          : "Selecciona 6 números (1–31), un caballo (1–12) y reintegro para empezar",
      quinigol:
        lang === "en"
          ? "Select the exact result for the 6 matches (0/1/2/M – M means 3+)"
          : "Selecciona el resultado exacto de los 6 partidos (0/1/2/M – M significa 3+)",
    };

    const fallback = fallbackByGame[gameId] || fallbackByGame.primitiva;

    const text = getByPath(dict, key);
    if (typeof text === "string" && text.trim()) return text;

    const generic = getByPath(dict, "ui.hints.selectToStart");
    if (typeof generic === "string" && generic.trim()) return generic;

    return fallback;
  }

  function setupMainButtons(wrap) {
    wrap.addEventListener("click", (e) => {
      const btn = e.target.closest(".sim-btn");
      if (!btn || btn.disabled) return;

      const runKey = btn.dataset.run;
      const config = parseRunKey(runKey);

      simState = null;
      lastInvestmentInput = null;
      setAddButtonsEnabled(false);

      runSimulation(gameManager, config);
      smoothScrollToResults();
    });
  }

  function setupAddButtons(addWrap) {
    addWrap.addEventListener("click", (e) => {
      const btn = e.target.closest(".addsim-btn");
      if (!btn) return;
      if (!simState || simState.totalDraws <= 0) return;

      const m = String(btn.dataset.add || "").match(/^(\d+)y$/);
      const years = m ? Number(m[1]) : 0;
      if (!years) return;

      continueSimulation(gameManager, years);
      smoothScrollToResults();
    });
  }

  function setupSelectionListeners() {
    EventBus.on("selection:primitiva", (e) => {
      if (document.body.dataset.game !== "primitiva") return;

      selection.main = e.numbers || [];
      selection.reintegro = e.reintegro;

      if ("main" in complete) {
        const { count } = gameManager.getCurrentGame().config.pick.main;
        complete.main = selection.main.length === count;
      }

      if ("reintegro" in complete) {
        complete.reintegro =
          selection.reintegro !== null && selection.reintegro !== undefined;
      }

      recompute();
    });

    EventBus.on("selection:euromillones", (e) => {
      if (document.body.dataset.game !== "euromillones") return;

      selection.main = e.main || e.numbers || [];
      selection.stars = e.stars || [];

      if ("main" in complete) {
        const { count } = gameManager.getCurrentGame().config.pick.main;
        complete.main = selection.main.length === count;
      }

      if ("stars" in complete) {
        const { count } = gameManager.getCurrentGame().config.pick.stars;
        complete.stars = selection.stars.length === count;
      }

      recompute();
    });

    EventBus.on("selection:bonoloto", (e) => {
      if (document.body.dataset.game !== "bonoloto") return;

      selection.main = e.numbers || [];

      if ("main" in complete) {
        const { count } = gameManager.getCurrentGame().config.pick.main;
        complete.main = selection.main.length === count;
      }

      recompute();
    });

    EventBus.on("selection:gordo", (e) => {
      if (document.body.dataset.game !== "gordo") return;

      selection.main = e.main || [];
      selection.clave = e.clave;

      if ("main" in complete) {
        const { count } = gameManager.getCurrentGame().config.pick.main;
        complete.main = selection.main.length === count;
      }
      if ("clave" in complete) {
        complete.clave =
          selection.clave !== null && selection.clave !== undefined;
      }

      recompute();
    });

    EventBus.on("selection:eurodreams", (e) => {
      if (document.body.dataset.game !== "eurodreams") return;

      selection.main = e.main || e.numbers || [];
      selection.dream = e.dream;

      if ("main" in complete) {
        const { count } = gameManager.getCurrentGame().config.pick.main;
        complete.main = selection.main.length === count;
      }
      if ("dream" in complete) {
        complete.dream =
          selection.dream !== null && selection.dream !== undefined;
      }

      recompute();
    });

    EventBus.on("selection:loteria-nacional", (e) => {
      if (document.body.dataset.game !== "loteria-nacional") return;

      selection.main = e.digits || [];
      selection.decimos = e.decimos ?? null;
      selection.drawType = e.drawType ?? "navidad";

      if ("main" in complete) {
        const { count } = gameManager.getCurrentGame().config.pick.main;
        complete.main = selection.main.length === count;
      }
      if ("decimos" in complete) {
        complete.decimos =
          selection.decimos !== null && selection.decimos !== undefined;
      }
      if ("drawType" in complete) {
        complete.drawType =
          selection.drawType !== null && selection.drawType !== undefined;
      }

      recompute();
    });

    EventBus.on("selection:quiniela", (e) => {
      if (document.body.dataset.game !== "quiniela") return;

      selection.signs = Array.isArray(e.signs) ? e.signs : [];
      selection.pleno = e.pleno ?? null;

      if ("signs" in complete) {
        const count =
          gameManager.getCurrentGame().config.pick?.signs?.count || 14;
        complete.signs =
          Array.isArray(selection.signs) &&
          selection.signs.length === count &&
          selection.signs.every((v) => v === "1" || v === "X" || v === "2");
      }

      if ("pleno" in complete) {
        const p = selection.pleno || null;
        complete.pleno =
          !!p &&
          p.home !== null &&
          p.home !== undefined &&
          p.away !== null &&
          p.away !== undefined;
      }

      recompute();
    });

    EventBus.on("selection:lototurf", (e) => {
      if (document.body.dataset.game !== "lototurf") return;

      selection.main = e.numbers || [];
      selection.horse = e.horse ?? null;
      selection.reintegro = e.reintegro ?? null;

      if ("main" in complete) {
        const { count } = gameManager.getCurrentGame().config.pick.main;
        complete.main =
          Array.isArray(selection.main) && selection.main.length === count;
      }

      if ("horse" in complete) {
        complete.horse =
          selection.horse !== null && selection.horse !== undefined;
      }

      if ("reintegro" in complete) {
        complete.reintegro =
          selection.reintegro !== null && selection.reintegro !== undefined;
      }

      recompute();
    });

    EventBus.on("selection:quinigol", (e) => {
      if (document.body.dataset.game !== "quinigol") return;

      selection.matches = Array.isArray(e.matches) ? e.matches : [];

      if ("matches" in complete) {
        const count =
          gameManager.getCurrentGame().config.pick?.matches?.count || 6;

        complete.matches =
          Array.isArray(selection.matches) &&
          selection.matches.length === count &&
          selection.matches.every(
            (r) => typeof r === "string" && r.includes("-"),
          );
      }

      recompute();
    });

    EventBus.on("ui:clear", () => {
      Object.keys(complete).forEach((k) => (complete[k] = false));

      const game = gameManager.getCurrentGame();
      selection = {};

      if (!game?.config?.pick) {
        if (game?.id === "quiniela") {
          selection = { signs: [], pleno: null };
          complete = { signs: false, pleno: false };
          requiredKeys = ["signs", "pleno"];
        } else {
          selection = {};
          complete = {};
          requiredKeys = [];
        }
      } else {
        for (const k of requiredKeys) {
          const cfg = game?.config?.pick?.[k] || null;
          selection[k] = isScalarPick(k, cfg) ? null : [];
        }
      }

      simState = null;
      lastInvestmentInput = null;
      setAddButtonsEnabled(false);
      recompute();

      window.dispatchEvent(
        new CustomEvent("investment:update", {
          detail: { labels: [], series: [] },
        }),
      );
    });
  }

  function setupInvestmentAutoRefresh() {
    let pendingRecalcTimer = null;

    function scheduleRecalc() {
      if (!lastInvestmentInput) return;
      if (pendingRecalcTimer) clearTimeout(pendingRecalcTimer);

      pendingRecalcTimer = setTimeout(() => {
        pendingRecalcTimer = null;
        if (!lastInvestmentInput) return;

        const payload = buildInvestmentSeries(lastInvestmentInput);
        window.dispatchEvent(
          new CustomEvent("investment:update", { detail: payload }),
        );
      }, 0);
    }

    window.addEventListener("investment:datasetLoaded", scheduleRecalc);

    window.addEventListener("investment:datasetError", (e) => {
      console.warn("Error cargando dataset de inversión:", e?.detail);
      scheduleRecalc();
    });
  }

  function runSimulation(gameManager, config) {
    const game = gameManager.getCurrentGame();
    const engine = gameManager.getCurrentEngine();
    const userSelection = gameManager.getCurrentSelection();
    const jokerEnabled = isJokerEnabled(game);

    const millonOn = isMillonEnabled(game) ?? millonEnabled;

    if (!engine || !userSelection) return;

    const drawsPerYear = getDrawsPerYear(game, userSelection);

    const totalDraws =
      config.type === "years"
        ? Math.max(1, Math.round(drawsPerYear * config.years))
        : 200;

    simState = executeSimulation(
      engine,
      userSelection,
      totalDraws,
      jokerEnabled,
      millonOn,
      game,
      drawsPerYear,
    );

    emitResults(simState, drawsPerYear, game, jokerEnabled, millonOn);
    setAddButtonsEnabled(true);
  }

  function continueSimulation(gameManager, years) {
    if (!simState) return;

    const game = gameManager.getCurrentGame();
    const engine = gameManager.getCurrentEngine();
    const userSelection = gameManager.getCurrentSelection();
    const jokerEnabled = isJokerEnabled(game);

    const millonOn = isMillonEnabled(game) ?? millonEnabled;

    const drawsPerYear = getDrawsPerYear(game, userSelection);

    const extraDraws = Math.max(1, Math.round(drawsPerYear * years));

    simState = continueExecutingSimulation(
      engine,
      userSelection,
      extraDraws,
      jokerEnabled,
      millonOn,
      game,
      simState,
    );

    emitResults(simState, drawsPerYear, game, jokerEnabled, millonOn);
  }

  function emitResults(state, drawsPerYear, game, jokerEnabled, millonOn) {
    const yearsSoFar = state.totalDraws / drawsPerYear;

    const netBalance = state.totalWon - state.totalSpent;
    const profitPerEuro = state.totalSpent ? netBalance / state.totalSpent : 0;

    EventBus.emit("sim:done", {
      totalDraws: state.totalDraws,
      yearsElapsed: yearsSoFar,
      currentDate: state.draws.length
        ? state.draws[state.draws.length - 1].date
        : new Date(),
      totalSpent: state.totalSpent,
      totalWon: state.totalWon,
      netBalance,
      profitPerEuro,
      biggestPrize: state.biggestPrize,
      biggestPrizeDrawNumber: state.biggestPrizeDrawNumber,
      biggestPrizeDate: state.biggestPrizeDate,
      highlightDraw: state.highlightDraw,
      draws: state.draws,
    });

    const pricePerDraw =
      state.pricePerDraw ??
      getUserCostPerDraw(game, jokerEnabled, millonOn, state.lastSelection);

    lastInvestmentInput = {
      draws: state.draws,
      pricePerDraw,
      scenarioSeed: state.investmentScenarioSeed,
      options: {
        continuousMonths: true,
        applyHistoricalHardClamp: false,
        useFutureJitter: true,
        futureJitterStd: 0.002,
      },
    };

    const payload = buildInvestmentSeries(lastInvestmentInput);

    window.dispatchEvent(
      new CustomEvent("investment:update", { detail: payload }),
    );
  }
}

function executeSimulation(
  engine,
  userSelection,
  totalDraws,
  jokerEnabled,
  millonEnabled,
  game,
  drawsPerYear,
) {
  const baseNow = new Date();

  let firstDrawDate = getNextDrawDate(baseNow, game.config.economy.drawDays);

  if (game?.id === "loteria-nacional") {
    const lnFirst = getNextLoteriaNacionalDrawDate(
      baseNow,
      userSelection?.drawType,
    );
    if (lnFirst) firstDrawDate = lnFirst;
  }

  const state = {
    totalDraws: 0,
    totalSpent: 0,
    totalWon: 0,
    biggestPrize: 0,
    biggestPrizeDrawNumber: null,
    biggestPrizeDate: null,
    highlightDraw: "—",
    draws: [],
    baseNow,
    lastDrawDate: firstDrawDate,
    investmentScenarioSeed: createScenarioSeed(),
    lastSelection: userSelection,
  };

  const pricePerDraw = getUserCostPerDraw(
    game,
    jokerEnabled,
    millonEnabled,
    userSelection,
  );
  state.pricePerDraw = pricePerDraw;

  for (let i = 0; i < totalDraws; i++) {
    state.totalSpent += pricePerDraw;

    const drawDate = state.lastDrawDate;

    const result = engine.runDraw({
      player: buildPlayerForEngine(game, userSelection),
      joker: jokerEnabled,
      drawDate,
      millonEnabled: Boolean(millonEnabled),
      drawType: userSelection?.drawType,
      decimos: userSelection?.decimos,
    });

    const mainPrize = result?.results?.player?.prize || 0;
    const jokerPrize = result?.results?.player?.jokerPrize || 0;
    const millonPrize = result?.results?.player?.millonPrize || 0;

    const prize = mainPrize + jokerPrize + millonPrize;

    state.totalWon += prize;

    const nextDrawNumber = state.totalDraws + 1;

    if (prize > state.biggestPrize) {
      state.biggestPrize = prize;
      state.biggestPrizeDrawNumber = nextDrawNumber;
      state.biggestPrizeDate = drawDate;
      state.highlightDraw = `Sorteo #${nextDrawNumber}`;
    }

    state.draws.push(
      buildDrawEntry({
        drawDate,
        userSelection,
        result,
        prize,
        jokerEnabled,
        millonEnabled,
        game,
      }),
    );

    state.totalDraws++;

    if (game?.id === "loteria-nacional") {
      const lnNext = getNextLoteriaNacionalDrawDate(
        state.lastDrawDate,
        userSelection?.drawType,
      );

      state.lastDrawDate = lnNext
        ? lnNext
        : getNextDrawDate(state.lastDrawDate, game.config.economy.drawDays);
    } else {
      state.lastDrawDate = getNextDrawDate(
        state.lastDrawDate,
        game.config.economy.drawDays,
      );
    }
  }

  return state;
}

function continueExecutingSimulation(
  engine,
  userSelection,
  extraDraws,
  jokerEnabled,
  millonEnabled,
  game,
  previousState,
) {
  const state = { ...previousState };
  state.lastSelection = userSelection;

  const pricePerDraw = getUserCostPerDraw(
    game,
    jokerEnabled,
    millonEnabled,
    userSelection,
  );
  state.pricePerDraw = pricePerDraw;

  if (!Number.isFinite(Number(state.investmentScenarioSeed))) {
    state.investmentScenarioSeed = createScenarioSeed();
  }

  for (let i = 0; i < extraDraws; i++) {
    state.totalSpent += pricePerDraw;

    const drawDate = state.lastDrawDate;

    const result = engine.runDraw({
      player: buildPlayerForEngine(game, userSelection),
      joker: jokerEnabled,
      drawDate,
      millonEnabled: Boolean(millonEnabled),
      drawType: userSelection?.drawType,
      decimos: userSelection?.decimos,
    });

    const mainPrize = result?.results?.player?.prize || 0;
    const jokerPrize = result?.results?.player?.jokerPrize || 0;
    const millonPrize = result?.results?.player?.millonPrize || 0;

    const prize = mainPrize + jokerPrize + millonPrize;

    state.totalWon += prize;

    const nextDrawNumber = state.totalDraws + 1;

    if (prize > state.biggestPrize) {
      state.biggestPrize = prize;
      state.biggestPrizeDrawNumber = nextDrawNumber;
      state.biggestPrizeDate = drawDate;
      state.highlightDraw = `Sorteo #${nextDrawNumber}`;
    }

    state.draws.push(
      buildDrawEntry({
        drawDate,
        userSelection,
        result,
        prize,
        jokerEnabled,
        millonEnabled,
        game,
      }),
    );

    state.totalDraws++;

    if (game?.id === "loteria-nacional") {
      const lnNext = getNextLoteriaNacionalDrawDate(
        state.lastDrawDate,
        userSelection?.drawType,
      );

      state.lastDrawDate = lnNext
        ? lnNext
        : getNextDrawDate(state.lastDrawDate, game.config.economy.drawDays);
    } else {
      state.lastDrawDate = getNextDrawDate(
        state.lastDrawDate,
        game.config.economy.drawDays,
      );
    }
  }

  return state;
}

function buildDrawEntry({
  drawDate,
  userSelection,
  result,
  prize,
  jokerEnabled,
  millonEnabled,
  game,
}) {
  const stats = result?.stats || null;
  const winners = result?.results?.winners || null;
  const winnersEffective = result?.results?.winnersEffective || null;

  const category = result?.results?.player?.category ?? null;

  const playerJokerNumber = result?.results?.player?.jokerPlayed ?? null;
  const drawnJokerNumber = result?.draw?.joker ?? null;
  const playerJokerPrize = result?.results?.player?.jokerPrize || 0;
  const playerJokerHits = result?.results?.player?.jokerHits || 0;

  const hasPlayerJoker = Boolean(
    jokerEnabled && playerJokerNumber && drawnJokerNumber,
  );

  const playerJokerCost =
    jokerEnabled && game?.id === "primitiva"
      ? Number(game?.config?.extras?.joker?.pricePerBet) || 0
      : 0;

  const playerMainCost = Number(game?.config?.economy?.pricePerDraw) || 0;

  const playerMillonCost =
    millonEnabled && game?.id === "euromillones"
      ? Number(game?.config?.extras?.millon?.pricePerBet) || 0
      : 0;

  const millonPlayed = result?.results?.player?.millonPlayed ?? null;
  const millonDrawn = result?.draw?.millon ?? null;
  const millonPrize = result?.results?.player?.millonPrize || 0;

  const hasMillon = Boolean(millonEnabled && millonPlayed && millonDrawn);

  const isQuiniela = game?.id === "quiniela";
  const isQuinigol = game?.id === "quinigol";

  const isLototurf = game?.id === "lototurf";
  const lototurfHorseYour = isLototurf ? (userSelection?.horse ?? null) : null;
  const lototurfHorseDrawn = isLototurf ? (result?.draw?.horse ?? null) : null;

  const yourMain =
    isQuiniela || isQuinigol
      ? []
      : userSelection?.main || userSelection?.numbers || [];
  const yourStars = isQuiniela || isQuinigol ? [] : userSelection?.stars || [];

  const yourDream =
    game?.id === "eurodreams" ? (userSelection?.dream ?? null) : null;
  const drawnDream =
    game?.id === "eurodreams" ? (result?.draw?.dream ?? null) : null;

  const yourReintegro =
    game?.id === "bonoloto"
      ? (result?.results?.player?.reintegroPlayed ?? null)
      : userSelection?.reintegro !== undefined
        ? userSelection.reintegro
        : null;

  const yourClave =
    game?.id === "gordo" ? (userSelection?.clave ?? null) : null;

  const drawnMain = isQuiniela || isQuinigol ? [] : result?.draw?.numbers || [];
  const drawnStars = isQuiniela || isQuinigol ? [] : result?.draw?.stars || [];
  const drawnReintegro =
    result?.draw?.reintegro !== undefined ? result.draw.reintegro : null;

  const drawnComplementario =
    result?.draw?.complementario !== undefined
      ? result.draw.complementario
      : null;

  const drawnClave =
    result?.draw?.clave !== undefined ? result.draw.clave : null;

  const yourSigns = isQuiniela ? userSelection?.signs || [] : undefined;
  const yourPleno = isQuiniela ? (userSelection?.pleno ?? null) : undefined;

  const drawnSigns = isQuiniela
    ? result?.draw?.numbers || result?.draw?.signs || []
    : undefined;
  const drawnPleno = isQuiniela ? (result?.draw?.pleno ?? null) : undefined;

  const yourQuinigol = isQuinigol ? userSelection?.matches || [] : undefined;
  const drawnQuinigol = isQuinigol
    ? result?.draw?.matches || result?.draw?.results || []
    : undefined;

  const lnSecondDigits = result?.draw?.secondNumbers ?? null;
  const lnEndings4 = result?.draw?.endings4 ?? null;
  const lnEndings3 = result?.draw?.endings3 ?? null;
  const lnEndings2 = result?.draw?.endings2 ?? null;
  const lnReintegros = result?.draw?.reintegros ?? null;

  return {
    gameId: game?.id || null,
    gameLabel: game?.name || game?.config?.label || null,

    date: drawDate,

    your: {
      main: yourMain,
      stars: yourStars.length ? yourStars : undefined,
      reintegro: yourReintegro,
      clave: yourClave,
      dream: yourDream,
      decimos:
        game?.id === "loteria-nacional" ? userSelection?.decimos : undefined,
      drawType:
        game?.id === "loteria-nacional" ? userSelection?.drawType : undefined,

      signs: yourSigns,
      pleno: yourPleno,

      matches: isQuinigol ? yourQuinigol : undefined,

      horse: isLototurf ? lototurfHorseYour : undefined,

      joker: hasPlayerJoker ? String(playerJokerNumber) : undefined,
      jokerDigits: hasPlayerJoker ? String(playerJokerNumber) : undefined,

      millon: hasMillon ? String(millonPlayed) : undefined,
    },

    drawn: {
      main: drawnMain,
      stars: drawnStars.length ? drawnStars : undefined,
      reintegro: drawnReintegro,
      complementario: drawnComplementario,
      clave: drawnClave,
      dream: drawnDream,

      signs: drawnSigns,
      pleno: drawnPleno,

      matches: isQuinigol ? drawnQuinigol : undefined,

      horse: isLototurf ? lototurfHorseDrawn : undefined,

      joker: hasPlayerJoker ? String(drawnJokerNumber) : undefined,
      jokerDigits: hasPlayerJoker ? String(drawnJokerNumber) : undefined,

      millon: hasMillon ? String(millonDrawn) : undefined,

      secondMain: lnSecondDigits,
      endings4: lnEndings4,
      endings3: lnEndings3,
      endings2: lnEndings2,
      reintegros: lnReintegros,
    },

    millon: hasMillon
      ? {
          your: String(millonPlayed),
          drawn: String(millonDrawn),
          prize: millonPrize,
        }
      : null,

    prize,
    category,
    bets: stats?.betsMain ?? null,

    jackpot:
      stats?.jackpotCarryover ??
      stats?.jackpotNext ??
      stats?.jackpotPotThisDraw ??
      stats?.jackpot ??
      null,

    joker: hasPlayerJoker
      ? {
          your: String(playerJokerNumber),
          drawn: String(drawnJokerNumber),
          hits: playerJokerHits,
          prize: playerJokerPrize,
        }
      : null,

    stats: stats
      ? {
          ...stats,
          mainPlayerCost: playerMainCost,
          jokerPlayerCost: playerJokerCost,
          millonPlayerCost: playerMillonCost,
        }
      : {
          mainPlayerCost: playerMainCost,
          jokerPlayerCost: playerJokerCost,
          millonPlayerCost: playerMillonCost,
        },

    results: {
      winners,
      winnersEffective,
      player: {
        category,
        prize: result?.results?.player?.prize ?? 0,
        jokerPrize: result?.results?.player?.jokerPrize ?? 0,
        jokerHits: result?.results?.player?.jokerHits ?? 0,
        jokerPlayed: result?.results?.player?.jokerPlayed ?? null,

        millonPrize: millonPrize || 0,
        millonPlayed: millonPlayed ? String(millonPlayed) : null,

        reintegroPlayed: result?.results?.player?.reintegroPlayed ?? null,
        clavePlayed: result?.results?.player?.clavePlayed ?? null,

        dreamPlayed: game?.id === "eurodreams" ? (yourDream ?? null) : null,

        quinielaSigns: isQuiniela ? yourSigns : null,
        quinielaPleno: isQuiniela ? yourPleno : null,

        quinigolMatches: isQuinigol ? yourQuinigol : null,

        lototurfHorse: isLototurf ? lototurfHorseYour : null,

        lnDecimos:
          game?.id === "loteria-nacional"
            ? (userSelection?.decimos ?? null)
            : null,
        lnDrawType:
          game?.id === "loteria-nacional"
            ? (userSelection?.drawType ?? null)
            : null,
      },
    },
  };
}

function buildPlayerForEngine(game, userSelection) {
  const gameId = game?.id;

  if (gameId === "euromillones") {
    return {
      main: userSelection?.main || [],
      stars: userSelection?.stars || [],
    };
  }

  if (gameId === "bonoloto") {
    return {
      main: userSelection?.main || [],
      reintegro: null,
      joker: null,
    };
  }

  if (gameId === "gordo") {
    return {
      main: userSelection?.main || [],
      clave: userSelection?.clave ?? null,
    };
  }

  if (gameId === "eurodreams") {
    return {
      main: userSelection?.main || [],
      dream: userSelection?.dream ?? null,
    };
  }

  if (gameId === "loteria-nacional") {
    return {
      digits: userSelection?.main || [],
      decimos: userSelection?.decimos ?? 1,
      drawType: userSelection?.drawType ?? "navidad",
    };
  }

  if (gameId === "quiniela") {
    return {
      signs: userSelection?.signs || [],
      pleno: userSelection?.pleno ?? null,
    };
  }

  if (gameId === "quinigol") {
    return {
      matches: userSelection?.matches || [],
    };
  }

  if (gameId === "lototurf") {
    return {
      main: userSelection?.main || userSelection?.numbers || [],
      horse: userSelection?.horse ?? null,
      reintegro:
        userSelection?.reintegro !== undefined ? userSelection.reintegro : null,
    };
  }

  return {
    main: userSelection?.main || [],
    reintegro:
      userSelection?.reintegro !== undefined ? userSelection.reintegro : null,
    joker: null,
  };
}

function parseRunKey(runKey) {
  if (runKey === "run") return { type: "years", years: 1 };
  if (runKey === "until-jackpot") return { type: "untilJackpot" };
  const m = String(runKey).match(/^(\d+)y$/);
  return m
    ? { type: "years", years: Number(m[1]) }
    : { type: "years", years: 1 };
}

function getDrawsPerYear(game, selection = null) {
  if (game?.id === "loteria-nacional") {
    const dt = String(selection?.drawType || "navidad");
    if (dt === "navidad" || dt === "nino") return 1;
    if (dt === "jueves" || dt === "sabado") return 52;
    return 1;
  }

  if (
    game?.id === "quiniela" ||
    game?.id === "lototurf" ||
    game?.id === "quinigol"
  )
    return 52;

  return (game?.config?.economy?.drawDays?.length || 2) * 52;
}

function getNextLoteriaNacionalDrawDate(fromDate, drawType) {
  const dt = String(drawType || "navidad");
  const base = new Date(fromDate);

  if (dt === "navidad") {
    const year = base.getFullYear();
    const candidate = new Date(year, 11, 22);
    candidate.setHours(13, 0, 0, 0);
    return candidate > base
      ? candidate
      : new Date(year + 1, 11, 22, 13, 0, 0, 0);
  }

  if (dt === "nino") {
    const year = base.getFullYear();
    const candidate = new Date(year, 0, 6);
    candidate.setHours(13, 0, 0, 0);
    return candidate > base ? candidate : new Date(year + 1, 0, 6, 13, 0, 0, 0);
  }

  return null;
}

function getUserCostPerDraw(
  game,
  jokerEnabled,
  millonEnabled,
  selection = null,
) {
  const basePrice = Number(game?.config?.economy?.pricePerDraw) || 0;

  const jokerPrice =
    jokerEnabled && game?.id === "primitiva"
      ? Number(game?.config?.extras?.joker?.pricePerBet) || 0
      : 0;

  const millonPrice =
    millonEnabled && game?.id === "euromillones"
      ? Number(game?.config?.extras?.millon?.pricePerBet) || 0
      : 0;

  if (game?.id === "loteria-nacional") {
    const dec = Math.max(1, Math.min(10, Number(selection?.decimos) || 1));
    return basePrice * dec;
  }

  return basePrice + jokerPrice + millonPrice;
}

function isJokerEnabled(game) {
  if (game?.id !== "primitiva") return false;

  return Boolean(
    document
      .querySelector('.joker-btn[data-joker="yes"]')
      ?.classList.contains("is-active"),
  );
}

function isMillonEnabled(game) {
  if (game?.id !== "euromillones") return null;

  const yes = document.querySelector('[data-millon="yes"]');
  const no = document.querySelector('[data-millon="no"]');
  if (!yes || !no) return null;

  return yes.classList.contains("is-active");
}

function setButtonsEnabled(enabled) {
  document.querySelectorAll(".sim-buttons .sim-btn").forEach((b) => {
    b.disabled = !enabled;
    b.setAttribute("aria-disabled", enabled ? "false" : "true");
    b.classList.toggle("is-disabled", !enabled);
  });
}

function setAddButtonsEnabled(enabled) {
  document.querySelectorAll(".addsim-btn").forEach((b) => {
    b.disabled = !enabled;
    b.setAttribute("aria-disabled", enabled ? "false" : "true");
  });
}

function setHint(text) {
  const el = document.getElementById("sim-hint");
  if (el) el.textContent = text || "";
}

function smoothScrollToResults() {
  const el =
    document.getElementById("results-title") ||
    document.getElementById("results");
  if (!el) return;
  try {
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  } catch {
    el.scrollIntoView(true);
  }
}

function createScenarioSeed() {
  try {
    const a = new Uint32Array(1);
    crypto.getRandomValues(a);
    return a[0] >>> 0;
  } catch {
    return Math.floor(Math.random() * 0xffffffff) >>> 0 || 1;
  }
}
