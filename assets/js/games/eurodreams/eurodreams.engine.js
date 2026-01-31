// assets/js/games/eurodreams/eurodreams.engine.js

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

function binomial(n, p) {
  n = Math.max(0, Math.floor(n));
  p = Math.max(0, Math.min(1, Number(p)));

  if (n === 0 || p === 0) return 0;
  if (p === 1) return n;

  if (n < 50) {
    let x = 0;
    for (let i = 0; i < n; i++) if (rand() < p) x++;
    return x;
  }

  const mean = n * p;
  const var_ = n * p * (1 - p);
  const x = Math.round(mean + Math.sqrt(var_) * randn());
  return clamp(x, 0, n);
}

function pickUnique(count, min, max) {
  const s = new Set();
  while (s.size < count) s.add(randInt(min, max));
  return Array.from(s).sort((a, b) => a - b);
}

function matchesCount(mainA, drawnSet) {
  let h = 0;
  for (const n of mainA) if (drawnSet.has(n)) h++;
  return h;
}

function weekdayKeyFromDate(drawDate) {
  const d = drawDate instanceof Date ? drawDate : new Date(drawDate);
  if (Number.isNaN(d.getTime())) return null;

  const wd = d.getDay();
  if (wd === 1) return "monday";
  if (wd === 4) return "thursday";
  if (wd === 6) return "saturday";
  if (wd === 0) return "sunday";
  if (wd === 2) return "tuesday";
  if (wd === 3) return "wednesday";
  if (wd === 5) return "friday";
  return null;
}

function buildWorldBetsModel(userModel) {
  const defaults = {
    baseByWeekday: { monday: 4_200_000, thursday: 6_000_000 },
    clampMin: 2_000_000,
    clampMax: 14_000_000,
    jackpotBumpK: 0.12,
    jackpotBumpRef: 1_000_000,
    noiseSigma: 0.09,
    noiseMin: 0.82,
    noiseMax: 1.22,
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
    model.baseByWeekday.thursday;

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

// P(exactamente h aciertos al sacar 6 de 40)
function probHits40_6(h) {
  const total = comb(40, 6);
  return (comb(6, h) * comb(34, 6 - h)) / total;
}

// Multinomial por secuencial binomial para que sume exacto
function sampleHitsCounts40_6(bets) {
  const N = Math.max(0, Math.floor(bets));
  const p = {
    6: probHits40_6(6),
    5: probHits40_6(5),
    4: probHits40_6(4),
    3: probHits40_6(3),
    2: probHits40_6(2),
    1: probHits40_6(1),
    0: probHits40_6(0),
  };

  let remainingN = N;
  let remainingP = 1;

  const out = { 6: 0, 5: 0, 4: 0, 3: 0, 2: 0, 1: 0, 0: 0 };

  for (const h of [6, 5, 4, 3, 2, 1]) {
    const ph = remainingP > 0 ? p[h] / remainingP : 0;
    const nh = binomial(remainingN, ph);
    out[h] = nh;
    remainingN -= nh;
    remainingP -= p[h];
  }
  out[0] = remainingN;
  return out;
}

// Regla 8ª.2.2: asegurar que 3ª>=4ª>=5ª>=6ª (fusionando contiguas)
function applyMonotonic3456({ pools, winners, minPrize6 }) {
  const order = ["3", "4", "5", "6"];
  let groups = order.map((c) => [c]);
  const merged = [];

  const groupWinners = (g) => g.reduce((a, c) => a + (winners[c] || 0), 0);
  const groupPool = (g) => g.reduce((a, c) => a + (pools[c] || 0), 0);
  const groupPrize = (g) => {
    const w = groupWinners(g);
    if (w <= 0) return 0;
    return groupPool(g) / w;
  };

  let changed = true;
  while (changed) {
    changed = false;

    for (let i = 0; i < groups.length - 1; i++) {
      const top = groups[i];
      const low = groups[i + 1];

      const pTop = groupPrize(top);
      const pLow = groupPrize(low);

      if (pTop > 0 && pLow > 0 && pTop < pLow) {
        merged.push(`${top.join("+")}+${low.join("+")}`);
        const ng = [...top, ...low];
        groups.splice(i, 2, ng);
        changed = true;
        break;
      }
    }
  }

  const ppw = {};
  for (const g of groups) {
    const w = groupWinners(g);
    const pool = groupPool(g);
    const p = w > 0 ? pool / w : 0;
    for (const c of g) ppw[c] = p;
  }
  for (const c of order) if (!Number.isFinite(ppw[c])) ppw[c] = 0;

  return { prizePerWinner: ppw, mergedGroups: merged };
}

function safeDivide(pool, count) {
  return count > 0 ? pool / count : 0;
}

export function createEurodreamsEngine({
  pricePerDraw = 2.5,
  prizePoolPercent = 0.52,
  worldBetsModel = null,

  // Estado “fondo de reserva” (interno) para 1ª/2ª y carry de 5ª sin ganadores
  initialReserve = 0,
} = {}) {
  // EuroDreams no tiene bote clásico; usamos “jackpot” como alias técnico del Fondo de Reserva.
  let jackpot = 0;

  // Fondo de Reserva real + deuda (para mantener pagos fijos incluso si el reserve no alcanza)
  let reserve = Number.isFinite(initialReserve) ? initialReserve : 0;
  reserve = Math.max(0, reserve);

  let reserveDebt = 0;

  const WORLD = buildWorldBetsModel(worldBetsModel);

  const RESERVE_PCT_OF_PRIZEFUND = 0.4521;
  const DREAM_P = 1 / 5;

  const PRIZE_1_FIXED = 7_200_000;
  const PRIZE_2_FIXED = 120_000;

  const CAP_1_TOTAL = 21_600_000;
  const CAP_2_TOTAL = 1_440_000;

  // % de “Importe destinado a premios de 3ª a 5ª”
  const DIST_3_TO_5 = { 3: 0.0213, 4: 0.3424, 5: 0.6363 };

  // 6ª fija
  const PRIZE_6_FIXED = pricePerDraw;

  return {
    getJackpot() {
      return jackpot;
    },
    getReserve() {
      return reserve;
    },

    runDraw({ player, drawDate = null } = {}) {
      const reserveBefore = reserve;
      jackpot = reserveBefore;

      const betsTotal = estimateBets({ jackpot, drawDate, model: WORLD });
      const betsWorld = Math.max(0, betsTotal - 1);

      const revenue = betsTotal * pricePerDraw;
      const prizeFund = revenue * prizePoolPercent;

      // Sorteo: 6 de 40 + 1 de 5
      const drawnMain = pickUnique(6, 1, 40);
      const drawnDream = randInt(1, 5);
      const setDrawn = new Set(drawnMain);

      // =========================
      // GANADORES mundo (coherentes)
      // =========================
      const hitsCounts = sampleHitsCounts40_6(betsWorld);

      const w6dream = binomial(hitsCounts[6], DREAM_P);
      const w6nodream = hitsCounts[6] - w6dream;

      const winnersWorld = {
        "6+1": w6dream,
        "6+0": w6nodream,
        3: hitsCounts[5],
        4: hitsCounts[4],
        5: hitsCounts[3],
        6: hitsCounts[2],
      };

      // =========================
      // Resultado jugador
      // =========================
      const playerMain = Array.isArray(player?.main) ? player.main : [];
      const playerDream = Number.isFinite(player?.dream) ? player.dream : null;

      const h = matchesCount(playerMain, setDrawn);
      const dreamHit =
        playerDream != null && Number(playerDream) === Number(drawnDream);

      let playerCategory = null;
      if (h === 6 && dreamHit) playerCategory = "6+1";
      else if (h === 6) playerCategory = "6+0";
      else if (h === 5) playerCategory = "3";
      else if (h === 4) playerCategory = "4";
      else if (h === 3) playerCategory = "5";
      else if (h === 2) playerCategory = "6";

      const winnersEffective = { ...winnersWorld };
      if (playerCategory)
        winnersEffective[playerCategory] =
          (winnersEffective[playerCategory] || 0) + 1;

      // =========================
      // 6ª fija: solo se detrae si hay ganadores 6ª
      // =========================
      const w6 = winnersEffective["6"] || 0;
      const sixthTotal = w6 > 0 ? w6 * PRIZE_6_FIXED : 0;

      // =========================
      // Fondo de Reserva (7ª)
      // =========================
      const baseReserve = prizeFund * RESERVE_PCT_OF_PRIZEFUND;
      const reserveContribution = Math.max(
        0,
        Math.min(baseReserve, prizeFund - sixthTotal),
      );

      // Aportación al fondo de reserva (si hay deuda, se paga primero)
      if (reserveDebt > 0) {
        const pay = Math.min(reserveDebt, reserveContribution);
        reserveDebt -= pay;
        reserve += reserveContribution - pay;
      } else {
        reserve += reserveContribution;
      }

      // =========================
      // Importe para 3ª–5ª (6ª ya detraída y reserva ya detraída)
      // =========================
      const pool3to5Base = Math.max(
        0,
        prizeFund - sixthTotal - reserveContribution,
      );

      // Pools iniciales 3ª–5ª
      const poolsInitial = {
        "6+1": 0,
        "6+0": 0,
        3: pool3to5Base * DIST_3_TO_5["3"],
        4: pool3to5Base * DIST_3_TO_5["4"],
        5: pool3to5Base * DIST_3_TO_5["5"],
        6: sixthTotal,
      };

      // =========================
      // Redistribuciones 8ª.2.1 (solo 3ª–5ª)
      // =========================
      const poolsFinal = { ...poolsInitial };
      const roll = {
        "3->4": 0,
        "4->5": 0,
        "5->reserveNext": 0,
      };

      const w3 = winnersEffective["3"] || 0;
      const w4 = winnersEffective["4"] || 0;
      const w5 = winnersEffective["5"] || 0;

      if (w3 === 0 && poolsFinal["3"] > 0) {
        roll["3->4"] = poolsFinal["3"];
        poolsFinal["4"] += poolsFinal["3"];
        poolsFinal["3"] = 0;
      }
      if (w4 === 0 && poolsFinal["4"] > 0) {
        roll["4->5"] = poolsFinal["4"];
        poolsFinal["5"] += poolsFinal["4"];
        poolsFinal["4"] = 0;
      }
      if (w5 === 0 && poolsFinal["5"] > 0) {
        roll["5->reserveNext"] = poolsFinal["5"];
        reserve += poolsFinal["5"];
        poolsFinal["5"] = 0;
      }

      // =========================
      // Premios 1ª y 2ª: salen del Fondo de Reserva
      // =========================
      const w1 = winnersEffective["6+1"] || 0;
      const w2 = winnersEffective["6+0"] || 0;

      const need1 = w1 > 0 ? Math.min(w1 * PRIZE_1_FIXED, CAP_1_TOTAL) : 0;
      const need2 = w2 > 0 ? Math.min(w2 * PRIZE_2_FIXED, CAP_2_TOTAL) : 0;

      const needReservePayout = need1 + need2;

      let reserveTakenForFixed = 0;

      if (needReservePayout > 0) {
        reserveTakenForFixed = Math.min(reserve, needReservePayout);
        reserve -= reserveTakenForFixed;
        reserveDebt += needReservePayout - reserveTakenForFixed;
      }

      poolsFinal["6+1"] = need1;
      poolsFinal["6+0"] = need2;

      // =========================
      // Regla 8ª.2.2 (monotonía): 3ª–6ª
      // =========================
      const { prizePerWinner: ppw3456, mergedGroups } = applyMonotonic3456({
        pools: {
          3: poolsFinal["3"],
          4: poolsFinal["4"],
          5: poolsFinal["5"],
          6: poolsFinal["6"],
        },
        winners: { 3: w3, 4: w4, 5: w5, 6: w6 },
        minPrize6: PRIZE_6_FIXED,
      });

      const prizePerWinner = {
        "6+1": safeDivide(poolsFinal["6+1"], w1),
        "6+0": safeDivide(poolsFinal["6+0"], w2),
        3: ppw3456["3"] || 0,
        4: ppw3456["4"] || 0,
        5: ppw3456["5"] || 0,
        6: ppw3456["6"] || 0,
      };

      const payoutsTotal = {
        "6+1": poolsFinal["6+1"],
        "6+0": poolsFinal["6+0"],
        3: (prizePerWinner["3"] || 0) * (w3 || 0),
        4: (prizePerWinner["4"] || 0) * (w4 || 0),
        5: (prizePerWinner["5"] || 0) * (w5 || 0),
        6: (prizePerWinner["6"] || 0) * (w6 || 0),
      };

      let prize = 0;
      if (playerCategory) prize = prizePerWinner[playerCategory] || 0;

      jackpot = reserve;

      return {
        draw: {
          numbers: drawnMain,
          dream: drawnDream,
        },

        stats: {
          betsMain: betsTotal,
          betsMainWorld: betsWorld,

          revenueMain: revenue,
          totalRevenueThisDraw: revenue,

          prizePoolPercent,
          prizePool: prizeFund,

          prizeFundTotal: prizeFund,
          sixthFixedPrize: PRIZE_6_FIXED,
          sixthTotal,
          reservePctOfPrizeFund: RESERVE_PCT_OF_PRIZEFUND,
          reserveContribution,
          reserveAfter: reserve,
          reserveBefore,
          reserveDebt,

          pool3to5Base,
          poolsInitial,
          poolsFinal,

          roll,
          monotonicRuleMergedGroups: mergedGroups,

          prizePerWinner,
          payoutsTotal,

          jackpotPotThisDraw: poolsFinal["6+1"],

          jackpotCarryover: reserve,
          jackpotNext: reserve,
          jackpot: reserveBefore,

          jackpotBefore: reserveBefore,
          jackpotContributionBase: reserveContribution,
          rolloverToJackpot: roll["5->reserveNext"] || 0,
          jackpotPaidTotal: reserveTakenForFixed,
          jackpotAfter: reserve,

          jackpotWinnersWorld: winnersWorld["6+1"] || 0,
          jackpotWinnersEffective: winnersEffective["6+1"] || 0,
        },

        results: {
          player: {
            hits: h,
            dreamHit,
            category: playerCategory,
            prize,
          },
          winners: winnersWorld,
          winnersEffective,
        },
      };
    },
  };
}
