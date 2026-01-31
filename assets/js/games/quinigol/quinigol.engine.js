// assets/js/games/quinigol/quinigol.engine.js

function rand() {
  return Math.random();
}

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

// Normal(0,1) Box–Muller
function randn() {
  let u = 0,
    v = 0;
  while (u === 0) u = rand();
  while (v === 0) v = rand();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

// Poisson
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

function weekdayKeyFromDate(drawDate) {
  const d = drawDate instanceof Date ? drawDate : new Date(drawDate);
  if (Number.isNaN(d.getTime())) return null;
  const wd = d.getDay();
  if (wd === 0) return "sunday";
  if (wd === 1) return "monday";
  if (wd === 2) return "tuesday";
  if (wd === 3) return "wednesday";
  if (wd === 4) return "thursday";
  if (wd === 5) return "friday";
  if (wd === 6) return "saturday";
  return null;
}

function buildWorldBetsModel(userModel) {
  const defaults = {
    baseByWeekday: { thursday: 450_000, sunday: 700_000 },
    clampMin: 150_000,
    clampMax: 6_000_000,
    jackpotBumpK: 0.1,
    jackpotBumpRef: 1_000_000,
    noiseSigma: 0.14,
    noiseMin: 0.7,
    noiseMax: 1.35,
  };

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

function estimateBets({ jackpot, drawDate, model }) {
  const j = Math.max(0, Number(jackpot) || 0);
  const weekdayKey = weekdayKeyFromDate(drawDate);

  const base =
    (weekdayKey && model.baseByWeekday && model.baseByWeekday[weekdayKey]) ||
    model.baseByWeekday.sunday ||
    model.baseByWeekday.thursday ||
    500_000;

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

function safeDivide(pool, count) {
  return count > 0 ? pool / count : 0;
}

function pickWeightedSymbol(weights) {
  const w0 = Number(weights["0"] ?? 0);
  const w1 = Number(weights["1"] ?? 0);
  const w2 = Number(weights["2"] ?? 0);
  const wM = Number(weights["M"] ?? 0);

  const sum = w0 + w1 + w2 + wM;
  if (!(sum > 0)) return "0";

  const r = rand() * sum;
  if (r < w0) return "0";
  if (r < w0 + w1) return "1";
  if (r < w0 + w1 + w2) return "2";
  return "M";
}

function normalizeResultToken(x) {
  const s = String(x ?? "")
    .trim()
    .toUpperCase();
  if (s === "0" || s === "1" || s === "2" || s === "M") return s;
  return null;
}

function normalizeResultString(res) {
  const s = String(res ?? "")
    .trim()
    .toUpperCase();
  if (!s) return null;

  const m = s.match(/^([012M])\s*[-]?\s*([012M])$/);
  if (!m) return null;

  return `${m[1]}-${m[2]}`;
}

function normalizePlayerMatches(playerMatches) {
  // Formatos aceptados:
  // - ["2-1","M-0",...]
  // - [[ "2-1" ], [ "M-0" ], ...]
  // - [{ home:"2", away:"1" }, ...]
  // - [{ local:"2", visitante:"1" }, ...]
  //
  // Devuelve SIEMPRE length 6 (con nulls) para no desplazar índices.
  const arr = Array.isArray(playerMatches) ? playerMatches : [];

  return Array.from({ length: 6 }, (_, i) => {
    const x = arr[i];

    if (Array.isArray(x)) return normalizeResultString(x[0] || null);
    if (typeof x === "string") return normalizeResultString(x);

    if (x && typeof x === "object") {
      const a = normalizeResultToken(x.home ?? x.local);
      const b = normalizeResultToken(x.away ?? x.visitante);
      if (!a || !b) return null;
      return `${a}-${b}`;
    }

    return null;
  });
}

/**
 * Engine de El Quinigol (alineado con normas):
 * - 6 partidos; acierto = resultado exacto por partido (A-B con A/B en 0/1/2/M; M=3+)
 * - Categorías por nº de aciertos exactos: 6,5,4,3,2
 * - Reparto (sobre recaudación íntegra): 10%, 9%, 8%, 8%, 20%
 * - Se destina a premios el 55% (informativo; aquí los pools de categoría se calculan sobre recaudación íntegra)
 * - Bote: si no hay acertantes de 6, su fondo pasa a bote para el siguiente. Si no hay de 2, también pasa a bote.
 * - Cascada: si no hay acertantes de 5 -> pasa a 4 -> 3 -> 2
 * - Umbral: si premio unitario de 2 < 1€, no se paga y pasa a bote (simplificación fiel a lo importante)
 */
export function createQuinigolEngine({
  pricePerDraw = 1.0,
  prizePoolPercent = 0.55,

  prizeDistributionOnRevenue = {
    6: 0.1,
    5: 0.09,
    4: 0.08,
    3: 0.08,
    2: 0.2,
  },

  probabilities = {
    6: 1 / 16_777_216,
    5: 1 / 186_413,
    4: 1 / 4_971,
    3: 1 / 248,
    2: 1 / 22,
  },

  worldBetsModel = null,

  symbolWeights = { 0: 0.32, 1: 0.28, 2: 0.18, M: 0.22 },

  minPrizeToPay = 1.0,
} = {}) {
  let jackpot_6 = 0;

  const WORLD = buildWorldBetsModel(worldBetsModel);
  const CAT_ORDER = [6, 5, 4, 3, 2];

  return {
    getJackpot() {
      return jackpot_6 || 0;
    },

    runDraw({ player, drawDate = null } = {}) {
      const jackpotBefore = jackpot_6 || 0;

      const betsTotal = estimateBets({
        jackpot: jackpotBefore,
        drawDate,
        model: WORLD,
      });

      const betsWorld = Math.max(0, betsTotal - 1);

      const revenue = betsTotal * pricePerDraw;
      const prizePool = revenue * prizePoolPercent;

      const drawMatches = [];
      for (let i = 0; i < 6; i++) {
        const home = pickWeightedSymbol(symbolWeights);
        const away = pickWeightedSymbol(symbolWeights);
        drawMatches.push(`${home}-${away}`);
      }

      const playerMatches = normalizePlayerMatches(player?.matches);
      let hits = 0;
      for (let i = 0; i < 6; i++) {
        const p = playerMatches[i] || null;
        if (p && p === drawMatches[i]) hits++;
      }
      const playerCategory = hits >= 2 ? hits : null;

      const winnersWorld = {};
      for (const k of CAT_ORDER) {
        winnersWorld[k] = Math.max(
          0,
          poisson(betsWorld * (probabilities[k] || 0)),
        );
      }

      const winnersEffective = { ...winnersWorld };
      if (playerCategory != null) {
        winnersEffective[playerCategory] =
          (winnersEffective[playerCategory] || 0) + 1;
      }

      const pools = {};
      for (const k of CAT_ORDER) {
        pools[k] = revenue * (prizeDistributionOnRevenue[k] || 0);
      }

      let jackpotCarry = 0;

      if ((winnersEffective[6] || 0) === 0) {
        jackpotCarry += pools[6] || 0;
        pools[6] = 0;
      }

      if ((winnersEffective[5] || 0) === 0) {
        pools[4] = (pools[4] || 0) + (pools[5] || 0);
        pools[5] = 0;
      }
      if ((winnersEffective[4] || 0) === 0) {
        pools[3] = (pools[3] || 0) + (pools[4] || 0);
        pools[4] = 0;
      }
      if ((winnersEffective[3] || 0) === 0) {
        pools[2] = (pools[2] || 0) + (pools[3] || 0);
        pools[3] = 0;
      }

      if ((winnersEffective[2] || 0) === 0) {
        jackpotCarry += pools[2] || 0;
        pools[2] = 0;
      }

      // Umbral 1€ (cat 2 aciertos)
      const prize2 = safeDivide(pools[2] || 0, winnersEffective[2] || 0);
      if ((winnersEffective[2] || 0) > 0 && prize2 < minPrizeToPay) {
        jackpotCarry += pools[2] || 0;
        pools[2] = 0;
      }

      // Premio en juego de 6 incluye jackpot acumulado previo
      const pot6 = (pools[6] || 0) + jackpotBefore;

      // Monotonía (aprox norma 7ª.5)
      const basePoolsForMonotony = {
        6: pot6,
        5: pools[5] || 0,
        4: pools[4] || 0,
        3: pools[3] || 0,
        2: pools[2] || 0,
      };

      const groups = [];
      for (const k of CAT_ORDER) {
        const w = winnersEffective[k] || 0;
        const p = basePoolsForMonotony[k] || 0;
        groups.push({ cats: [k], winners: w, pool: p });

        while (groups.length >= 2) {
          const b = groups[groups.length - 1];
          const a = groups[groups.length - 2];

          if (a.winners <= 0 || b.winners <= 0) break;

          const pa = a.pool / a.winners;
          const pb = b.pool / b.winners;

          if (pb <= pa) break;

          a.cats = [...a.cats, ...b.cats];
          a.winners += b.winners;
          a.pool += b.pool;
          groups.pop();
        }
      }

      const prizePerWinner = {};
      const payoutsTotal = {};
      for (const k of CAT_ORDER) {
        prizePerWinner[k] = 0;
        payoutsTotal[k] = 0;
      }

      for (const g of groups) {
        if (g.winners <= 0 || g.pool <= 0) continue;
        const per = g.pool / g.winners;

        for (const k of g.cats) {
          const w = winnersEffective[k] || 0;
          if (w <= 0) continue;
          prizePerWinner[k] = per;
          payoutsTotal[k] = per * w;
        }
      }

      let prize = 0;
      if (playerCategory != null) prize = prizePerWinner[playerCategory] || 0;

      const winners6 = winnersEffective[6] || 0;

      if (winners6 > 0) {
        jackpot_6 = 0 + jackpotCarry;
      } else {
        jackpot_6 = jackpotBefore + jackpotCarry;
      }

      const jackpotAfter = jackpot_6 || 0;

      return {
        draw: {
          matches: drawMatches,
          results: drawMatches,
        },

        stats: {
          betsMain: betsTotal,
          betsMainWorld: betsWorld,
          revenueMain: revenue,
          totalRevenueThisDraw: revenue,

          prizePoolPercent,
          prizePool,

          poolsFinal: {
            6: pools[6] || 0,
            5: pools[5] || 0,
            4: pools[4] || 0,
            3: pools[3] || 0,
            2: pools[2] || 0,
          },

          prizePerWinner,
          payoutsTotal,

          jackpotPotThisDraw: pot6,
          jackpotBefore,
          jackpotCarry,
          jackpotAfter,

          jackpotWinnersWorld: winnersWorld[6] || 0,
          jackpotWinnersEffective: winners6,
        },

        results: {
          player: {
            category: playerCategory,
            hits,
            prize: Math.round(prize),
          },
          winners: winnersWorld,
          winnersEffective,
        },
      };
    },
  };
}
