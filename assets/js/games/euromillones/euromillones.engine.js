// assets/js/games/euromillones/euromillones.engine.js

/**
 * MOTOR MÁS REALISTA - EUROMILLONES (ESPAÑA) - Normas SELAE Mayo 2020
 *
 * Ajustes clave:
 * - Fondo de premios = 50% de recaudación
 * - Distribución oficial por categorías
 * - Fondo de Reserva (10% o 18%)
 * - 1ª categoría: 50% (sorteos 1-5 ciclo) o 42% (desde sorteo 6)
 * - Roll-down real: categorías sin acertantes bajan a la inmediatamente inferior con acertantes
 * - Si 13ª sin acertantes: su fondo sube a 1ª del sorteo siguiente
 * - Tope dinámico: 200M, +10M por ciclo si se alcanza, hasta 250M
 * - Exceso por tope baja a la siguiente categoría con acertantes
 * - Si se ofrece el tope 4 sorteos seguidos sin 1ª, en el 5º baja a categoría inferior con acertantes
 * - El Millón (España): automático, incluido, 1 ganador en España por sorteo
 */

import { EuromillonesConfig } from "./euromillones.config.js";

// ==========================
// RNG HELPERS
// ==========================
function rand() {
  return Math.random();
}
function randInt(min, max) {
  return Math.floor(rand() * (max - min + 1)) + min;
}
function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}
function randn() {
  let u = 0,
    v = 0;
  while (u === 0) u = rand();
  while (v === 0) v = rand();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}
function poisson(lambda) {
  const l = Number(lambda);
  if (!Number.isFinite(l) || l <= 0) return 0;

  if (l < 30) {
    const L = Math.exp(-l);
    let k = 0;
    let p = 1;
    do {
      k++;
      p *= rand();
    } while (p > L);
    return k - 1;
  }

  const n = Math.round(l + Math.sqrt(l) * randn());
  return Math.max(0, n);
}
function pickUnique(count, min, max) {
  const s = new Set();
  while (s.size < count) s.add(randInt(min, max));
  return Array.from(s).sort((a, b) => a - b);
}
function matches(arrA, arrB) {
  return arrA.filter((n) => arrB.includes(n)).length;
}
function safeDivide(pool, count) {
  return count > 0 ? pool / count : 0;
}

// ==========================
// EL MILLÓN HELPERS
// ==========================
function randomLetters(n) {
  const A = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let out = "";
  for (let i = 0; i < n; i++) out += A[randInt(0, A.length - 1)];
  return out;
}
function randomDigits(n) {
  let out = "";
  for (let i = 0; i < n; i++) out += String(randInt(0, 9));
  return out;
}
function generateMillonCode() {
  return `${randomLetters(3)}${randomDigits(5)}`;
}
function generateDifferentMillonCode(notThis) {
  let c = generateMillonCode();
  while (c === notThis) c = generateMillonCode();
  return c;
}

// ==========================
// MODELO DE PARTICIPACIÓN
// ==========================
function weekdayKeyFromDate(drawDate) {
  const d = drawDate instanceof Date ? drawDate : new Date(drawDate);
  if (Number.isNaN(d.getTime())) return null;
  const wd = d.getDay();
  if (wd === 2) return "tuesday";
  if (wd === 5) return "friday";
  return null;
}

function buildWorldBetsModel(userModel) {
  const defaults = EuromillonesConfig.economy.worldBetsModel;
  const m = userModel && typeof userModel === "object" ? userModel : {};

  return {
    baseByWeekday: { ...defaults.baseByWeekday, ...(m.baseByWeekday || {}) },
    clampMin: Number.isFinite(m.clampMin) ? m.clampMin : defaults.clampMin,
    clampMax: Number.isFinite(m.clampMax) ? m.clampMax : defaults.clampMax,
    jackpotBumpK: Number.isFinite(m.jackpotBumpK)
      ? m.jackpotBumpK
      : defaults.jackpotBumpK,
    jackpotBumpRef: Number.isFinite(m.jackpotBumpRef)
      ? m.jackpotBumpRef
      : defaults.jackpotBumpRef,
    noiseSigma: Number.isFinite(m.noiseSigma)
      ? m.noiseSigma
      : defaults.noiseSigma,
    noiseMin: Number.isFinite(m.noiseMin) ? m.noiseMin : defaults.noiseMin,
    noiseMax: Number.isFinite(m.noiseMax) ? m.noiseMax : defaults.noiseMax,
  };
}

function estimateMainBets({ jackpot, drawDate, model }) {
  const j = Math.max(0, Number(jackpot) || 0);

  const weekdayKey = weekdayKeyFromDate(drawDate);
  const base =
    (weekdayKey && model.baseByWeekday[weekdayKey]) ||
    model.baseByWeekday.friday ||
    65_000_000;

  const bump =
    1 + model.jackpotBumpK * Math.log10(1 + j / model.jackpotBumpRef);

  const noise = clamp(
    1 + randn() * model.noiseSigma,
    model.noiseMin,
    model.noiseMax,
  );

  const bets = Math.round(base * bump * noise);
  return clamp(bets, model.clampMin, model.clampMax);
}

// ==========================
// % OFICIALES (Norma 8ª.1 y 8ª.2)
// ==========================
function getCyclePercents(drawIndexInCycle) {
  if (drawIndexInCycle <= 5) {
    return { firstPct: 50, reservePct: 10 };
  }
  return { firstPct: 42, reservePct: 18 };
}

function toMoney(n) {
  return Number.isFinite(n) ? n : 0;
}

// ==========================
// ENGINE PRINCIPAL
// ==========================
export function createEuromillonesEngine({
  pricePerBet = EuromillonesConfig.economy.pricePerDraw,
  prizePoolPercent = EuromillonesConfig.economy.prizePoolPercent,
  initialJackpot = EuromillonesConfig.economy.initialJackpot,
  jackpotCap = EuromillonesConfig.economy.jackpotCap,
  worldBetsModel = null,
} = {}) {
  let jackpot = toMoney(initialJackpot);

  let drawIndexInCycle = 1;

  let reserveFund = 0;

  let carryToNextTopFrom13 = 0;

  const CAP_START = toMoney(jackpotCap?.start) || 200_000_000;
  const CAP_STEP = toMoney(jackpotCap?.step) || 10_000_000;
  const CAP_MAX = toMoney(jackpotCap?.max) || 250_000_000;

  let jackpotCapCurrent = CAP_START;

  let capOfferStreak = 0;

  const WORLD_BETS_MODEL = buildWorldBetsModel(worldBetsModel);
  const PROBS = EuromillonesConfig.probabilities;
  const FIXED = EuromillonesConfig.fixedCategoryPercents;
  const ORDER = EuromillonesConfig.categoryOrder;

  const MILLON_CFG = EuromillonesConfig?.extras?.millon || {
    enabled: true,
    automatic: true,
    pricePerBet: 0,
    prize: 1_000_000,
    spainShare: 0.12,
  };

  function bumpCapForNextCycleIfPossible() {
    jackpotCapCurrent = Math.min(CAP_MAX, jackpotCapCurrent + CAP_STEP);
  }

  function findNextLowerWithWinners(startIdx, winnersEffective) {
    for (let i = startIdx + 1; i < ORDER.length; i++) {
      const cat = ORDER[i];
      if ((winnersEffective[cat] || 0) > 0) return cat;
    }
    return null;
  }

  function findLowerWithWinnersFromTop(winnersEffective) {
    for (let i = 1; i < ORDER.length; i++) {
      const cat = ORDER[i];
      if ((winnersEffective[cat] || 0) > 0) return cat;
    }
    return null;
  }

  return {
    getJackpot() {
      return jackpot;
    },

    setJackpot(value) {
      jackpot = clamp(toMoney(value), 0, jackpotCapCurrent);
    },

    runDraw({ player, drawDate = null } = {}) {
      /* ========================================
         1) PARTICIPACIÓN (mundo)
         ======================================== */
      const betsMainTotal = estimateMainBets({
        jackpot,
        drawDate,
        model: WORLD_BETS_MODEL,
      });

      const betsMainWorld = Math.max(0, betsMainTotal - 1);
      const revenueMain = betsMainTotal * pricePerBet;

      // Norma 8ª.1: 50% recaudación => fondo de premios
      const prizeFund = revenueMain * prizePoolPercent;

      /* ========================================
         2) SORTEO
         ======================================== */
      const drawnMain = pickUnique(5, 1, 50);
      const drawnStars = pickUnique(2, 1, 12);

      /* ========================================
         3) EL MILLÓN (España)
         ======================================== */
      const millonActive = true;

      const spainShareRaw = Number(MILLON_CFG?.spainShare);
      const spainShare =
        Number.isFinite(spainShareRaw) &&
        spainShareRaw > 0 &&
        spainShareRaw <= 1
          ? spainShareRaw
          : 0.12;

      const betsSpain = Math.max(1, Math.round(betsMainTotal * spainShare));

      const millonPlayed = generateMillonCode();
      const millonWin = rand() < 1 / betsSpain;
      const millonDrawn = millonWin
        ? millonPlayed
        : generateDifferentMillonCode(millonPlayed);

      const millonPrize = millonWin
        ? toMoney(MILLON_CFG.prize) || 1_000_000
        : 0;

      /* ========================================
         4) RESULTADO DEL JUGADOR
         ======================================== */
      const matchMain = matches(player.main, drawnMain);
      const matchStars = matches(player.stars, drawnStars);

      const playerCategory = `${matchMain}+${matchStars}`;
      const hasValidCategory = playerCategory in PROBS;

      /* ========================================
         5) GANADORES “MUNDO” (sin el jugador)
         ======================================== */
      const winnersWorld = {};
      Object.keys(PROBS).forEach((cat) => {
        winnersWorld[cat] = Math.max(0, poisson(betsMainWorld * PROBS[cat]));
      });

      const winnersEffective = { ...winnersWorld };
      if (hasValidCategory) {
        winnersEffective[playerCategory] =
          (winnersEffective[playerCategory] || 0) + 1;
      }

      /* ========================================
         6) PORCENTAJES DEL SORTEO (según ciclo)
         ======================================== */
      const { firstPct, reservePct } = getCyclePercents(drawIndexInCycle);

      const poolsInitial = {};
      const poolsFinal = {};

      const reserveThisDraw = (prizeFund * reservePct) / 100;
      reserveFund += reserveThisDraw;

      const firstFundThisDraw = (prizeFund * firstPct) / 100;

      ORDER.forEach((cat) => {
        if (cat === "5+2") return;
        const pct = FIXED[cat] || 0;
        poolsInitial[cat] = (prizeFund * pct) / 100;
      });

      poolsInitial["5+2"] = firstFundThisDraw;

      /* ========================================
         7) BOTE OFERTADO (1ª) + TOPE DINÁMICO
         ======================================== */
      const jackpotBefore = jackpot;

      const rawTopPot =
        poolsInitial["5+2"] + jackpotBefore + carryToNextTopFrom13;

      const carryFrom13Used = carryToNextTopFrom13;
      carryToNextTopFrom13 = 0;

      let jackpotPotThisDraw = rawTopPot;
      let topExcess = 0;

      if (jackpotPotThisDraw > jackpotCapCurrent) {
        topExcess = jackpotPotThisDraw - jackpotCapCurrent;
        jackpotPotThisDraw = jackpotCapCurrent;
      }

      const wTop = winnersEffective["5+2"] || 0;

      if (topExcess > 0) {
        const lower = findLowerWithWinnersFromTop(winnersEffective);
        if (lower) poolsInitial[lower] = (poolsInitial[lower] || 0) + topExcess;
        else reserveFund += topExcess;
      }

      let jackpotPaidTotal = 0;
      let jackpotAfter = 0;

      if (wTop === 0) {
        // Si se ofrece el tope y no hay 1ª, se puede ofrecer como máximo 4 sorteos seguidos.
        const isAtCap = jackpotPotThisDraw >= jackpotCapCurrent;

        if (isAtCap) capOfferStreak += 1;
        else capOfferStreak = 0;

        if (isAtCap && capOfferStreak >= 5) {
          // 5º sorteo ofreciendo el tope sin acertantes: baja el importe ofrecido a la inferior con acertantes
          const lower = findLowerWithWinnersFromTop(winnersEffective);
          if (lower)
            poolsInitial[lower] =
              (poolsInitial[lower] || 0) + jackpotPotThisDraw;
          else reserveFund += jackpotPotThisDraw;

          jackpotPaidTotal = 0;
          jackpotAfter = initialJackpot;
          capOfferStreak = 0;
          bumpCapForNextCycleIfPossible();
        } else {
          jackpotPaidTotal = 0;
          jackpotAfter = jackpotPotThisDraw;
        }
      } else {
        jackpotPaidTotal = jackpotPotThisDraw;
        jackpotAfter = initialJackpot;

        if (rawTopPot >= jackpotCapCurrent || capOfferStreak > 0) {
          bumpCapForNextCycleIfPossible();
        }
        capOfferStreak = 0;
      }

      jackpot = jackpotAfter;

      /* ========================================
         8) ROLL-DOWN REAL (8ª.3.e y 8ª.3.f)
         ======================================== */
      ORDER.forEach((cat) => {
        if (cat === "5+2") {
          poolsFinal[cat] = poolsInitial[cat];
        } else {
          poolsFinal[cat] = poolsInitial[cat] || 0;
        }
      });

      const roll = {};

      for (let i = 1; i < ORDER.length; i++) {
        const cat = ORDER[i];
        const w = winnersEffective[cat] || 0;
        const pool = poolsFinal[cat] || 0;

        if (pool <= 0) continue;

        if (w === 0) {
          if (cat === "2+0") {
            roll["2+0->nextTop"] = pool;
            carryToNextTopFrom13 += pool;
            poolsFinal[cat] = 0;
          } else {
            const nextCat = findNextLowerWithWinners(i, winnersEffective);

            if (nextCat) {
              roll[`${cat}->${nextCat}`] = pool;
              poolsFinal[nextCat] = (poolsFinal[nextCat] || 0) + pool;
              poolsFinal[cat] = 0;
            } else {
              roll[`${cat}->nextTop`] = pool;
              carryToNextTopFrom13 += pool;
              poolsFinal[cat] = 0;
            }
          }
        }
      }

      /* ========================================
         9) PREMIOS POR GANADOR
         ======================================== */
      const prizePerWinner = {};

      ORDER.forEach((cat) => {
        const w = winnersEffective[cat] || 0;

        if (cat === "5+2") {
          prizePerWinner[cat] = w > 0 ? safeDivide(jackpotPotThisDraw, w) : 0;
          return;
        }

        prizePerWinner[cat] = w > 0 ? safeDivide(poolsFinal[cat] || 0, w) : 0;
      });

      /* ========================================
         10) PREMIO DEL JUGADOR
         ======================================== */
      let playerPrize = 0;
      if (hasValidCategory) {
        playerPrize = Math.round(prizePerWinner[playerCategory] || 0);
      }

      const playerTotalPrize = playerPrize + (millonPrize || 0);

      /* ========================================
         11) SALIDAS
         ======================================== */
      return {
        draw: {
          numbers: drawnMain,
          stars: drawnStars,
          millon: String(millonDrawn),
        },

        stats: {
          // participación / economía
          betsMain: betsMainTotal,
          betsMainWorld,
          revenueMain,
          prizePoolPercent,
          prizeFund,

          // ciclo
          drawIndexInCycle,
          firstPct,
          reservePct,
          reserveThisDraw,
          reserveFund,

          // pools
          poolsInitial,
          poolsFinal,
          roll,

          // bote
          jackpotBefore,
          carryFrom13Used,
          topExcess,
          jackpotPotThisDraw,
          jackpotWinnersEffective: wTop,
          jackpotPaidTotal,
          jackpotAfter,

          // tope dinámico
          jackpotCapCurrent,
          capOfferStreak,
          jackpotLimit: jackpotCapCurrent,

          // premios
          prizePerWinner,

          // millon
          millonEnabled: millonActive,
          millonBetsSpain: betsSpain,
          millonWin,
          millonWinProb: 1 / betsSpain,
          millonSpainShare: spainShare,
          millonPricePerBetExtra: 0,
        },

        results: {
          player: {
            category: hasValidCategory ? playerCategory : null,
            matchMain,
            matchStars,
            prize: playerPrize,

            millonPlayed: String(millonPlayed),
            millonPrize: millonPrize || 0,

            totalPrize: playerTotalPrize,
          },
          winners: winnersWorld,
          winnersEffective,
        },
      };
    },

    // Para avanzar ciclo “realista” entre sorteos:
    // - Si hay ganador en 1ª => ciclo se reinicia
    // - Si no => se incrementa contador
    advanceCycleAfterDraw(lastDrawWinnersTop) {
      if ((lastDrawWinnersTop || 0) > 0) drawIndexInCycle = 1;
      else drawIndexInCycle += 1;
    },
  };
}
