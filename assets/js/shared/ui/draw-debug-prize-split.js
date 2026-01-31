// assets/js/shared/ui/draw-debug-prize-split.js
// Lógica del bloque “Premios”: principal + extra (Joker / El Millón) + balances

import { num, getByPath } from "./draw-debug-helpers.js";

function firstVal(...vals) {
  for (const v of vals) {
    if (v !== null && v !== undefined && v !== "") return v;
  }
  return null;
}

export function computePrizeSplit(draw, gameId) {
  const stats = draw?.stats || {};
  const isPrimitiva = gameId === "primitiva";
  const isEuro = gameId === "euromillones";

  // --- Total prize (si viene ya sumado) ---
  const totalPrizeThisDraw = num(
    stats?.totalPrizeThisDraw ??
      stats?.prizeThisDraw ??
      draw?.totalPrize ??
      draw?.prizeTotal ??
      draw?.prize ??
      0,
  );

  // --- Joker (solo Primitiva) ---
  const jokerCost = num(
    stats?.jokerPlayerCost > 0 ? stats?.jokerPlayerCost : stats?.jokerShare,
  );

  const jokerPrize = num(
    firstVal(
      stats?.jokerPrizeThisDraw,
      stats?.prizeJokerThisDraw,
      stats?.jokerPrize,
      getByPath(stats, "joker.prizeThisDraw"),
      getByPath(stats, "joker.prize"),
      draw?.prizeJoker,
      draw?.jokerPrize,
      getByPath(draw, "prizes.joker"),
      getByPath(draw, "payouts.joker"),
      getByPath(draw, "results.jokerPrize"),
      getByPath(draw, "results.player.jokerPrize"),
      getByPath(draw, "results.player.jokerPrizeThisDraw"),
    ) ?? 0,
  );

  const jokerNet = jokerPrize - jokerCost;

  const showJokerSplit =
    isPrimitiva &&
    (Boolean(stats?.jokerEnabled) || jokerCost > 0 || jokerPrize > 0);

  // --- El Millón (solo Euromillones) ---
  const millonPrize = num(
    firstVal(
      getByPath(stats, "millonPrizeThisDraw"),
      getByPath(draw, "results.player.millonPrize"),
      getByPath(draw, "results.player.millon.prize"),
    ) ?? 0,
  );

  const millonCost = num(
    firstVal(
      getByPath(stats, "millonPlayerCost"),
      getByPath(stats, "millonPricePerBetExtra"),
      getByPath(draw, "results.player.millonCost"),
    ) ?? 0,
  );

  const millonNet = millonPrize - millonCost;

  const millonEnabled =
    Boolean(stats?.millonEnabled) ||
    Boolean(draw?.your?.millonEnabled) ||
    Boolean(draw?.your?.millon) ||
    Boolean(draw?.your?.millonCode) ||
    Boolean(getByPath(draw, "results.player.millonPlayed"));

  const showMillonSplit =
    isEuro && (millonEnabled || millonPrize > 0 || millonCost > 0);

  // --- Main prize ---
  const mainPrizeRaw = firstVal(
    stats?.mainPrizeThisDraw,
    stats?.prizeMainThisDraw,
    stats?.prizeMain,
    getByPath(stats, "main.prizeThisDraw"),
    draw?.prizeMain,
    draw?.mainPrize,
    getByPath(draw, "prizes.main"),
    getByPath(draw, "payouts.main"),
  );

  // Si el total existe pero el main viene 0 por defecto,
  // inferimos main desde el total restando el extra aplicable.
  const inferredMainFromTotal = isEuro
    ? Math.max(0, totalPrizeThisDraw - millonPrize)
    : Math.max(0, totalPrizeThisDraw - jokerPrize);

  const mainPrize =
    Number.isFinite(Number(mainPrizeRaw)) && num(mainPrizeRaw) > 0
      ? num(mainPrizeRaw)
      : inferredMainFromTotal;

  // --- Main cost (fallback Euromillones = 2,50€ si no llega) ---
  const mainCostRaw = num(
    firstVal(
      stats?.mainPlayerCost,
      stats?.playerCostMain,
      stats?.costMainPlayer,
      stats?.spendMainThisDraw,
      stats?.mainSpendThisDraw,
      getByPath(stats, "main.playerCost"),
      getByPath(stats, "main.cost"),
    ) ?? 0,
  );

  const mainCost = isEuro && mainCostRaw <= 0 ? 2.5 : mainCostRaw;
  const mainNet = mainPrize - mainCost;

  // --- Total efectivo: si el total NO viene, lo recomponemos ---
  const totalExplicit = firstVal(
    stats?.totalPrizeThisDraw,
    stats?.prizeThisDraw,
    draw?.totalPrize,
    draw?.prizeTotal,
    draw?.prize,
  );

  const totalPrizeEffective =
    totalExplicit !== null && totalExplicit !== undefined
      ? totalPrizeThisDraw
      : isEuro
        ? mainPrize + millonPrize
        : mainPrize + jokerPrize;

  const totalNet =
    totalPrizeEffective -
    mainCost -
    (showJokerSplit ? jokerCost : 0) -
    (showMillonSplit ? millonCost : 0);

  return {
    // main
    mainPrize,
    mainCost,
    mainNet,

    // joker
    showJokerSplit,
    jokerPrize,
    jokerCost,
    jokerNet,

    // millon
    showMillonSplit,
    millonPrize,
    millonCost,
    millonNet,

    // totals
    totalPrizeEffective,
    totalNet,

    // useful flags
    millonEnabled,
  };
}

export function getPrizeLabels({ lang, t, gameId }) {
  const isPrimitiva = gameId === "primitiva";
  const isEuro = gameId === "euromillones";

  const totalPrizeKey = isPrimitiva
    ? "results.drawDetail.totalPrizeMainJoker"
    : isEuro
      ? "results.drawDetail.totalPrizeMainMillon"
      : "results.drawDetail.totalPrizeMainOnly";

  const totalNetKey = isPrimitiva
    ? "results.drawDetail.totalNetMainJoker"
    : isEuro
      ? "results.drawDetail.totalNetMainMillon"
      : "results.drawDetail.totalNetMainOnly";

  const totalPrizeLabel = t(
    totalPrizeKey,

    lang === "en" ? "Total prize" : "Premio total",
  );

  const totalNetLabel = t(
    totalNetKey,
    lang === "en" ? "Total balance" : "Balance total",
  );

  const prizeMainLabel = t(
    "results.drawDetail.prizeMain",
    lang === "en" ? "Main prize" : "Premio principal",
  );

  const netMainLabel = t(
    "results.drawDetail.netMain",
    lang === "en" ? "Main balance" : "Balance principal",
  );

  const prizeJokerLabel = t(
    "results.drawDetail.prizeJoker",
    lang === "en" ? "Joker prize" : "Premio Joker",
  );

  const netJokerLabel = t(
    "results.drawDetail.netJoker",
    lang === "en" ? "Joker balance" : "Balance Joker",
  );

  const prizeMillonLabel = t(
    "results.drawDetail.prizeMillon",
    lang === "en" ? "El Millón prize" : "Premio El Millón",
  );

  const netMillonLabel = t(
    "results.drawDetail.netMillon",
    lang === "en" ? "El Millón balance" : "Balance El Millón",
  );

  return {
    totalPrizeLabel,
    totalNetLabel,
    prizeMainLabel,
    netMainLabel,
    prizeJokerLabel,
    netJokerLabel,
    prizeMillonLabel,
    netMillonLabel,
  };
}
