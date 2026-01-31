// assets/js/games/primitiva/primitiva.engine.js

/* =====================================================
   MOTOR – LA PRIMITIVA (según normas SELAE 2022)
   ===================================================== */

/*
  Sorteo:
  - 6 números (1..49)
  - 1 complementario (1..49, distinto)
  - 1 reintegro (0..9)

  Categorías:
  - 6R : Especial = 6 números + reintegro (cobra 1ª + especial)
  - 6  : 1ª = 6 números (incluye a los 6R para el reparto de 1ª)
  - 5C : 2ª = 5 números + complementario
  - 5  : 3ª = 5 números
  - 4  : 4ª = 4 números
  - 3  : 5ª = 3 números (fijo 8€ salvo regla 8ª.2)
  - R  : Reintegro (solo si NO hay premio de 3 o más)
*/

const JOKER_PRIZES = {
  7: 1_000_000,
  6: 10_000,
  5: 1_000,
  4: 300,
  3: 50,
  2: 5,
  1: 1,
};

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

// Normal(0,1) Box–Muller
function randn() {
  let u = 0,
    v = 0;
  while (u === 0) u = rand();
  while (v === 0) v = rand();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

// Poisson robusto: exacto para lambda pequeño, normal aprox para grande
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

  // Aproximación normal: N(lambda, lambda)
  const n = Math.round(l + Math.sqrt(l) * randn());
  return Math.max(0, n);
}

function pickUnique(count, min, max) {
  const s = new Set();
  while (s.size < count) s.add(randInt(min, max));
  return Array.from(s).sort((a, b) => a - b);
}

function drawReintegro() {
  return randInt(0, 9);
}

function drawComplementario(excludeSet) {
  let n = randInt(1, 49);
  while (excludeSet.has(n)) n = randInt(1, 49);
  return n;
}

function drawJoker() {
  let n = "";
  for (let i = 0; i < 7; i++) n += randInt(0, 9);
  return n;
}

function prefixHits(a, b) {
  let hits = 0;
  for (let i = 0; i < 7; i++) {
    if (a[i] === b[i]) hits++;
    else break;
  }
  return hits;
}

function suffixHits(a, b) {
  let hits = 0;
  for (let i = 6; i >= 0; i--) {
    if (a[i] === b[i]) hits++;
    else break;
  }
  return hits;
}

// Joker: aciertos por primeras o por últimas cifras (se toma el mayor)
function jokerHits(player, drawn) {
  const p = String(player ?? "").padStart(7, "0");
  const d = String(drawn ?? "").padStart(7, "0");
  return Math.max(prefixHits(p, d), suffixHits(p, d));
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

  // JS: 0=domingo ... 6=sábado
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
    baseByWeekday: {
      monday: 5_800_000,
      thursday: 11_600_000,
      saturday: 12_300_000,
    },
    clampMin: 3_500_000,
    clampMax: 25_000_000,
    jackpotBumpK: 0.18,
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

// Modelo de apuestas: depende del día + sube con el bote + variación aleatoria controlada
function estimateMainBets({ jackpot, drawDate, model }) {
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

// % del mundo que añade Joker (no afecta al bote principal)
function estimateJokerShare({ jackpot }) {
  const j = Math.max(0, Number(jackpot) || 0);

  const base = 0.22;
  const bump = 0.06 * Math.log10(1 + j / 5_000_000);
  const noise = randn() * 0.02;

  return clamp(base + bump + noise, 0.12, 0.45);
}

// =====================================================
// Reglas de fondos (SELAE 2022)
// =====================================================
// - A premios: 55% de la recaudación
// - Dentro de ese 55%:
//     45% -> categorías (especial + 1ª..5ª)
//     10% -> reintegro (SELAE asume diferencias)
const CATEGORY_FUND_PERCENT = 0.45;
const REINTEGRO_FUND_PERCENT = 0.1;

// Tras pagar 3 aciertos a 8€ (si no se “rompe” por 8ª.2),
// el fondo restante se reparte así:
const CATEGORY_REMAINING_SPLIT = {
  "6R": 0.3, // especial
  6: 0.37, // 1ª
  "5C": 0.06, // 2ª
  5: 0.11, // 3ª
  4: 0.16, // 4ª
};

// Probabilidades (mutuamente exclusivas para “mundo”, aproximación)
// Nota: R aquí es “reintegro SOLO” (si no hay premio >= 3)
const PROBABILITIES = {
  "6R": 1 / 139_838_160,
  // 6 sin reintegro:
  6: (1 / 13_983_816) * (9 / 10),
  "5C": 1 / 2_330_636,
  5: 1 / 55_491,
  4: 1 / 1_032,
  3: 1 / 57,
  // Aproximación: 0.1 * (1 - P(match>=3))
  R:
    0.1 *
    (1 - (1 / 57 + 1 / 1_032 + 1 / 55_491 + 1 / 2_330_636 + 1 / 13_983_816)),
};

// =====================================================
// Regla 8ª.2 (no superar categorías)
// Si una categoría inferior resultase superior a la precedente,
// se suman fondos y ganadores y se paga un mismo premio por
// apuesta a todas las categorías fusionadas (cascada).
// =====================================================
function applyRule8_2(categoriesOrdered) {
  // categoriesOrdered: [{ key, pool, winners }] de mayor a menor
  // Devuelve { prizeByKey, poolByKey, winnersByKey }
  const cats = categoriesOrdered.map((c) => ({
    key: c.key,
    pool: Number(c.pool) || 0,
    winners: Math.max(0, Number(c.winners) || 0),
  }));

  // Bloques fusionables (cada bloque agrupa varias categorías)
  let blocks = cats.map((c) => ({
    keys: [c.key],
    pool: c.pool,
    winners: c.winners,
  }));

  const prizeOf = (b) => (b.winners > 0 ? b.pool / b.winners : Infinity);

  let i = 0;
  while (i < blocks.length - 1) {
    const upper = blocks[i];
    const lower = blocks[i + 1];

    const pUpper = prizeOf(upper);
    const pLower = lower.winners > 0 ? lower.pool / lower.winners : 0;

    // Si inferior > superior, fusionar bloques
    if (lower.winners > 0 && pLower > pUpper) {
      const merged = {
        keys: [...upper.keys, ...lower.keys],
        pool: upper.pool + lower.pool,
        winners: upper.winners + lower.winners,
      };

      blocks.splice(i, 2, merged);
      i = Math.max(0, i - 1);
      continue;
    }

    i++;
  }

  const prizeByKey = {};
  const poolByKey = {};
  const winnersByKey = {};

  // Reconstruir: cada categoría del bloque cobra el mismo premio/ganador
  for (const b of blocks) {
    const prize = b.winners > 0 ? b.pool / b.winners : 0;

    for (const key of b.keys) {
      const c = cats.find((x) => x.key === key);
      const w = c?.winners ?? 0;

      winnersByKey[key] = w;
      prizeByKey[key] = w > 0 ? prize : 0;
      poolByKey[key] = w > 0 ? prize * w : 0;
    }
  }

  return { prizeByKey, poolByKey, winnersByKey };
}

export function createPrimitivaEngine({
  pricePerBet = 1,
  prizePoolPercent = 0.55,

  // Joker: independiente
  jokerEnabled = true,
  jokerPrice = 1,

  // NUEVO (formal): modelo de participación
  worldBetsModel = null,
} = {}) {
  // “jackpot” representa el bote acumulado de la CATEGORÍA ESPECIAL (6R)
  let jackpot = 0;

  const WORLD_BETS_MODEL = buildWorldBetsModel(worldBetsModel);

  return {
    getJackpot() {
      return jackpot;
    },

    runDraw({ player, joker, drawDate = null }) {
      /* ============================
         PARTICIPACIÓN (mundo)
         ============================ */

      const betsMainTotal = estimateMainBets({
        jackpot,
        drawDate,
        model: WORLD_BETS_MODEL,
      });

      // “mundo” sin contarte a ti (tu apuesta es 1)
      const betsMainWorld = Math.max(0, betsMainTotal - 1);

      const revenueMain = betsMainTotal * pricePerBet;
      const prizePoolRaw = revenueMain * prizePoolPercent;

      // Joker (mundo) - informativo (no alimenta el bote principal)
      const jokerActiveWorld = Boolean(jokerEnabled);
      const jokerShare = jokerActiveWorld ? estimateJokerShare({ jackpot }) : 0;
      const jokerBetsWorld = jokerActiveWorld
        ? Math.round(betsMainTotal * jokerShare)
        : 0;
      const revenueJokerWorld = jokerBetsWorld * jokerPrice;

      const totalRevenueThisDraw = revenueMain + revenueJokerWorld;

      /* ============================
         SORTEO (Norma 36ª)
         ============================ */

      const drawnMain = pickUnique(6, 1, 49);
      const mainSet = new Set(drawnMain);
      const drawnComp = drawComplementario(mainSet);
      const drawnRein = drawReintegro();

      const drawnJoker = jokerEnabled ? drawJoker() : null;

      /* ============================
         GANADORES (mundo) - SIN CONTARTE A TI
         (aprox Poisson por categoría exclusiva)
         ============================ */

      const winnersWorld = {};
      Object.keys(PROBABILITIES).forEach((k) => {
        winnersWorld[k] = Math.max(
          0,
          poisson(betsMainWorld * PROBABILITIES[k]),
        );
      });

      /* ============================
         RESULTADO DEL JUGADOR (principal)
         ============================ */

      const matchCount = matches(player.main, drawnMain);
      const hasComplement = player.main.includes(drawnComp);
      const reinMatch = player.reintegro === drawnRein;

      let playerCategory = null;

      if (matchCount === 6 && reinMatch) playerCategory = "6R";
      else if (matchCount === 6) playerCategory = 6;
      else if (matchCount === 5 && hasComplement) playerCategory = "5C";
      else if (matchCount === 5) playerCategory = 5;
      else if (matchCount === 4) playerCategory = 4;
      else if (matchCount === 3) playerCategory = 3;
      else if (reinMatch) playerCategory = "R";

      // Winners efectivos (mundo + tú si toca)
      const winnersEffective = { ...winnersWorld };
      if (playerCategory) {
        winnersEffective[playerCategory] =
          (winnersEffective[playerCategory] || 0) + 1;
      }

      /* ============================
         FONDOS (Normas 7ª, 8ª, 9ª, 10ª)
         ============================ */

      const prizePool = prizePoolRaw;

      // 45% categorías (especial + 1ª..5ª)
      const categoryFund = revenueMain * CATEGORY_FUND_PERCENT;

      // 10% reintegro (SELAE compensa diferencias)
      const reintegroFundTarget = revenueMain * REINTEGRO_FUND_PERCENT;

      // 5ª categoría: 8€ por apuesta acertada de 3 números (por defecto)
      // (se ajustará si aplica 8ª.2 al final)
      const winners3 = winnersEffective[3] || 0;
      let pool3 = winners3 * 8;

      // Fondo restante para (especial, 1ª, 2ª, 3ª, 4ª) según % oficiales
      const remainingAfter3 = Math.max(0, categoryFund - pool3);

      // Pools base (antes de rollovers)
      let pool6R = remainingAfter3 * CATEGORY_REMAINING_SPLIT["6R"];
      let pool6 = remainingAfter3 * CATEGORY_REMAINING_SPLIT[6];
      let pool5C = remainingAfter3 * CATEGORY_REMAINING_SPLIT["5C"];
      let pool5 = remainingAfter3 * CATEGORY_REMAINING_SPLIT[5];
      let pool4 = remainingAfter3 * CATEGORY_REMAINING_SPLIT[4];

      /* ============================
         ROLL-OVERS (Normas 8ª.1.1–1.3)
         ============================ */

      const roll = {
        toSpecialNextFromSpecial: 0,
        toSpecialNextFromFirst: 0,
        toThirdFromSecond: 0,
        toFourthFromThird: 0,
        toSpecialNextFromLower: 0,
      };

      const w6R = winnersEffective["6R"] || 0;
      const w6Only = winnersEffective[6] || 0; // “6 sin reintegro” en el modelo
      const w6Total = w6R + w6Only; // 1ª real (incluye especiales)

      const w5C = winnersEffective["5C"] || 0;
      const w5 = winnersEffective[5] || 0;
      const w4 = winnersEffective[4] || 0;

      // 2ª -> 3ª si no hay acertantes
      if (w5C === 0) {
        roll.toThirdFromSecond = pool5C;
        pool5 += pool5C;
        pool5C = 0;
      }

      // 3ª -> 4ª si no hay acertantes
      if (w5 === 0) {
        roll.toFourthFromThird = pool5;
        pool4 += pool5;
        pool5 = 0;
      }

      // Si tampoco hay 4ª, el acumulado pasa a especial siguiente
      let carryToSpecialNext = 0;

      if (w4 === 0) {
        roll.toSpecialNextFromLower = pool4;
        carryToSpecialNext += pool4;
        pool4 = 0;
      }

      // Si no hay 1ª (nadie acierta 6), su fondo pasa a especial siguiente
      if (w6Total === 0) {
        roll.toSpecialNextFromFirst = pool6;
        carryToSpecialNext += pool6;
        pool6 = 0;
      }

      /* ============================
         BOTE (Especial 6R)
         ============================ */

      const jackpotBefore = jackpot;

      // El bote del sorteo = bote acumulado + fondo especial del sorteo
      const jackpotPotThisDrawBase = jackpotBefore + pool6R;

      let jackpotPaidTotal = 0;
      let jackpotAfter = 0;

      if (w6R === 0) {
        // Si no hay especial, se acumula a especial siguiente
        roll.toSpecialNextFromSpecial = jackpotPotThisDrawBase;
        jackpotPaidTotal = 0;
        jackpotAfter = jackpotPotThisDrawBase + carryToSpecialNext;
      } else {
        // Si hay especial, se paga el bote del sorteo y se acumulan carryovers
        jackpotPaidTotal = jackpotPotThisDrawBase;
        jackpotAfter = carryToSpecialNext;
      }

      jackpot = jackpotAfter;

      const jackpotPotThisDraw = jackpotPotThisDrawBase;

      /* ============================
         Regla 8ª.2 (no superar categorías)
         Aplicada a: 1ª,2ª,3ª,4ª,5ª
         ============================ */

      const categories = [
        { key: 6, pool: pool6, winners: w6Total },
        { key: "5C", pool: pool5C, winners: w5C },
        { key: 5, pool: pool5, winners: w5 },
        { key: 4, pool: pool4, winners: w4 },
        { key: 3, pool: pool3, winners: winners3 },
      ];

      const { prizeByKey, poolByKey, winnersByKey } = applyRule8_2(categories);

      // Premios por ganador (categorías)
      const prizeFirst = prizeByKey[6] || 0;
      const prize5C = prizeByKey["5C"] || 0;
      const prize5 = prizeByKey[5] || 0;
      const prize4 = prizeByKey[4] || 0;
      const prize3 = prizeByKey[3] || 0;

      // Reintegro: “importe jugado” (por defecto 1€)
      const prizeR = Number(pricePerBet) || 0;

      // Reintegro “solo”
      const wR = winnersEffective["R"] || 0;
      const reintegroPaidTotal = wR * prizeR;
      const reintegroDelta = reintegroFundTarget - reintegroPaidTotal;

      // Especial por ganador (bote del sorteo / ganadores especial)
      const prizeSpecial = w6R > 0 ? jackpotPotThisDraw / w6R : 0;

      /* ============================
         PREMIO DEL JUGADOR (Norma 40ª)
         - un premio por apuesta
         - excepto especial: cobra 1ª + especial
         ============================ */

      let prize = 0;

      if (playerCategory === "6R") {
        prize = prizeFirst + prizeSpecial;
      } else if (playerCategory === 6) {
        prize = prizeFirst;
      } else if (playerCategory === "5C") {
        prize = prize5C;
      } else if (playerCategory === 5) {
        prize = prize5;
      } else if (playerCategory === 4) {
        prize = prize4;
      } else if (playerCategory === 3) {
        prize = prize3;
      } else if (playerCategory === "R") {
        prize = prizeR;
      }

      /* ============================
         JOKER (jugador)
         ============================ */

      let jokerPrize = 0;
      let jokerHitsCount = 0;

      const playerJoker =
        joker && drawnJoker ? (player?.joker ?? drawJoker()) : null;

      if (joker && playerJoker && drawnJoker) {
        jokerHitsCount = jokerHits(playerJoker, drawnJoker);
        jokerPrize = JOKER_PRIZES[jokerHitsCount] || 0;
      }

      // Costes del jugador (por sorteo)
      const mainPlayerCost = Number(pricePerBet) || 0;
      const jokerPlayerCost = joker ? Number(jokerPrice) || 0 : 0;
      const totalPlayerCost = mainPlayerCost + jokerPlayerCost;

      return {
        draw: {
          numbers: drawnMain,
          complementario: drawnComp,
          reintegro: drawnRein,
          joker: drawnJoker,
        },

        stats: {
          // apuestas e ingresos
          betsMain: betsMainTotal,
          betsMainWorld,
          revenueMain,
          prizePoolPercent,
          prizePool,

          // fondos según norma
          categoryFund,
          reintegroFundTarget,
          reintegroPaidTotal,
          reintegroDelta,

          // joker mundo
          jokerEnabled: jokerActiveWorld,
          jokerBetsWorld,
          revenueJokerWorld,
          jokerShare,

          // totales
          totalRevenueThisDraw,

          // rollovers
          roll,
          carryToSpecialNext,

          // bote especial
          jackpotBefore,
          jackpotPotThisDraw,
          jackpotPaidTotal,
          jackpotAfter,

          // pools finales usados (ya con 8ª.2 aplicada)
          poolsFinal: {
            "6R": pool6R,
            6: poolByKey[6] || 0,
            "5C": poolByKey["5C"] || 0,
            5: poolByKey[5] || 0,
            4: poolByKey[4] || 0,
            3: poolByKey[3] || 0,
            R: 0,
          },

          // premios por ganador
          prizePerWinner: {
            "6R": prizeSpecial,
            6: prizeFirst,
            "5C": prize5C,
            5: prize5,
            4: prize4,
            3: prize3,
            R: prizeR,
          },

          // costes jugador
          mainPlayerCost,
          jokerPlayerCost,
          totalPlayerCost,
        },

        results: {
          player: {
            category: playerCategory,
            prize: Math.round(prize),
            jokerPrize,
            jokerHits: jokerHitsCount,
            jokerPlayed: playerJoker,
          },
          winners: winnersWorld,
          winnersEffective,
        },
      };
    },
  };
}
