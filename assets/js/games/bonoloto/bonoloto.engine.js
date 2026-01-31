// assets/js/games/bonoloto/bonoloto.engine.js

import { BonolotoConfig } from "./bonoloto.config.js";

/*
  Categorías reales Bonoloto (norma 8ª y 9ª):
  6    → 1ª (6 aciertos) - bote acumulable (8ª.2)
  5C   → 2ª (5 + complementario)
  5    → 3ª (5)
  4    → 4ª (4)
  3    → 5ª (3) premio fijo 4€ salvo aplicación 8ª.4
  R    → reintegro (10% recaudación; premio = importe jugado) (9ª)
*/

const PROBABILITIES = BonolotoConfig.probabilities;
const RULES = BonolotoConfig.rules;

const CAT_ORDER = ["6", "5C", "5", "4", "3"];

// ==========================
// RNG helpers
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
function pickOneExcluding(min, max, excludeSet) {
  let n = randInt(min, max);
  while (excludeSet.has(n)) n = randInt(min, max);
  return n;
}
function matches(mainA, mainB) {
  return mainA.filter((n) => mainB.includes(n)).length;
}
function safeDivide(pool, count) {
  return count > 0 ? pool / count : 0;
}

function weekdayKeyFromDate(drawDate) {
  const d = drawDate instanceof Date ? drawDate : new Date(drawDate);
  if (Number.isNaN(d.getTime())) return null;

  const wd = d.getDay();
  const map = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
  ];
  return map[wd] || null;
}

function buildWorldBetsModel(userModel) {
  const defaults = BonolotoConfig.economy.worldBetsModel;
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
    (weekdayKey && model.baseByWeekday && model.baseByWeekday[weekdayKey]) ||
    model.baseByWeekday.saturday;

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

/**
 * Norma 8ª.4: ningún premio inferior puede ser superior a los precedentes.
 * Si ocurre, se fusionan bolsas adyacentes (y se reparten por igual entre los acertantes de ambas).
 *
 * Implementación:
 * - Recorre de arriba abajo (6->...->3)
 * - Si prize[i] < prize[i+1], fusiona i e i+1
 * - Repite mientras haya violaciones
 */
function applyMonotonicRule({ pools, winners }) {
  // pools: { "6": number, "5C": number, "5": number, "4": number, "3": number }
  // winners: { "6": n, "5C": n, "5": n, "4": n, "3": n }
  const merged = [];

  // Estado "fusionado": representamos grupos contiguos
  let groups = CAT_ORDER.map((c) => [c]);

  function groupWinners(g) {
    return g.reduce((acc, c) => acc + (winners[c] || 0), 0);
  }
  function groupPool(g) {
    return g.reduce((acc, c) => acc + (pools[c] || 0), 0);
  }
  function groupPrize(g) {
    const w = groupWinners(g);
    return w > 0 ? groupPool(g) / w : 0;
  }

  let changed = true;
  while (changed) {
    changed = false;

    for (let i = 0; i < groups.length - 1; i++) {
      const gTop = groups[i];
      const gLow = groups[i + 1];

      const pTop = groupPrize(gTop);
      const pLow = groupPrize(gLow);

      if (pTop > 0 && pLow > 0 && pLow > pTop) {
        const newGroup = [...gTop, ...gLow];
        merged.push(`${gTop.join("+")}+${gLow.join("+")}`);
        groups.splice(i, 2, newGroup);
        changed = true;
        break;
      }
    }
  }

  // Reasignar: cada categoría en un grupo recibe el mismo prize (pool/winners del grupo),
  // y distribuimos "pools efectivos" solo a efectos informativos.
  const prizePerWinner = {};
  const poolsEffective = { ...pools };

  for (const g of groups) {
    const w = groupWinners(g);
    const pool = groupPool(g);
    const p = w > 0 ? pool / w : 0;

    for (const c of g) {
      prizePerWinner[c] = p;
    }
  }

  for (const c of CAT_ORDER) {
    if (!Number.isFinite(prizePerWinner[c])) prizePerWinner[c] = 0;
  }

  return { prizePerWinner, mergedGroups: merged };
}

export function createBonolotoEngine({
  pricePerBet = BonolotoConfig.economy.pricePerDraw,
  prizePoolPercent = BonolotoConfig.economy.prizePoolPercent,
  initialJackpot = BonolotoConfig.economy.initialJackpot,
  maxJackpot = BonolotoConfig.economy.maxJackpot,
  worldBetsModel = null,
} = {}) {
  // Bote acumulado de 1ª por concursos sin 6 (norma 8ª.2)
  let jackpotCarry = Number.isFinite(initialJackpot) ? initialJackpot : 0;

  const WORLD_BETS_MODEL = buildWorldBetsModel(worldBetsModel);

  return {
    getJackpot() {
      return jackpotCarry;
    },

    setJackpot(value) {
      const v = Number(value);
      jackpotCarry = clamp(Number.isFinite(v) ? v : 0, 0, maxJackpot);
    },

    runDraw({ player, drawDate = null } = {}) {
      /* ============================
         PARTICIPACIÓN (modelo)
         ============================ */
      const betsMainTotal = estimateMainBets({
        jackpot: jackpotCarry,
        drawDate,
        model: WORLD_BETS_MODEL,
      });

      const betsMainWorld = Math.max(0, betsMainTotal - 1);

      const revenueMain = betsMainTotal * pricePerBet;

      // Norma 7ª: 55% recaudación a premios
      const prizeFundTotal = revenueMain * prizePoolPercent;

      // Norma 7ª: desglose sobre recaudación (no sobre prizeFundTotal)
      const fundCategorias = revenueMain * RULES.recaudacionToCategoriasPct;
      const fundReintegro = revenueMain * RULES.recaudacionToReintegroPct;

      /* ============================
         SORTEO
         ============================ */
      const drawnMain = pickUnique(6, 1, 49);
      const drawnComplementario = pickOneExcluding(1, 49, new Set(drawnMain));
      const drawnRein = randInt(0, 9);

      /* ============================
         JUGADOR (reintegro asignado)
         ============================ */
      const playerMain = Array.isArray(player?.main) ? player.main : [];

      // si UI no lo da, lo asignamos como “nº específico del resguardo”
      const playerRein =
        typeof player?.reintegro === "number" &&
        Number.isFinite(player.reintegro)
          ? player.reintegro
          : randInt(0, 9);

      const matchCount = matches(playerMain, drawnMain);
      const compHit = playerMain.includes(drawnComplementario);
      const reinHit = playerRein === drawnRein;

      let playerCategory = null;
      if (matchCount === 6) playerCategory = "6";
      else if (matchCount === 5 && compHit) playerCategory = "5C";
      else if (matchCount === 5) playerCategory = "5";
      else if (matchCount === 4) playerCategory = "4";
      else if (matchCount === 3) playerCategory = "3";
      else if (reinHit) playerCategory = "R";

      /* ============================
         GANADORES “MUNDO” (sin el jugador)
         ============================ */
      const winnersWorld = {};
      Object.keys(PROBABILITIES).forEach((k) => {
        winnersWorld[k] = Math.max(
          0,
          poisson(betsMainWorld * PROBABILITIES[k]),
        );
      });

      const winnersEffective = { ...winnersWorld };
      if (playerCategory) {
        winnersEffective[playerCategory] =
          (winnersEffective[playerCategory] || 0) + 1;
      }

      const w6 = winnersEffective["6"] || 0;
      const w5c = winnersEffective["5C"] || 0;
      const w5 = winnersEffective["5"] || 0;
      const w4 = winnersEffective["4"] || 0;
      const w3 = winnersEffective["3"] || 0;

      /* ============================
         FONDO CATEGORÍAS (norma 8ª)
         1) Deducir 5ª fija (3 aciertos) = 4€ * nº acertantes (8ª.1)
         ============================ */
      const fixed3 = RULES.fixedPrize3;
      const fixed3Total = w3 > 0 ? w3 * fixed3 : 0;

      // Restante para 1ª–4ª
      const restanteCategorias = Math.max(0, fundCategorias - fixed3Total);

      // Norma 8ª.1: reparto del restante
      const poolsInitial = {
        6: restanteCategorias * RULES.distRestante["6"],
        "5C": restanteCategorias * RULES.distRestante["5C"],
        5: restanteCategorias * RULES.distRestante["5"],
        4: restanteCategorias * RULES.distRestante["4"],
        3: fixed3Total,
        R: 0,
      };

      /* ============================
         ROLL-DOWN + ACUMULACIONES (8ª.2 y 8ª.3)
         - Bote: carry de 1ª cuando no hay 6
         - 2ª sin ganadores -> 3ª
         - 3ª sin ganadores -> 4ª
         - si tampoco 4ª -> (2ª+3ª+4ª) a 1ª del sorteo siguiente
         ============================ */
      const poolsFinal = { ...poolsInitial };

      const roll = {
        "5C->5": 0,
        "5->4": 0,
        "2+3+4->next6": 0,
        "6->next6": 0,
      };

      // 2ª -> 3ª
      if (w5c === 0) {
        roll["5C->5"] = poolsFinal["5C"];
        poolsFinal["5"] += poolsFinal["5C"];
        poolsFinal["5C"] = 0;
      }

      // 3ª -> 4ª
      if (w5 === 0) {
        roll["5->4"] = poolsFinal["5"];
        poolsFinal["4"] += poolsFinal["5"];
        poolsFinal["5"] = 0;
      }

      // Si no hay acertantes de 4ª, entonces lo acumulado (2ª+3ª+4ª) pasa a 1ª del siguiente
      let carryToNext6From234 = 0;
      if (w4 === 0) {
        carryToNext6From234 =
          poolsFinal["5C"] + poolsFinal["5"] + poolsFinal["4"];
        // Nota: poolsFinal["5C"] y ["5"] ya podrían ser 0 por las reglas anteriores
        // y poolsFinal["4"] podría incluir lo que le cayó
        roll["2+3+4->next6"] = carryToNext6From234;

        poolsFinal["5C"] = 0;
        poolsFinal["5"] = 0;
        poolsFinal["4"] = 0;
      }

      // BOTE ofertado este sorteo (1ª): carry anterior + bolsa de 1ª (del restante)
      const jackpotBefore = jackpotCarry;
      const jackpotPotThisDraw = jackpotBefore + poolsFinal["6"];

      // 1ª: si NO hay 6, el fondo de 1ª pasa a la 1ª del siguiente sorteo (8ª.2)
      // además, sumamos el carry especial desde 2/3/4 si no hubo 4
      let jackpotAfter = jackpotCarry;

      if (w6 === 0) {
        roll["6->next6"] = jackpotPotThisDraw;
        jackpotAfter = jackpotPotThisDraw + carryToNext6From234;
        // En este caso no se paga 1ª, así que poolsFinal["6"] queda informativa
      } else {
        // Hay ganadores de 1ª: se paga el bote ofertado y el carry se reinicia (queda solo lo que venga de 2/3/4)
        jackpotAfter = carryToNext6From234;
      }

      jackpotCarry = clamp(jackpotAfter, 0, maxJackpot);

      /* ============================
         REGLA 8ª.4 (monotonía)
         ============================ */
      // Para aplicar 8ª.4 usamos las bolsas "pagables" del sorteo:
      // - En 6: si hay ganadores, el pool efectivo es jackpotPotThisDraw; si no, 0 (no se paga en el sorteo)
      // - En 5ª: su pool es fixed3Total (puede dejar de ser fijo si se fusiona)
      const payPools = {
        6: w6 > 0 ? jackpotPotThisDraw : 0,
        "5C": poolsFinal["5C"],
        5: poolsFinal["5"],
        4: poolsFinal["4"],
        3: poolsFinal["3"],
      };

      const winnersCats = {
        6: w6,
        "5C": w5c,
        5: w5,
        4: w4,
        3: w3,
      };

      const { prizePerWinner: prizePerWinnerCats, mergedGroups } =
        applyMonotonicRule({ pools: payPools, winners: winnersCats });

      // Reintegro: premio fijo = 0,50€ por apuesta ganadora (9ª.1)
      const prizePerWinner = {
        ...prizePerWinnerCats,
        R: RULES.reintegroPrize,
      };

      /* ============================
         TOTALES PAGADOS (informativo)
         ============================ */
      const payoutsTotal = {
        6: w6 > 0 ? w6 * prizePerWinner["6"] : 0,
        "5C": w5c * (prizePerWinner["5C"] || 0),
        5: w5 * (prizePerWinner["5"] || 0),
        4: w4 * (prizePerWinner["4"] || 0),
        3: w3 * (prizePerWinner["3"] || 0),
        R: (winnersEffective["R"] || 0) * RULES.reintegroPrize,
      };

      /* ============================
         PREMIO DEL JUGADOR
         ============================ */
      let prize = 0;
      if (playerCategory) {
        prize = prizePerWinner[playerCategory] || 0;
      }

      return {
        draw: {
          numbers: drawnMain,
          complementario: drawnComplementario,
          reintegro: drawnRein,
        },

        stats: {
          betsMain: betsMainTotal,
          betsMainWorld,
          revenueMain,

          prizePoolPercent,
          prizeFundTotal,

          fundCategorias,
          fundReintegro,

          fixed3Prize: fixed3,
          fixed3Total,

          restanteCategorias,

          poolsInitial,
          poolsFinal,

          roll,
          carryToNext6From234,

          jackpotBefore,
          jackpotPotThisDraw,
          jackpotWinnersEffective: w6,
          jackpotAfter: jackpotCarry,

          monotonicRuleMergedGroups: mergedGroups,

          prizePerWinner,
          payoutsTotal,
        },

        results: {
          player: {
            category: playerCategory,
            prize: Math.round(prize),

            matchCount,
            complementarioHit: Boolean(compHit),

            reintegroPlayed: playerRein,
            reintegroHit: Boolean(reinHit),
          },
          winners: winnersWorld,
          winnersEffective,
        },
      };
    },
  };
}
