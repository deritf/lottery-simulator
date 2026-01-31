// assets/js/games/quiniela/quiniela.engine.js

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
    baseByWeekday: { sunday: 2_200_000 },
    clampMin: 600_000,
    clampMax: 8_000_000,
    jackpotBumpK: 0.1,
    jackpotBumpRef: 1_000_000,
    noiseSigma: 0.1,
    noiseMin: 0.8,
    noiseMax: 1.25,
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

function pick1X2({ pHome, pDraw, pAway }) {
  const x = rand();
  if (x < pHome) return "1";
  if (x < pHome + pDraw) return "X";
  return "2";
}

function pickGoalCode({ p0, p1, p2, pM }) {
  const x = rand();
  if (x < p0) return "0";
  if (x < p0 + p1) return "1";
  if (x < p0 + p1 + p2) return "2";
  return "M";
}

function safeDivide(pool, count) {
  return count > 0 ? pool / count : 0;
}

/* =========================================================
   Equipos / Jornadas aleatorias
   - Genera 14 partidos + 1 pleno al 15 en cada sorteo
   - Evita duplicados dentro de una misma jornada
   ========================================================= */

function shuffleInPlace(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
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
  const plenoMatch = `${plenoHome} - ${plenoAway}`;

  return { matches, plenoMatch };
}

/* =========================================================
   Reglas de reparto (modelo normativo Quiniela - BOE)
   - 55% de la recaudación a premios
   - % sobre recaudación (total 55%):
     Especial (Pleno 15): 10%
     1ª (14): 12%
     2ª (13): 8%
     3ª (12): 8%
     4ª (11): 8%
     5ª (10): 9%
   - Arrastres:
     * Sin Especial: pasa a Especial futuro (carryover)
     * Sin 14: su fondo pasa a Especial (carryover)
     * Sin 13 -> pasa a 12; sin 12 -> a 11; sin 11 -> a 10; sin 10 -> a Especial (carryover)
   - Mínimos:
     * 4ª (11) < 1€ por ganador => 4ª queda sin premio y su fondo pasa a 3ª (12)
     * 5ª (10) < 1,5€ por ganador => 5ª queda sin premio y su fondo pasa a Especial (carryover)
   - Orden de premios:
     * Un premio inferior no puede superar a uno superior; si ocurre, se fusionan categorías adyacentes.
   ========================================================= */

function computeMergedPrizeGroups(baseCategories, poolsByCat, winnersByCat) {
  // baseCategories: ["14","13","12","11","10"] (en ese orden)
  // Devuelve grupos fusionados para garantizar premio no-incremental.
  let groups = baseCategories.map((cat) => ({
    cats: [cat],
    pool: Math.max(0, Number(poolsByCat[cat]) || 0),
    winners: Math.max(0, Number(winnersByCat[cat]) || 0),
  }));

  const groupPrize = (g) => (g.winners > 0 ? g.pool / g.winners : 0);

  let merged = true;
  let guard = 0;
  while (merged && guard < 50) {
    merged = false;
    guard++;

    for (let i = 0; i < groups.length - 1; i++) {
      const upper = groups[i];
      const lower = groups[i + 1];

      const pu = groupPrize(upper);
      const pl = groupPrize(lower);

      if (upper.winners > 0 && lower.winners > 0 && pl > pu) {
        const newGroup = {
          cats: [...upper.cats, ...lower.cats],
          pool: upper.pool + lower.pool,
          winners: upper.winners + lower.winners,
        };
        groups.splice(i, 2, newGroup);
        merged = true;
        break;
      }
    }
  }

  const prizePerWinner = {};
  for (const g of groups) {
    const p = g.winners > 0 ? g.pool / g.winners : 0;
    for (const cat of g.cats) prizePerWinner[cat] = p;
  }

  return { groups, prizePerWinner };
}

export function createQuinielaEngine({
  pricePerDraw = 0.75,
  prizePoolPercent = 0.55,
  probabilities = null,
  worldBetsModel = null,
  outcomeModel = null,
  goalsModel = null,

  // pool de equipos y fallbacks por si no hay suficientes
  teams = null,
  matchesFallback = null,
  plenoFallback = null,
} = {}) {
  // En Quiniela no hay “bote” como Euromillones, pero sí arrastre a Especial (Pleno 15).
  // Para UI y para el modelo de participación, tratamos ESE arrastre como "jackpot".
  let specialCarryover = 0; // arrastre hacia Especial (Pleno 15)
  let jackpot = 0; // alias (siempre = specialCarryover)

  // Probabilidades (atajo de simulación para estimar ganadores del mundo)
  const PROB = probabilities || {
    pleno15: 1 / 76_527_504,
    14: 1 / 4_782_969,
    13: 1 / 170_820,
    12: 1 / 13_140,
    11: 1 / 1_643,
    10: 1 / 299,
  };

  const WORLD = buildWorldBetsModel(worldBetsModel);
  const OUT = outcomeModel || { pHome: 0.46, pDraw: 0.26, pAway: 0.28 };
  const GOALS = goalsModel || { p0: 0.26, p1: 0.3, p2: 0.22, pM: 0.22 };

  const FALLBACK_MATCHES = Array.isArray(matchesFallback)
    ? matchesFallback
    : [];
  const FALLBACK_PLENO = String(plenoFallback || "").trim();

  return {
    getJackpot() {
      return jackpot;
    },

    getSpecialCarryover() {
      return specialCarryover;
    },

    runDraw({ player, drawDate = null }) {
      jackpot = specialCarryover;

      const betsTotal = estimateBets({ jackpot, drawDate, model: WORLD });
      const betsWorld = Math.max(0, betsTotal - 1);

      const revenue = betsTotal * pricePerDraw;

      const prizePool = revenue * prizePoolPercent;

      const jornada =
        buildRandomMatchesFromTeams(teams, 14) ||
        (FALLBACK_MATCHES.length >= 14 && FALLBACK_PLENO
          ? {
              matches: FALLBACK_MATCHES.slice(0, 14),
              plenoMatch: FALLBACK_PLENO,
            }
          : {
              matches: Array.from({ length: 14 }, (_, i) => `Partido ${i + 1}`),
              plenoMatch: "Partido 15",
            });

      const drawnSigns = Array.from({ length: 14 }, () => pick1X2(OUT));
      const drawnPleno = {
        home: pickGoalCode(GOALS),
        away: pickGoalCode(GOALS),
      };

      const signs = Array.isArray(player?.signs) ? player.signs : [];
      const pleno = player?.pleno || { home: null, away: null };

      let hits14 = 0;
      for (let i = 0; i < 14; i++) {
        if (signs[i] && signs[i] === drawnSigns[i]) hits14++;
      }

      const plenoHit =
        pleno?.home != null &&
        pleno?.away != null &&
        pleno.home === drawnPleno.home &&
        pleno.away === drawnPleno.away;

      let playerCategory = null;
      if (hits14 === 14 && plenoHit) playerCategory = "pleno15";
      else if (hits14 === 14) playerCategory = "14";
      else if (hits14 === 13) playerCategory = "13";
      else if (hits14 === 12) playerCategory = "12";
      else if (hits14 === 11) playerCategory = "11";
      else if (hits14 === 10) playerCategory = "10";

      const winnersWorld = {};
      Object.keys(PROB).forEach((k) => {
        winnersWorld[k] = Math.max(0, poisson(betsWorld * PROB[k]));
      });

      const winnersEffective = { ...winnersWorld };
      if (playerCategory) {
        winnersEffective[playerCategory] =
          (winnersEffective[playerCategory] || 0) + 1;
      }

      // Pools normativos (porcentaje sobre recaudación) - BOE
      // Especial incluye carryover acumulado
      const pools = {
        pleno15: revenue * 0.1 + specialCarryover,
        14: revenue * 0.12,
        13: revenue * 0.08,
        12: revenue * 0.08,
        11: revenue * 0.08,
        10: revenue * 0.09,
      };

      // Guardamos el carryover previo para stats/debug
      const specialCarryoverBefore = specialCarryover;

      // Arrastres hacia Especial (modelo: al siguiente sorteo)
      let specialCarryoverOut = 0;

      // Función para aplicar arrastres por “sin acertantes”
      function applyNoWinnerRollovers() {
        // Especial sin ganadores -> carryover
        if ((winnersEffective.pleno15 || 0) === 0 && pools.pleno15 > 0) {
          specialCarryoverOut += pools.pleno15;
          pools.pleno15 = 0;
        }

        // 1ª (14) sin ganadores -> a Especial (carryover)
        if ((winnersEffective["14"] || 0) === 0 && pools["14"] > 0) {
          specialCarryoverOut += pools["14"];
          pools["14"] = 0;
        }

        // 2ª a 5ª: cascada
        if ((winnersEffective["13"] || 0) === 0 && pools["13"] > 0) {
          pools["12"] += pools["13"];
          pools["13"] = 0;
        }
        if ((winnersEffective["12"] || 0) === 0 && pools["12"] > 0) {
          pools["11"] += pools["12"];
          pools["12"] = 0;
        }
        if ((winnersEffective["11"] || 0) === 0 && pools["11"] > 0) {
          pools["10"] += pools["11"];
          pools["11"] = 0;
        }
        if ((winnersEffective["10"] || 0) === 0 && pools["10"] > 0) {
          specialCarryoverOut += pools["10"];
          pools["10"] = 0;
        }
      }

      // Función para aplicar mínimos
      function applyMinimumThresholds() {
        // 4ª (11): si premio < 1€ => pasa a 3ª (12)
        const w11 = winnersEffective["11"] || 0;
        if (w11 > 0 && pools["11"] > 0) {
          const prize11 = pools["11"] / w11;
          if (prize11 < 1) {
            pools["12"] += pools["11"];
            pools["11"] = 0;
          }
        }

        // 5ª (10): si premio < 1,5€ => pasa a Especial (carryover)
        const w10 = winnersEffective["10"] || 0;
        if (w10 > 0 && pools["10"] > 0) {
          const prize10 = pools["10"] / w10;
          if (prize10 < 1.5) {
            specialCarryoverOut += pools["10"];
            pools["10"] = 0;
          }
        }
      }

      // Aplicamos reglas en bucle corto para estabilizar (cambios pueden activar nuevas cascadas)
      for (let i = 0; i < 5; i++) {
        const snapshot = JSON.stringify({
          pools,
          specialCarryoverOut,
        });

        applyNoWinnerRollovers();
        applyMinimumThresholds();
        applyNoWinnerRollovers();

        const snapshot2 = JSON.stringify({
          pools,
          specialCarryoverOut,
        });
        if (snapshot2 === snapshot) break;
      }

      // Premios por ganador:
      // - Especial: directo (si hay ganadores)
      // - Base (14..10): aplicar monotonicidad fusionando categorías si hace falta
      const prizePerWinner = {};

      const wPleno = winnersEffective.pleno15 || 0;
      prizePerWinner.pleno15 = wPleno > 0 ? pools.pleno15 / wPleno : 0;

      const baseCats = ["14", "13", "12", "11", "10"];
      const { prizePerWinner: basePPW } = computeMergedPrizeGroups(
        baseCats,
        pools,
        winnersEffective,
      );

      baseCats.forEach((c) => {
        prizePerWinner[c] = basePPW[c] || 0;
      });

      // Pagos totales (si hay ganadores, se paga el pool)
      const payoutsTotal = {};
      Object.keys(pools).forEach((k) => {
        payoutsTotal[k] = (winnersEffective[k] || 0) > 0 ? pools[k] : 0;
      });

      // Premio jugador
      let prize = 0;
      if (playerCategory) prize = prizePerWinner[playerCategory] || 0;

      // Actualizar carryover para próximo sorteo (esto es el “bote” visible)
      specialCarryover = specialCarryoverOut;
      jackpot = specialCarryover;

      return {
        draw: {
          signs: drawnSigns,
          pleno: drawnPleno,

          matches: jornada.matches,
          plenoMatch: jornada.plenoMatch,
        },

        stats: {
          betsMain: betsTotal,
          betsMainWorld: betsWorld,
          revenueMain: revenue,
          totalRevenueThisDraw: revenue,

          prizePoolPercent,
          prizePool,

          poolsFinal: { ...pools },
          prizePerWinner: { ...prizePerWinner },
          payoutsTotal: { ...payoutsTotal },

          jackpotPotThisDraw: pools["pleno15"] || 0,

          specialCarryoverBefore,
          specialCarryoverAfter: specialCarryover,

          jackpotCarryover: specialCarryover,
          jackpotNext: specialCarryover,
          jackpot: specialCarryoverBefore,

          jackpotBefore: specialCarryoverBefore,
          jackpotContributionBase: 0,
          rolloverToJackpot: specialCarryover,
          jackpotPaidTotal: pools["pleno15"] || 0,
          jackpotAfter: specialCarryover,
          jackpotWinnersWorld: winnersWorld.pleno15 || 0,
          jackpotWinnersEffective: winnersEffective.pleno15 || 0,
        },

        results: {
          player: {
            category: playerCategory,
            hits14,
            plenoHit,
            prize: Math.round(prize),
          },
          winners: winnersWorld,
          winnersEffective,
        },
      };
    },
  };
}
