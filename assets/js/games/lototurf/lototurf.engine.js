// assets/js/games/lototurf/lototurf.engine.js

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
  const wd = d.getDay(); // 0 domingo
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
    baseByWeekday: { sunday: 950_000 },
    clampMin: 250_000,
    clampMax: 3_500_000,
    jackpotBumpK: 0.0,
    jackpotBumpRef: 500_000,
    noiseSigma: 0.12,
    noiseMin: 0.75,
    noiseMax: 1.28,
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
    model.baseByWeekday.sunday;

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

function pickUniqueNumbers(count, min, max) {
  const set = new Set();
  while (set.size < count) {
    const n = min + Math.floor(rand() * (max - min + 1));
    set.add(n);
  }
  return Array.from(set).sort((a, b) => a - b);
}

function pickInt(min, max) {
  return min + Math.floor(rand() * (max - min + 1));
}

function safeDivide(pool, count) {
  return count > 0 ? pool / count : 0;
}

// Binomial rápido: si np pequeño -> Poisson(np), si no -> aproximación normal, siempre acotado.
function binomial(n, p) {
  const N = Math.max(0, Math.floor(n));
  const P = Math.max(0, Math.min(1, Number(p) || 0));
  if (N === 0 || P === 0) return 0;
  if (P === 1) return N;

  const mean = N * P;
  if (mean < 30) return Math.min(N, Math.max(0, poisson(mean)));

  const var_ = N * P * (1 - P);
  const k = Math.round(mean + Math.sqrt(var_) * randn());
  return clamp(k, 0, N);
}

// Combinatoria pequeña (n<=31): combinaciones exactas sin overflow usando producto/ratio
function nCk(n, k) {
  const N = Math.floor(n);
  let K = Math.floor(k);
  if (K < 0 || K > N) return 0;
  if (K === 0 || K === N) return 1;
  K = Math.min(K, N - K);
  let res = 1;
  for (let i = 1; i <= K; i++) {
    res *= (N - K + i) / i;
  }
  return res;
}

// Probabilidades exactas (31 elige 6) de aciertos 6/5/4/3 (hipergeométrica)
function numberHitProbs_31_choose_6() {
  const total = nCk(31, 6);

  const p6 = 1 / total;
  const p5 = (nCk(6, 5) * nCk(25, 1)) / total;
  const p4 = (nCk(6, 4) * nCk(25, 2)) / total;
  const p3 = (nCk(6, 3) * nCk(25, 3)) / total;

  return { p6, p5, p4, p3 };
}

// Muestrea cuántos caballos participan (1..12) según pesos
function sampleHorseParticipantsCount(model, minFallback, maxFallback) {
  const min = Math.max(1, Math.floor(model?.min ?? minFallback ?? 1));
  const max = Math.max(min, Math.floor(model?.max ?? maxFallback ?? 12));
  const weights =
    model?.weights && typeof model.weights === "object" ? model.weights : null;

  if (!weights) return max;

  let total = 0;
  const items = [];
  for (let c = min; c <= max; c++) {
    const w = Number(weights[c]);
    if (Number.isFinite(w) && w > 0) {
      total += w;
      items.push([c, w]);
    }
  }
  if (total <= 0 || items.length === 0) return max;

  let r = rand() * total;
  for (const [c, w] of items) {
    r -= w;
    if (r <= 0) return c;
  }
  return items[items.length - 1][0];
}

// Esperanza de 1/m según el modelo de participantes (coincide con prob. de acertar caballo
// incluso con sustitución "anterior disponible").
function expectedHorseHitProb(model, minFallback, maxFallback) {
  const min = Math.max(1, Math.floor(model?.min ?? minFallback ?? 1));
  const max = Math.max(min, Math.floor(model?.max ?? maxFallback ?? 12));
  const weights =
    model?.weights && typeof model.weights === "object" ? model.weights : null;

  if (!weights) return 1 / max;

  let totalW = 0;
  let acc = 0;
  for (let m = min; m <= max; m++) {
    const w = Number(weights[m]);
    if (!Number.isFinite(w) || w <= 0) continue;
    totalW += w;
    acc += w * (1 / m);
  }
  if (totalW <= 0) return 1 / max;
  return acc / totalW;
}

function substituteToPreviousAvailable(pick, participants, min, max) {
  if (!Number.isFinite(pick)) return null;
  const set = new Set(participants);
  if (set.has(pick)) return pick;

  let cur = pick;
  for (let i = 0; i < max - min + 1 + 2; i++) {
    cur -= 1;
    if (cur < min) cur = max;
    if (set.has(cur)) return cur;
  }
  return participants?.[0] ?? null;
}

export function createLototurfEngine({
  pricePerDraw = 1.0,

  // 55% total, pero internamente se divide en 30/10/15 (categorías/reintegro/reserva)
  prizePoolPercent = 0.55,

  // Porcentajes (sobre venta)
  pools = null,

  // Distribución real de categorías (sobre venta; suma 0.30)
  prizeDistribution = null,

  // Mínimos legales
  guaranteedFirstCategory = 1_000_000,
  minPrizePerWinner = 1.5,

  worldBetsModel = null,
  ranges = null,

  // Modelo de participantes en la carrera (para sustitución y sorteo del caballo ganador)
  horseParticipantsModel = null,

  // Reintegro como pago adicional (no alternativo)
  reintegroIsAddon = true,
} = {}) {
  // Bote/ciclo real: SOLO 1ª categoría (6+caballo)
  let jackpotFirst = 0;

  // Fondo de reserva (15% de venta); puede quedar “en negativo” si se usa para garantizar
  let reserveBalance = 0;

  // Ciclo: empieza en 1 tras un acierto de 1ª
  let cycleDrawIndex = 1;

  const R = ranges || {
    numbersMin: 1,
    numbersMax: 31,
    horseMin: 1,
    horseMax: 12,
    reintegroMin: 0,
    reintegroMax: 9,
  };

  const POOLS = pools || {
    categoriesPercent: 0.3,
    reintegroPercent: 0.1,
    reservePercent: 0.15,
  };

  const DIST = prizeDistribution || {
    "6+horse": 0.06,
    6: 0.07,
    "5+horse": 0.03,
    5: 0.04,
    "4+horse": 0.02,
    4: 0.04,
    "3+horse": 0.04,
  };

  const WORLD = buildWorldBetsModel(worldBetsModel);

  const CAT_KEYS = ["6+horse", "6", "5+horse", "5", "4+horse", "4", "3+horse"];

  // Probabilidades exclusivas por apuesta (mundo) calculadas por combinatoria real.
  function computeExclusiveCategoryProbs() {
    const { p6, p5, p4, p3 } = numberHitProbs_31_choose_6();
    const pHorse = expectedHorseHitProb(
      horseParticipantsModel,
      R.horseMin,
      R.horseMax,
    );

    // Categorías (exactamente esas condiciones) => exclusivas por construcción
    const p = {
      "6+horse": p6 * pHorse,
      6: p6 * (1 - pHorse),

      "5+horse": p5 * pHorse,
      5: p5 * (1 - pHorse),

      "4+horse": p4 * pHorse,
      4: p4 * (1 - pHorse),

      "3+horse": p3 * pHorse,
    };

    // Reintegro independiente: 1/10
    const pReintegro = 1 / 10;

    return { p, pReintegro, pHorse, p6, p5, p4, p3 };
  }

  // Genera ganadores “mundo” por categoría exclusiva (sin solapes)
  function generateExclusiveWorldWinners(nBets, probsByCat) {
    let remaining = Math.max(0, Math.floor(nBets));
    const out = {};

    // Secuencial binomial: equivalente a multinomial aproximado pero estable y rápido
    let remainingProb = 1;
    for (const k of CAT_KEYS) {
      const pk = clamp(Number(probsByCat[k] || 0), 0, 1);
      if (remaining <= 0 || pk <= 0) {
        out[k] = 0;
        continue;
      }
      const denom = Math.max(1e-12, remainingProb);
      const pCond = clamp(pk / denom, 0, 1);
      const w = binomial(remaining, pCond);
      out[k] = w;
      remaining -= w;
      remainingProb = Math.max(1e-12, remainingProb - pk);
    }

    // Si por redondeos quedase algo raro, lo ignoramos (probabilidades son muy pequeñas)
    return out;
  }

  return {
    // Para UI genérica: bote de la 1ª
    getJackpot() {
      return jackpotFirst || 0;
    },

    runDraw({ player, drawDate = null }) {
      const jackpotBefore = jackpotFirst || 0;

      const betsTotal = estimateBets({
        jackpot: jackpotBefore,
        drawDate,
        model: WORLD,
      });
      const betsWorld = Math.max(0, betsTotal - 1);

      const revenue = betsTotal * pricePerDraw;

      // Partición real de la venta
      const poolCategories = revenue * (POOLS.categoriesPercent || 0.3);
      const poolReintegroBudget = revenue * (POOLS.reintegroPercent || 0.1);
      const poolReserve = revenue * (POOLS.reservePercent || 0.15);

      // Por coherencia con UI existente (55% total)
      const prizePool = revenue * prizePoolPercent;

      // Actualizar reserva (entra 15% cada sorteo)
      reserveBalance += poolReserve;

      // Sorteo números + reintegro (reintegro es del sorteo; el resguardo lleva un número asociado)
      const drawnNumbers = pickUniqueNumbers(6, R.numbersMin, R.numbersMax);
      const drawnReintegro = pickInt(R.reintegroMin, R.reintegroMax);

      // Participantes en la carrera y caballo ganador (si <12, los que faltan se consideran retirados)
      const participantsCount = sampleHorseParticipantsCount(
        horseParticipantsModel,
        R.horseMin,
        R.horseMax,
      );
      const horseParticipants = [];
      for (let h = R.horseMin; h <= participantsCount; h++)
        horseParticipants.push(h);

      const drawnHorse = horseParticipants.length
        ? horseParticipants[pickInt(0, horseParticipants.length - 1)]
        : pickInt(R.horseMin, R.horseMax);

      // Jugador
      const yourNumbers = Array.isArray(player?.main) ? player.main : [];
      const yourHorseRaw =
        player?.horse !== null && player?.horse !== undefined
          ? Number(player.horse)
          : null;

      // Reintegro del resguardo:
      // Si el jugador no lo ha indicado (UI opcional), se asigna automáticamente (no se "pronostica").
      const ticketReintegro =
        player?.reintegro !== null &&
        player?.reintegro !== undefined &&
        Number.isFinite(Number(player.reintegro))
          ? Number(player.reintegro)
          : pickInt(R.reintegroMin, R.reintegroMax);

      // Sustitución del caballo pronosticado si no participa (norma 22ª.2)
      const yourHorse =
        yourHorseRaw !== null && Number.isFinite(yourHorseRaw)
          ? substituteToPreviousAvailable(
              yourHorseRaw,
              horseParticipants,
              R.horseMin,
              R.horseMax,
            )
          : null;

      // Aciertos números
      const drawnSet = new Set(drawnNumbers);
      let hits = 0;
      for (const n of yourNumbers) {
        if (drawnSet.has(n)) hits++;
      }

      const horseHit =
        yourHorse !== null &&
        Number.isFinite(yourHorse) &&
        yourHorse === drawnHorse;

      const reintegroHit = ticketReintegro === drawnReintegro;

      // Categoría jugador (SOLO 1..7; reintegro se paga aparte)
      let playerCategory = null;
      if (hits === 6 && horseHit) playerCategory = "6+horse";
      else if (hits === 6) playerCategory = "6";
      else if (hits === 5 && horseHit) playerCategory = "5+horse";
      else if (hits === 5) playerCategory = "5";
      else if (hits === 4 && horseHit) playerCategory = "4+horse";
      else if (hits === 4) playerCategory = "4";
      else if (hits === 3 && horseHit) playerCategory = "3+horse";

      // ========== PROBABILIDADES REALES (mundo) ==========
      const {
        p: PROB_CAT,
        pReintegro,
        pHorse,
        p6,
        p5,
        p4,
        p3,
      } = computeExclusiveCategoryProbs();

      // Winners mundo (EXCLUSIVOS por categorías, basados en combinatoria)
      const winnersWorld = generateExclusiveWorldWinners(betsWorld, PROB_CAT);

      // Reintegro mundo (independiente, puede solapar con categorías)
      const winnersWorldReintegro = binomial(betsWorld, pReintegro);

      // Winners efectivos (incluye jugador)
      const winnersEffective = { ...winnersWorld };
      if (playerCategory) {
        winnersEffective[playerCategory] =
          (winnersEffective[playerCategory] || 0) + 1;
      }

      // Reintegro efectivo (si es addon, se suma aunque haya categoría)
      const reintegroWinnersEffective =
        winnersWorldReintegro + (reintegroHit ? 1 : 0);

      // Pools base por categoría (sobre VENTA real, usando DIST real)
      const poolsThisDraw = {};
      CAT_KEYS.forEach((k) => {
        poolsThisDraw[k] = revenue * (DIST[k] || 0);
      });

      // Reintegro: presupuesto del 10% (no se mezcla con categorías)
      poolsThisDraw.reintegro = poolReintegroBudget;

      // ==========
      // LÓGICA REAL DE CICLO / BOTE / “SIN ACERTANTES”
      // ==========

      // 1ª: bote acumulado + pool base de este sorteo
      let potFirst = (poolsThisDraw["6+horse"] || 0) + (jackpotFirst || 0);

      // Fondo garantizado SOLO en el primer sorteo del ciclo
      let guaranteedTopUp = 0;
      if (cycleDrawIndex === 1) {
        if (potFirst < guaranteedFirstCategory) {
          guaranteedTopUp = guaranteedFirstCategory - potFirst;
          reserveBalance -= guaranteedTopUp;
          potFirst += guaranteedTopUp;
        }
      }

      // 2ª: pool base (no tiene bote propio)
      let potSecond = poolsThisDraw["6"] || 0;

      const w1 = winnersEffective["6+horse"] || 0;
      const w2 = winnersEffective["6"] || 0;

      // 18ª.2.a: si hay 1ª y NO hay 2ª, el fondo de 2ª incrementa 1ª (mismo sorteo)
      if (w1 > 0 && w2 === 0) {
        potFirst += potSecond;
        potSecond = 0;
      }

      // 18ª.2.b: si NO hay 1ª NI 2ª, el fondo de ambas incrementa 1ª en el sorteo siguiente
      let carryToFirstNext = 0;
      if (w1 === 0 && w2 === 0) {
        carryToFirstNext += potSecond;
        potSecond = 0;
      }

      // Cascadas 18ª.3: 3ª->4ª->5ª->6ª->7ª, y si no hay 7ª, todo a 1ª siguiente
      let pot3 = poolsThisDraw["5+horse"] || 0;
      let pot4 = poolsThisDraw["5"] || 0;
      let pot5 = poolsThisDraw["4+horse"] || 0;
      let pot6 = poolsThisDraw["4"] || 0;
      let pot7 = poolsThisDraw["3+horse"] || 0;

      const w3 = winnersEffective["5+horse"] || 0;
      const w4 = winnersEffective["5"] || 0;
      const w5 = winnersEffective["4+horse"] || 0;
      const w6 = winnersEffective["4"] || 0;
      const w7 = winnersEffective["3+horse"] || 0;

      if (w3 === 0) {
        pot4 += pot3;
        pot3 = 0;
      }
      if (w4 === 0) {
        pot5 += pot4;
        pot4 = 0;
      }
      if (w5 === 0) {
        pot6 += pot5;
        pot5 = 0;
      }
      if (w6 === 0) {
        pot7 += pot6;
        pot6 = 0;
      }
      if (w7 === 0) {
        carryToFirstNext += pot7;
        pot7 = 0;
      }

      // 18ª.4: si premio unitario < 1,50€, se acumula a 1ª siguiente (no se paga esa categoría)
      const pots = {
        "6+horse": potFirst,
        6: potSecond,
        "5+horse": pot3,
        5: pot4,
        "4+horse": pot5,
        4: pot6,
        "3+horse": pot7,
      };

      const winnersNow = {
        "6+horse": w1,
        6: w2,
        "5+horse": w3,
        5: w4,
        "4+horse": w5,
        4: w6,
        "3+horse": w7,
      };

      Object.keys(pots).forEach((k) => {
        const wc = winnersNow[k] || 0;
        const pot = pots[k] || 0;
        if (wc > 0) {
          const unit = pot / wc;
          if (unit < minPrizePerWinner) {
            carryToFirstNext += pot;
            pots[k] = 0;
          }
        }
      });

      // Aplicar tras 1.5
      potFirst = pots["6+horse"] || 0;
      potSecond = pots["6"] || 0;
      pot3 = pots["5+horse"] || 0;
      pot4 = pots["5"] || 0;
      pot5 = pots["4+horse"] || 0;
      pot6 = pots["4"] || 0;
      pot7 = pots["3+horse"] || 0;

      // ==========
      // REINTEGRO (10%): 1€ por ganador; puede sobrar/faltar vs presupuesto (norma: SELAE lo asume)
      // ==========
      const reinW = reintegroWinnersEffective;
      const reinPayout = reinW * pricePerDraw;
      const reinBudget = poolsThisDraw.reintegro || 0;

      // ==========
      // PREMIOS POR GANADOR (categorías)
      // ==========
      const prizePerWinner = {
        "6+horse": safeDivide(potFirst, w1),
        6: safeDivide(potSecond, w2),
        "5+horse": safeDivide(pot3, w3),
        5: safeDivide(pot4, w4),
        "4+horse": safeDivide(pot5, w5),
        4: safeDivide(pot6, w6),
        "3+horse": safeDivide(pot7, w7),
      };

      const payoutsTotal = {
        "6+horse": w1 > 0 ? potFirst : 0,
        6: w2 > 0 ? potSecond : 0,
        "5+horse": w3 > 0 ? pot3 : 0,
        5: w4 > 0 ? pot4 : 0,
        "4+horse": w5 > 0 ? pot5 : 0,
        4: w6 > 0 ? pot6 : 0,
        "3+horse": w7 > 0 ? pot7 : 0,
        reintegro: reinPayout,
      };

      // Premio del jugador (categoría + reintegro si procede)
      let prizeCategory = 0;
      if (playerCategory) prizeCategory = prizePerWinner[playerCategory] || 0;

      const prizeReintegro =
        reintegroIsAddon && reintegroHit ? pricePerDraw : 0;

      const prize = prizeCategory + prizeReintegro;

      // ==========
      // ACTUALIZAR BOTE Y CICLO
      // ==========
      if (w1 === 0) {
        jackpotFirst = potFirst + carryToFirstNext;
        cycleDrawIndex += 1;
      } else {
        jackpotFirst = carryToFirstNext;
        cycleDrawIndex = 1;
      }

      const jackpotAfter = jackpotFirst || 0;

      const poolsFinal = {
        ...poolsThisDraw,

        categoriesBase: poolCategories,
        reintegroBase: poolReintegroBudget,
        reserveBase: poolReserve,

        pot_6_horse: potFirst,
        pot_6: potSecond,
        pot_5_horse: pot3,
        pot_5: pot4,
        pot_4_horse: pot5,
        pot_4: pot6,
        pot_3_horse: pot7,

        guaranteedTopUp,
        carryToFirstNext,

        horseParticipantsCount: horseParticipants.length,
        horseParticipants,

        probs: {
          horseHitExpected: pHorse,
          numbers: { p6, p5, p4, p3 },
          categoriesExclusive: { ...PROB_CAT },
          reintegro: pReintegro,
        },
      };

      return {
        draw: {
          numbers: drawnNumbers,
          horse: drawnHorse,
          reintegro: drawnReintegro,
          horseParticipants: horseParticipants,
        },

        stats: {
          betsMain: betsTotal,
          betsMainWorld: betsWorld,

          revenueMain: revenue,
          totalRevenueThisDraw: revenue,

          prizePoolPercent,
          prizePool,

          poolCategories,
          poolReintegroBudget,
          poolReserve,

          reserveBalance,

          poolsFinal,
          prizePerWinner,
          payoutsTotal,

          jackpotPotThisDraw: potFirst,
          jackpotBefore,
          jackpotAfter,

          jackpotContributionBase: poolsThisDraw["6+horse"] || 0,
          rolloverToJackpot: guaranteedTopUp || 0,
          jackpotWinnersEffective: w1,
          jackpotPaidTotal: w1 > 0 ? potFirst : 0,

          jackpotNext: jackpotAfter,
          jackpotCarryover: jackpotAfter,

          cycleDrawIndex,
        },

        results: {
          player: {
            category: playerCategory,
            hits,
            horsePickRaw: yourHorseRaw,
            horsePickEffective: yourHorse,
            horseHit,
            ticketReintegro,
            reintegroHit,
            prizeCategory: Math.round(prizeCategory),
            prizeReintegro: Math.round(prizeReintegro),
            prize: Math.round(prize),
          },

          winners: {
            ...winnersWorld,
            reintegro: winnersWorldReintegro,
          },

          winnersEffective: {
            ...winnersEffective,
            reintegro: reinW,
          },

          reintegro: {
            winners: reinW,
            budget: reinBudget,
            payout: reinPayout,
            delta: reinBudget - reinPayout,
          },
        },
      };
    },
  };
}
