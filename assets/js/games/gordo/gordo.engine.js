// assets/js/games/gordo/gordo.engine.js

import { GordoConfig } from "./gordo.config.js";

/**
 * Engine El Gordo (según normas ENERO 2024) pero adaptado a tu UI:
 * - Categorías con keys UI: 5+1, 5, 4+1, 4, 3+1, 3, 2+1, 2, R
 * - Alias legacy en stats: revenueMain, prizePool, totalRevenueThisDraw, payoutsTotal, etc.
 * - Reintegro (10ª): aciertas clave => +importe jugado SIEMPRE, incluso si ganas otra categoría
 * - Fondo categorías: 45% ventas; reintegro: 10% ventas; total premios: 55% ventas
 * - 1ª (5+clave) con ciclo + mínimo 4,5M + Fondo Reserva (9ª)
 * - Roll-down 2ª–7ª (9ª.2) y regla anti-absurdos (9ª.3)
 *
 * Ajuste fidelidad estricta:
 * - El Fondo de Reserva NO puede ser negativo.
 * - Si no alcanza para completar el mínimo garantizado, se genera "deuda" (reserveDebt)
 *   que se compensa con aportaciones futuras (primero se paga deuda, luego sube reserve).
 *
 * Mejoras aplicadas (2026-01-29):
 * 1) Reintegro R coherente: R = TODOS los que aciertan clave (incluye +clave y 0–1 aciertos).
 * 2) Monotonía (9ª.3) NO toca 1ª: se aplica solo a 2ª–8ª.
 */

// Orden de categorías para regla 9ª.3 (incluye 1ª en constante, pero la monotonía se aplicará solo 2ª–8ª)
const CAT_ORDER = ["5+1", "5", "4+1", "4", "3+1", "3", "2+1", "2"];

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
function hitsCount(playerMain, drawnMainSet) {
  let h = 0;
  for (const n of playerMain) if (drawnMainSet.has(n)) h++;
  return h;
}

// combinatoria exacta: P(acertar exactamente h de 5) al sacar 5 de 54
function comb(n, k) {
  if (k < 0 || k > n) return 0;
  k = Math.min(k, n - k);
  let num = 1;
  let den = 1;
  for (let i = 1; i <= k; i++) {
    num *= n - (k - i);
    den *= i;
  }
  return num / den;
}
function probHits54_5(h) {
  const total = comb(54, 5);
  return (comb(5, h) * comb(49, 5 - h)) / total;
}

function resolveCategory(hits, claveMatch) {
  if (hits === 5) return claveMatch ? "5+1" : "5";
  if (hits === 4) return claveMatch ? "4+1" : "4";
  if (hits === 3) return claveMatch ? "3+1" : "3";
  if (hits === 2) return claveMatch ? "2+1" : "2";
  return claveMatch ? "R" : "0";
}

// ===== BINOMIAL (rápido y estable) =====
function binomial(n, p) {
  n = Math.max(0, Math.floor(n));
  p = Math.max(0, Math.min(1, Number(p)));

  if (n === 0 || p === 0) return 0;
  if (p === 1) return n;

  // Para n pequeño, exacto por Bernoulli
  if (n < 50) {
    let x = 0;
    for (let i = 0; i < n; i++) if (rand() < p) x++;
    return x;
  }

  // Aproximación normal para n grande
  const mean = n * p;
  const var_ = n * p * (1 - p);
  const x = Math.round(mean + Math.sqrt(var_) * randn());
  return clamp(x, 0, n);
}

// ===== Distribución de aciertos (0..5) con suma exacta = bets =====
function sampleHitsCounts54_5(bets) {
  const N = Math.max(0, Math.floor(bets));
  const p = {
    5: probHits54_5(5),
    4: probHits54_5(4),
    3: probHits54_5(3),
    2: probHits54_5(2),
    1: probHits54_5(1),
    0: probHits54_5(0),
  };

  let remainingN = N;
  let remainingP = 1;

  const out = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0, 0: 0 };

  // muestreo secuencial tipo multinomial: asegura suma exacta
  for (const h of [5, 4, 3, 2, 1]) {
    const ph = remainingP > 0 ? p[h] / remainingP : 0;
    const nh = binomial(remainingN, ph);
    out[h] = nh;
    remainingN -= nh;
    remainingP -= p[h];
  }
  out[0] = remainingN;

  return out;
}

// Modelo de volumen (mundo)
function buildWorldBetsModel(userModel) {
  const d = GordoConfig.economy.worldBetsModel;
  const m = userModel && typeof userModel === "object" ? userModel : {};
  return {
    base: Number.isFinite(m.base) ? m.base : d.base,
    clampMin: Number.isFinite(m.clampMin) ? m.clampMin : d.clampMin,
    clampMax: Number.isFinite(m.clampMax) ? m.clampMax : d.clampMax,
    jackpotBumpK: Number.isFinite(m.jackpotBumpK)
      ? m.jackpotBumpK
      : d.jackpotBumpK,
    jackpotBumpRef: Number.isFinite(m.jackpotBumpRef)
      ? m.jackpotBumpRef
      : d.jackpotBumpRef,
    noiseSigma: Number.isFinite(m.noiseSigma) ? m.noiseSigma : d.noiseSigma,
    noiseMin: Number.isFinite(m.noiseMin) ? m.noiseMin : d.noiseMin,
    noiseMax: Number.isFinite(m.noiseMax) ? m.noiseMax : d.noiseMax,
  };
}

function estimateBets({ jackpotPot, model }) {
  const j = Math.max(0, Number(jackpotPot) || 0);
  const bump =
    1 + model.jackpotBumpK * Math.log10(1 + j / model.jackpotBumpRef);
  const noise = clamp(
    1 + randn() * model.noiseSigma,
    model.noiseMin,
    model.noiseMax,
  );
  const bets = Math.round(model.base * bump * noise);
  return clamp(bets, model.clampMin, model.clampMax);
}

/**
 * Norma 9ª.3: ningún premio inferior puede ser superior al de una superior.
 * Fusiona bolsas contiguas y reparte por igual.
 *
 * Nota: en esta versión, la monotonía se aplicará SOLO a 2ª–8ª desde runDraw().
 */
function applyMonotonicRule({ pools, winners }) {
  // Orden esperado para monotonicidad (si solo pasas 2ª–8ª, se comparará solo entre ellas)
  const order = ["5", "4+1", "4", "3+1", "3", "2+1", "2"];

  let groups = order
    .filter((c) => pools[c] != null && winners[c] != null)
    .map((c) => [c]);

  const merged = [];

  const groupWinners = (g) => g.reduce((a, c) => a + (winners[c] || 0), 0);
  const groupPool = (g) => g.reduce((a, c) => a + (pools[c] || 0), 0);
  const groupPrize = (g) => {
    const w = groupWinners(g);
    return w > 0 ? groupPool(g) / w : 0;
  };

  let changed = true;
  while (changed) {
    changed = false;
    for (let i = 0; i < groups.length - 1; i++) {
      const pTop = groupPrize(groups[i]);
      const pLow = groupPrize(groups[i + 1]);
      if (pTop > 0 && pLow > 0 && pLow > pTop) {
        merged.push(`${groups[i].join("+")}+${groups[i + 1].join("+")}`);
        const ng = [...groups[i], ...groups[i + 1]];
        groups.splice(i, 2, ng);
        changed = true;
        break;
      }
    }
  }

  const prizePerWinner = {};
  for (const g of groups) {
    const w = groupWinners(g);
    const pool = groupPool(g);
    const p = w > 0 ? pool / w : 0;
    for (const c of g) prizePerWinner[c] = p;
  }

  // completa las que falten (si se pasó alguna sin pools/winners por cero)
  for (const c of order)
    if (!Number.isFinite(prizePerWinner[c])) prizePerWinner[c] = 0;

  return { prizePerWinner, mergedGroups: merged };
}

export function createGordoEngine({
  pricePerBet = GordoConfig.economy.pricePerDraw,
  prizePoolPercent = GordoConfig.economy.prizePoolPercent,
  worldBetsModel = null,

  initialReserve = 0,
  initialJackpotPot = 0,
  initialCycleIndex = 1,
} = {}) {
  const RULES = GordoConfig.rules;
  const LIMITS = GordoConfig.economy;

  const WORLD = buildWorldBetsModel(worldBetsModel);

  // Fondo de Reserva real (nunca negativo)
  let reserve = Number.isFinite(initialReserve) ? initialReserve : 0;
  reserve = clamp(reserve, 0, LIMITS.maxReserveAbs);

  // “Deuda” del Fondo de Reserva si se agota (para compensar con aportaciones futuras)
  let reserveDebt = 0;

  let jackpotPot = Number.isFinite(initialJackpotPot) ? initialJackpotPot : 0;
  let cycleIndex = Number.isFinite(initialCycleIndex) ? initialCycleIndex : 1;

  function getReserveSplit() {
    const minG = RULES.minGuaranteedFirst;
    const triple = 3 * minG;

    // Norma 9ª.5
    if (reserve > triple) return { toPrizePct: 0.17, toReservePct: 0.05 };
    if (reserve < 1) return { toPrizePct: 0.05, toReservePct: 0.17 };

    // Norma 9ª.4 (normal): 11% y 11% (mitad de 22%)
    return {
      toPrizePct: RULES.firstFundPctOfSales / 2,
      toReservePct: RULES.firstFundPctOfSales / 2,
    };
  }

  return {
    getJackpotPot() {
      return jackpotPot;
    },
    getReserve() {
      return reserve;
    },

    runDraw({ player, drawDate = null } = {}) {
      // =========================
      // PARTICIPACIÓN (mundo)
      // =========================
      const betsTotal = estimateBets({ jackpotPot, model: WORLD });
      const betsWorld = Math.max(0, betsTotal - 1);

      const sales = betsTotal * pricePerBet;

      // 45% categorías (1ª–8ª), 10% reintegro, 55% total premios
      const fundCategorias = sales * RULES.salesToCategoriasPct;
      const fundReintegro = sales * RULES.salesToReintegroPct;
      const prizeFundTotal = sales * prizePoolPercent;

      // =========================
      // SORTEO
      // =========================
      const drawnMain = pickUnique(5, 1, 54);
      const drawnClave = randInt(0, 9);

      // =========================
      // JUGADOR
      // =========================
      const playerMain = Array.isArray(player?.main) ? player.main : [];
      const playerClave = Number.isFinite(player?.clave) ? player.clave : null;

      const setDraw = new Set(drawnMain);
      const hits = hitsCount(playerMain, setDraw);
      const claveMatch =
        playerClave !== null && Number(playerClave) === Number(drawnClave);

      const playerCategory = resolveCategory(hits, claveMatch);

      // =========================
      // GANADORES (mundo) — coherentes con R (clave)
      // =========================
      const winnersWorld = {
        "5+1": 0,
        5: 0,
        "4+1": 0,
        4: 0,
        "3+1": 0,
        3: 0,
        "2+1": 0,
        2: 0,
        R: 0,
        0: 0,
      };

      const hitsCounts = sampleHitsCounts54_5(betsWorld);
      const pKey = 0.1;

      // Para 2..5 aciertos: divide en con clave / sin clave
      const k5 = binomial(hitsCounts[5], pKey);
      const k4 = binomial(hitsCounts[4], pKey);
      const k3 = binomial(hitsCounts[3], pKey);
      const k2 = binomial(hitsCounts[2], pKey);

      winnersWorld["5+1"] = k5;
      winnersWorld["5"] = hitsCounts[5] - k5;

      winnersWorld["4+1"] = k4;
      winnersWorld["4"] = hitsCounts[4] - k4;

      winnersWorld["3+1"] = k3;
      winnersWorld["3"] = hitsCounts[3] - k3;

      winnersWorld["2+1"] = k2;
      winnersWorld["2"] = hitsCounts[2] - k2;

      // R = TODOS los que aciertan clave (incluye +clave y también 0–1 aciertos)
      const k1 = binomial(hitsCounts[1], pKey);
      const k0 = binomial(hitsCounts[0], pKey);
      winnersWorld["R"] = k5 + k4 + k3 + k2 + k1 + k0;

      const winnersEffective = { ...winnersWorld };

      // sumar jugador a su categoría (si no es 0)
      if (playerCategory && playerCategory !== "0") {
        winnersEffective[playerCategory] =
          (winnersEffective[playerCategory] || 0) + 1;
      }

      // si el jugador acierta clave, suma también en R (porque R = todos los clave)
      if (claveMatch) winnersEffective["R"] = (winnersEffective["R"] || 0) + 1;

      // =========================
      // FONDOS CATEGORÍAS
      // =========================

      // 22% ventas: “fondo 1ª” repartido entre bote y reserva según 9ª.4/9ª.5
      const split = getReserveSplit();
      const toPrizeThisDraw = sales * split.toPrizePct;
      const toReserveThisDraw = sales * split.toReservePct;

      // Primero se paga la deuda del fondo (si existe), luego se incrementa el saldo real.
      if (reserveDebt > 0) {
        const pay = Math.min(reserveDebt, toReserveThisDraw);
        reserveDebt -= pay;
        reserve += toReserveThisDraw - pay;
      } else {
        reserve += toReserveThisDraw;
      }
      reserve = clamp(reserve, 0, LIMITS.maxReserveAbs);

      // 23% ventas para 2ª–7ª, menos 8ª fija
      const restBase = sales * RULES.restFundPctOfSales;

      // 8ª fija = 3€ por ganador (2 sin clave)
      const w2 = winnersEffective["2"] || 0;
      const fixed8Total = w2 * RULES.fixedPrize2;

      const restAfterFixed8 = Math.max(0, restBase - fixed8Total);

      // pools iniciales (sin roll-down)
      const poolsInitial = {
        "5+1": 0, // 1ª va por jackpotPotThisDraw si hay ganadores
        5: restAfterFixed8 * RULES.restDist["5"],
        "4+1": restAfterFixed8 * RULES.restDist["4K"],
        4: restAfterFixed8 * RULES.restDist["4"],
        "3+1": restAfterFixed8 * RULES.restDist["3K"],
        3: restAfterFixed8 * RULES.restDist["3"],
        "2+1": restAfterFixed8 * RULES.restDist["2K"],
        2: fixed8Total,
        R: 0,
      };

      // =========================
      // ROLL-DOWN 2ª–7ª (9ª.2)
      // =========================
      const poolsFinal = { ...poolsInitial };

      const roll = {
        "5->4+1": 0,
        "4+1->4": 0,
        "4->3+1": 0,
        "3+1->3": 0,
        "3->2+1": 0,
        "2+1->next5+1": 0,
        "to5+1FromUpper": 0,
      };

      const w5 = winnersEffective["5"] || 0;
      const w4k = winnersEffective["4+1"] || 0;
      const w4 = winnersEffective["4"] || 0;
      const w3k = winnersEffective["3+1"] || 0;
      const w3 = winnersEffective["3"] || 0;
      const w2k = winnersEffective["2+1"] || 0;

      if (w5 === 0) {
        roll["5->4+1"] = poolsFinal["5"];
        poolsFinal["4+1"] += poolsFinal["5"];
        poolsFinal["5"] = 0;
      }
      if (w4k === 0) {
        roll["4+1->4"] = poolsFinal["4+1"];
        poolsFinal["4"] += poolsFinal["4+1"];
        poolsFinal["4+1"] = 0;
      }
      if (w4 === 0) {
        roll["4->3+1"] = poolsFinal["4"];
        poolsFinal["3+1"] += poolsFinal["4"];
        poolsFinal["4"] = 0;
      }
      if (w3k === 0) {
        roll["3+1->3"] = poolsFinal["3+1"];
        poolsFinal["3"] += poolsFinal["3+1"];
        poolsFinal["3+1"] = 0;
      }
      if (w3 === 0) {
        roll["3->2+1"] = poolsFinal["3"];
        poolsFinal["2+1"] += poolsFinal["3"];
        poolsFinal["3"] = 0;
      }

      // si tampoco hay 7ª (2+1), todo 2ª..7ª pasa a 1ª del siguiente sorteo
      let carryToNext5KFromUpper = 0;
      if (w2k === 0) {
        carryToNext5KFromUpper =
          poolsFinal["5"] +
          poolsFinal["4+1"] +
          poolsFinal["4"] +
          poolsFinal["3+1"] +
          poolsFinal["3"] +
          poolsFinal["2+1"];

        roll["2+1->next5+1"] = poolsFinal["2+1"];
        roll["to5+1FromUpper"] = carryToNext5KFromUpper;

        poolsFinal["5"] = 0;
        poolsFinal["4+1"] = 0;
        poolsFinal["4"] = 0;
        poolsFinal["3+1"] = 0;
        poolsFinal["3"] = 0;
        poolsFinal["2+1"] = 0;
      }

      // =========================
      // 1ª categoría (9ª.1 + 9ª.4 + 9ª.5)
      // =========================
      const w5k = winnersEffective["5+1"] || 0;

      const jackpotBefore = jackpotPot;
      const isCycleStart = cycleIndex === 1;

      let jackpotCandidate =
        jackpotBefore + toPrizeThisDraw + carryToNext5KFromUpper;

      if (isCycleStart) {
        const minG = RULES.minGuaranteedFirst;
        if (jackpotCandidate < minG) {
          const need = minG - jackpotCandidate;

          // Nunca dejamos el fondo en negativo: si no alcanza, generamos deuda.
          const taken = Math.min(reserve, need);
          reserve -= taken;
          reserveDebt += need - taken;
          reserve = clamp(reserve, 0, LIMITS.maxReserveAbs);

          jackpotCandidate = minG;
        }
      }

      const jackpotPotThisDraw = jackpotCandidate;

      let jackpotPaidTotal = 0;
      let jackpotAfter = jackpotBefore;

      if (w5k > 0) {
        jackpotPaidTotal = jackpotPotThisDraw;
        jackpotAfter = 0;
        cycleIndex = 1;
      } else {
        jackpotAfter = clamp(jackpotPotThisDraw, 0, LIMITS.maxJackpotPot);
        cycleIndex += 1;
      }

      jackpotPot = jackpotAfter;

      // =========================
      // Regla 9ª.3 (monotonía) SOLO 2ª–8ª (1ª queda fuera)
      // =========================
      const payPoolsLower = {
        5: poolsFinal["5"],
        "4+1": poolsFinal["4+1"],
        4: poolsFinal["4"],
        "3+1": poolsFinal["3+1"],
        3: poolsFinal["3"],
        "2+1": poolsFinal["2+1"],
        2: poolsFinal["2"],
      };

      const winnersLower = {
        5: winnersEffective["5"] || 0,
        "4+1": winnersEffective["4+1"] || 0,
        4: winnersEffective["4"] || 0,
        "3+1": winnersEffective["3+1"] || 0,
        3: winnersEffective["3"] || 0,
        "2+1": winnersEffective["2+1"] || 0,
        2: winnersEffective["2"] || 0,
      };

      const { prizePerWinner: ppwLower, mergedGroups } = applyMonotonicRule({
        pools: payPoolsLower,
        winners: winnersLower,
      });

      // ppw final: 1ª aparte, sin monotonía
      const ppwCats = {
        "5+1": w5k > 0 ? jackpotPotThisDraw / w5k : 0,
        ...ppwLower,
      };

      // =========================
      // Reintegro (10ª): +1,50€ por acertar clave
      // =========================
      const reintegroPrize = pricePerBet;
      const reintegroPaid = (winnersEffective["R"] || 0) * reintegroPrize;
      const reintegroDiff = reintegroPaid - fundReintegro;

      // =========================
      // Payouts totales por categoría (para tu modal)
      // =========================
      const payoutsTotal = {};

      // 1ª: si hay ganadores, paga el bote completo
      payoutsTotal["5+1"] = w5k > 0 ? jackpotPotThisDraw : 0;

      // 2ª–8ª: ppw ya ajustado por monotonía
      for (const c of ["5", "4+1", "4", "3+1", "3", "2+1", "2"]) {
        payoutsTotal[c] = (ppwCats[c] || 0) * (winnersEffective[c] || 0);
      }

      payoutsTotal["R"] = reintegroPaid;
      payoutsTotal["0"] = 0;

      // =========================
      // Premio del jugador
      // =========================
      let prize = 0;

      if (playerCategory && playerCategory !== "0" && playerCategory !== "R") {
        prize += ppwCats[playerCategory] || 0;
      }
      if (claveMatch) prize += reintegroPrize;

      // =========================
      // Aliases legacy para tu UI (evita 0,00€)
      // =========================
      const revenueMain = sales;
      const prizePool = prizeFundTotal;
      const totalRevenueThisDraw = sales;

      return {
        draw: {
          date: drawDate,
          numbers: drawnMain,
          clave: drawnClave,
        },

        stats: {
          // NUEVOS
          betsMain: betsTotal,
          betsMainWorld: betsWorld,
          sales,
          fundCategorias,
          fundReintegro,
          prizePoolPercent: prizePoolPercent * 100,
          prizeFundTotal,

          reserveSplit: split,
          reserveAfter: reserve,
          reserveDebt,

          restBase,
          fixed8Prize: RULES.fixedPrize2,
          fixed8Total,
          restAfterFixed8,

          poolsInitial,
          poolsFinal,

          roll,
          carryToNext5KFromUpper,

          isCycleStart,
          jackpotBefore,
          jackpotPotThisDraw,
          jackpotWinnersEffective: w5k,
          jackpotPaidTotal,
          jackpotAfter: jackpotPot,

          monotonicRuleMergedGroups: mergedGroups,

          prizePerWinner: {
            ...ppwCats,
            R: reintegroPrize,
          },

          payoutsTotal,
          winnersWorld,
          winnersEffective,

          reintegroPaid,
          reintegroDiff,

          // LEGACY (los que tu modal parece leer)
          revenueMain,
          prizePool,
          totalRevenueThisDraw,
          jackpotContributionBase: toPrizeThisDraw,
          rolloverToJackpot: carryToNext5KFromUpper,
          jackpotWinnersWorld: winnersWorld["5+1"] || 0,
          jackpotWinnersEffective: w5k,
        },

        results: {
          winners: winnersWorld,
          winnersEffective,
          player: {
            hits,
            claveMatch,
            category: playerCategory,
            prize, // sin redondear
            main: playerMain,
            clavePlayed: playerClave,
          },
        },
      };
    },
  };
}
