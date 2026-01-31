// assets/js/games/loterianacional/loterianacional.engine.js

import { LoteriaNacionalConfig } from "./loterianacional.config.js";

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function clampInt(n, min, max) {
  const x = Math.round(Number(n) || 0);
  return Math.max(min, Math.min(max, x));
}

function pickDigits(count) {
  const out = [];
  for (let i = 0; i < count; i++) out.push(randInt(0, 9));
  return out;
}

function digitsToNumberString(digits) {
  return (digits || []).map((d) => String(Number(d))).join("");
}

function suffixMatch(a, b, len) {
  const sa = String(a).padStart(5, "0");
  const sb = String(b).padStart(5, "0");
  return sa.slice(-len) === sb.slice(-len);
}

function prefixMatch(a, b, len) {
  const sa = String(a).padStart(5, "0");
  const sb = String(b).padStart(5, "0");
  return sa.slice(0, len) === sb.slice(0, len);
}

function poissonish(lambda, noiseMin = 0.92, noiseMax = 1.08) {
  const l = Math.max(0, Number(lambda) || 0);
  if (l === 0) return 0;
  const noise = noiseMin + Math.random() * (noiseMax - noiseMin);
  return Math.max(0, Math.round(l * noise));
}

function uniqueNumberStrings(count, excludeSet = new Set()) {
  const set = new Set();
  let guard = 0;
  while (set.size < count && guard++ < 5_000_000) {
    const s = String(randInt(0, 99999)).padStart(5, "0");
    if (excludeSet.has(s)) continue;
    set.add(s);
  }
  return Array.from(set);
}

function uniqueSuffixes(len, count, excludeSet = new Set()) {
  const set = new Set();
  let guard = 0;
  while (set.size < count && guard++ < 1_000_000) {
    const s = String(randInt(0, 10 ** len - 1)).padStart(len, "0");
    if (excludeSet.has(s)) continue;
    set.add(s);
  }
  return Array.from(set);
}

function buildReintegrosFromWin1(win1) {
  const last = String(win1).padStart(5, "0").slice(-1);
  const reinSet = new Set([last]);
  while (reinSet.size < 3) reinSet.add(String(randInt(0, 9)));
  return Array.from(reinSet);
}

export function createLoteriaNacionalEngine(config = LoteriaNacionalConfig) {
  const PRICES = config?.pricesByDrawType || {};
  const PRIZES = config?.prizesByDrawType || {};

  function isOrdinary(dt) {
    return dt === "jueves" || dt === "sabado";
  }

  function prizeTablePerDecimo(dt, pricePerDecimo) {
    const def = PRIZES[dt] || PRIZES.navidad || {};

    const first = Number(def.first) || 0;
    const second = Number(def.second) || 0;
    const third = Number(def.third) || 0;

    // JUEVES / SÁBADO (modelo terminaciones 4/3/2 + reintegro)
    if (isOrdinary(dt)) {
      const mult = dt === "sabado" ? 2 : 1;
      return {
        gordo: 30_000 * mult,
        segundo: 6_000 * mult,

        ln_last_4: 75 * mult,
        ln_last_3: 15 * mult,
        ln_last_2: 6 * mult,

        // reintegro
        last_1: Number(pricePerDecimo) || 0,

        tercero: 0,
        cuartos: 0,
        quintos: 0,
        pedreas: 0,
        approx_gordo: 0,
        approx_gordo_nino: 0,
        approx_2: 0,
        approx_3: 0,
        centenas: 0,
        last_2: 0,
        last_2_segundo: 0,
        last_2_tercero: 0,
      };
    }

    // EL NIÑO (estructura típica)
    if (dt === "nino") {
      return {
        gordo: first,
        segundo: second,
        tercero: third,

        // extracciones normalizadas para i18n
        ln_extract_4: 350,
        ln_extract_3: 100,
        ln_extract_2: 40,

        // aproximaciones
        approx_gordo_nino: 1200,
        approx_2: 610,
        approx_3: 0,

        // centenas (primeras 3 cifras de 1º/2º/3º)
        centenas: 100,

        // reintegro (devuelve el precio del décimo)
        last_1: Number(pricePerDecimo) || 0,

        // no aplican aquí
        cuartos: 0,
        quintos: 0,
        pedreas: 0,
        ln_last_4: 0,
        ln_last_3: 0,
        ln_last_2: 0,
        last_2: 0,
        last_2_segundo: 0,
        last_2_tercero: 0,

        // compat
        approx_gordo: 0,
      };
    }

    // NAVIDAD (estructura típica)
    const cuartos = 20_000;
    const quintos = 6_000;
    const pedrea = 100;

    return {
      gordo: first,
      segundo: second,
      tercero: third,

      cuartos,
      quintos,
      pedreas: pedrea,

      approx_gordo: 2_000,
      approx_2: 1_250,
      approx_3: 960,

      centenas: 100,

      // terminaciones 2 últimas cifras de 1º/2º/3º
      last_2: 100,
      last_2_segundo: 100,
      last_2_tercero: 100,

      // reintegro
      last_1: Number(pricePerDecimo) || 0,

      // no se usan en navidad
      ln_last_4: 0,
      ln_last_3: 0,
      ln_last_2: 0,

      // no aplica en navidad
      ln_extract_4: 0,
      ln_extract_3: 0,
      ln_extract_2: 0,
      approx_gordo_nino: 0,
    };
  }

  function computePlayerKeyOrdinary(
    yourNum,
    win1,
    win2,
    ends4,
    ends3,
    ends2,
    reintegros,
  ) {
    if (yourNum.length !== 5 || win1.length !== 5) return null;

    if (yourNum === win1) return "gordo";
    if (win2 && yourNum === win2) return "segundo";

    if (Array.isArray(ends4) && ends4.some((e) => suffixMatch(yourNum, e, 4)))
      return "ln_last_4";
    if (Array.isArray(ends3) && ends3.some((e) => suffixMatch(yourNum, e, 3)))
      return "ln_last_3";
    if (Array.isArray(ends2) && ends2.some((e) => suffixMatch(yourNum, e, 2)))
      return "ln_last_2";

    const last = yourNum.slice(-1);
    if (Array.isArray(reintegros) && reintegros.includes(last)) return "last_1";

    return null;
  }

  function computePlayerKeyNino(
    yourNum,
    win1,
    win2,
    win3,
    ext4,
    ext3,
    ext2,
    reintegros,
  ) {
    if (yourNum.length !== 5) return null;

    if (yourNum === win1) return "gordo";
    if (yourNum === win2) return "segundo";
    if (yourNum === win3) return "tercero";

    const n1 = Number(win1);
    if (Number.isFinite(n1)) {
      const prev = String(n1 - 1).padStart(5, "0");
      const next = String(n1 + 1).padStart(5, "0");
      if (yourNum === prev || yourNum === next) return "approx_gordo_nino";
    }

    const n2 = Number(win2);
    if (Number.isFinite(n2)) {
      const prev = String(n2 - 1).padStart(5, "0");
      const next = String(n2 + 1).padStart(5, "0");
      if (yourNum === prev || yourNum === next) return "approx_2";
    }

    if (
      prefixMatch(yourNum, win1, 3) ||
      prefixMatch(yourNum, win2, 3) ||
      prefixMatch(yourNum, win3, 3)
    ) {
      return "centenas";
    }

    if (Array.isArray(ext4) && ext4.some((s) => suffixMatch(yourNum, s, 4)))
      return "ln_extract_4";
    if (Array.isArray(ext3) && ext3.some((s) => suffixMatch(yourNum, s, 3)))
      return "ln_extract_3";
    if (Array.isArray(ext2) && ext2.some((s) => suffixMatch(yourNum, s, 2)))
      return "ln_extract_2";

    // reintegro
    const last = yourNum.slice(-1);
    if (Array.isArray(reintegros) && reintegros.includes(last)) return "last_1";

    return null;
  }

  function computePlayerKeyNavidad(
    yourNum,
    win1,
    win2,
    win3,
    cuartos,
    quintos,
    pedreas,
    reintegros,
  ) {
    if (yourNum.length !== 5) return null;

    if (yourNum === win1) return "gordo";
    if (yourNum === win2) return "segundo";
    if (yourNum === win3) return "tercero";

    if (Array.isArray(cuartos) && cuartos.includes(yourNum)) return "cuartos";
    if (Array.isArray(quintos) && quintos.includes(yourNum)) return "quintos";

    // aproximaciones (±1) a 1º/2º/3º
    const n1 = Number(win1);
    if (Number.isFinite(n1)) {
      const prev = String(n1 - 1).padStart(5, "0");
      const next = String(n1 + 1).padStart(5, "0");
      if (yourNum === prev || yourNum === next) return "approx_gordo";
    }

    const n2 = Number(win2);
    if (Number.isFinite(n2)) {
      const prev = String(n2 - 1).padStart(5, "0");
      const next = String(n2 + 1).padStart(5, "0");
      if (yourNum === prev || yourNum === next) return "approx_2";
    }

    const n3 = Number(win3);
    if (Number.isFinite(n3)) {
      const prev = String(n3 - 1).padStart(5, "0");
      const next = String(n3 + 1).padStart(5, "0");
      if (yourNum === prev || yourNum === next) return "approx_3";
    }

    // centenas (primeras 3 cifras)
    if (
      prefixMatch(yourNum, win1, 3) ||
      prefixMatch(yourNum, win2, 3) ||
      prefixMatch(yourNum, win3, 3)
    ) {
      return "centenas";
    }

    // 2 últimas cifras (para 1º/2º/3º)
    if (suffixMatch(yourNum, win1, 2)) return "last_2";
    if (suffixMatch(yourNum, win2, 2)) return "last_2_segundo";
    if (suffixMatch(yourNum, win3, 2)) return "last_2_tercero";

    // pedrea
    if (Array.isArray(pedreas) && pedreas.includes(yourNum)) return "pedreas";

    // reintegro
    const last = yourNum.slice(-1);
    if (Array.isArray(reintegros) && reintegros.includes(last)) return "last_1";

    return null;
  }

  function labelForPlayerKey(dt, key) {
    if (!key) return null;

    if (isOrdinary(dt)) {
      return key === "gordo"
        ? "Primer premio"
        : key === "segundo"
          ? "Segundo premio"
          : key === "ln_last_4"
            ? "Últimas 4 cifras"
            : key === "ln_last_3"
              ? "Últimas 3 cifras"
              : key === "ln_last_2"
                ? "Últimas 2 cifras"
                : "Reintegro";
    }

    if (dt === "nino") {
      return key === "gordo"
        ? "Primer premio"
        : key === "segundo"
          ? "Segundo premio"
          : key === "tercero"
            ? "Tercer premio"
            : key === "approx_gordo_nino"
              ? "Aprox. 1º premio (±1)"
              : key === "approx_2"
                ? "Aprox. 2º premio (±1)"
                : key === "centenas"
                  ? "Centenas (1º/2º/3º)"
                  : key === "ln_extract_4"
                    ? "Extracción 4 cifras"
                    : key === "ln_extract_3"
                      ? "Extracción 3 cifras"
                      : key === "ln_extract_2"
                        ? "Extracción 2 cifras"
                        : "Reintegro";
    }

    // navidad
    return key === "gordo"
      ? "El Gordo"
      : key === "segundo"
        ? "Segundo premio"
        : key === "tercero"
          ? "Tercer premio"
          : key === "cuartos"
            ? "Cuarto premio"
            : key === "quintos"
              ? "Quinto premio"
              : key === "approx_gordo"
                ? "Aprox. Gordo (±1)"
                : key === "approx_2"
                  ? "Aprox. 2º (±1)"
                  : key === "approx_3"
                    ? "Aprox. 3º (±1)"
                    : key === "centenas"
                      ? "Centenas (1º/2º/3º)"
                      : key === "last_2"
                        ? "2 últimas cifras (1º)"
                        : key === "last_2_segundo"
                          ? "2 últimas cifras (2º)"
                          : key === "last_2_tercero"
                            ? "2 últimas cifras (3º)"
                            : key === "pedreas"
                              ? "Pedrea"
                              : "Reintegro";
  }

  return {
    runDraw({
      player,
      drawDate = null,
      drawType = "navidad",
      decimos = 1,
    } = {}) {
      const dt = String(drawType || "navidad");
      const dec = clampInt(decimos, 1, 10);

      const pricePerDecimo =
        Number(PRICES[dt]) || Number(config?.economy?.pricePerDraw) || 0;

      // ---- Premio jugador: número elegido ----
      const yourDigits = Array.isArray(player?.digits) ? player.digits : [];
      const yourNum = digitsToNumberString(yourDigits).padStart(5, "0");

      // ---- Sorteo: generar premios según modalidad ----
      let win1Digits = pickDigits(5);
      let win1 = digitsToNumberString(win1Digits).padStart(5, "0");

      // Evitar extremos raros para aproximaciones (00000 / 99999)
      if (dt === "navidad" || dt === "nino") {
        const w1n = Number(win1);
        if (w1n <= 0 || w1n >= 99999) {
          win1Digits = pickDigits(5);
          win1 = digitsToNumberString(win1Digits).padStart(5, "0");
        }
      }

      let win2 = null;
      let win2Digits = null;

      let win3 = null;

      let cuartos = [];
      let quintos = [];
      let pedreas = [];

      let ends4 = [];
      let ends3 = [];
      let ends2 = [];

      let ext4 = [];
      let ext3 = [];
      let ext2 = [];

      // Para excluir duplicados
      const reserved = new Set([win1]);

      if (isOrdinary(dt)) {
        // 2º premio (distinto)
        do {
          win2Digits = pickDigits(5);
          win2 = digitsToNumberString(win2Digits).padStart(5, "0");
        } while (win2 === win1);

        // Terminaciones (evitar que coincidan con 1º/2º)
        const ex4 = new Set([win1.slice(-4), win2.slice(-4)]);
        const ex3 = new Set([win1.slice(-3), win2.slice(-3)]);
        const ex2 = new Set([win1.slice(-2), win2.slice(-2)]);

        ends4 = uniqueSuffixes(4, 4, ex4);
        ends3 = uniqueSuffixes(3, dt === "sabado" ? 10 : 7, ex3);
        ends2 = uniqueSuffixes(2, 9, ex2);
      } else if (dt === "nino") {
        // 2º y 3º premios (distintos)
        do {
          win2 = String(randInt(0, 99999)).padStart(5, "0");
        } while (reserved.has(win2));
        reserved.add(win2);

        do {
          win3 = String(randInt(0, 99999)).padStart(5, "0");
        } while (reserved.has(win3));
        reserved.add(win3);

        // Extracciones
        ext4 = uniqueSuffixes(
          4,
          2,
          new Set([win1.slice(-4), win2.slice(-4), win3.slice(-4)]),
        );
        ext3 = uniqueSuffixes(
          3,
          14,
          new Set([win1.slice(-3), win2.slice(-3), win3.slice(-3)]),
        );
        ext2 = uniqueSuffixes(
          2,
          5,
          new Set([win1.slice(-2), win2.slice(-2), win3.slice(-2)]),
        );
      } else {
        // NAVIDAD
        do {
          win2 = String(randInt(0, 99999)).padStart(5, "0");
        } while (reserved.has(win2));
        reserved.add(win2);

        do {
          win3 = String(randInt(0, 99999)).padStart(5, "0");
        } while (reserved.has(win3));
        reserved.add(win3);

        // 2 cuartos
        cuartos = uniqueNumberStrings(2, reserved);
        cuartos.forEach((x) => reserved.add(x));

        // 8 quintos
        quintos = uniqueNumberStrings(8, reserved);
        quintos.forEach((x) => reserved.add(x));

        // 1794 pedreas
        pedreas = uniqueNumberStrings(1794, reserved);
      }

      // Reintegros: siempre incluye último dígito del 1º premio
      const reintegros = buildReintegrosFromWin1(win1);

      // ---- Mundo (ventas) ----
      const worldDecimos =
        dt === "navidad"
          ? randInt(30_000_000, 80_000_000)
          : dt === "nino"
            ? randInt(8_000_000, 25_000_000)
            : dt === "sabado"
              ? randInt(3_000_000, 12_000_000)
              : randInt(1_500_000, 9_000_000);

      const revenueMain = worldDecimos * pricePerDecimo;

      // ---- Tablas de premio ----
      const prizePerDec = prizeTablePerDecimo(dt, pricePerDecimo);

      // ---- Resolver premio jugador ----
      let playerKey = null;

      if (yourNum.length === 5) {
        if (isOrdinary(dt)) {
          playerKey = computePlayerKeyOrdinary(
            yourNum,
            win1,
            win2,
            ends4,
            ends3,
            ends2,
            reintegros,
          );
        } else if (dt === "nino") {
          playerKey = computePlayerKeyNino(
            yourNum,
            win1,
            win2,
            win3,
            ext4,
            ext3,
            ext2,
            reintegros,
          );
        } else {
          playerKey = computePlayerKeyNavidad(
            yourNum,
            win1,
            win2,
            win3,
            cuartos,
            quintos,
            pedreas,
            reintegros,
          );
        }
      }

      const prizePerDecimoWon = playerKey
        ? Number(prizePerDec[playerKey]) || 0
        : 0;

      const categoryLabel = labelForPlayerKey(dt, playerKey);
      const totalPrize = prizePerDecimoWon * dec;

      // ---- Ganadores mundo ----
      const winnersWorld = {};
      const p = {};

      if (isOrdinary(dt)) {
        p.gordo = 1 / 100000;
        p.segundo = 1 / 100000;
        p.ln_last_4 = 4 / 10000;
        p.ln_last_3 = (dt === "sabado" ? 10 : 7) / 1000;
        p.ln_last_2 = 9 / 100;
        p.last_1 = 3 / 10;
      } else if (dt === "nino") {
        p.gordo = 1 / 100000;
        p.segundo = 1 / 100000;
        p.tercero = 1 / 100000;
        p.ln_extract_4 = 2 / 10000;
        p.ln_extract_3 = 14 / 1000;
        p.ln_extract_2 = 5 / 100;
        p.approx_gordo_nino = 2 / 100000;
        p.approx_2 = 2 / 100000;
        p.centenas = (3 * 100) / 100000;
        p.last_1 = 3 / 10;
      } else {
        // navidad
        p.gordo = 1 / 100000;
        p.segundo = 1 / 100000;
        p.tercero = 1 / 100000;
        p.cuartos = 2 / 100000;
        p.quintos = 8 / 100000;
        p.pedreas = 1794 / 100000;
        p.approx_gordo = 2 / 100000;
        p.approx_2 = 2 / 100000;
        p.approx_3 = 2 / 100000;
        p.centenas = (3 * 100) / 100000;
        p.last_2 = 1 / 100;
        p.last_2_segundo = 1 / 100;
        p.last_2_tercero = 1 / 100;
        p.last_1 = 3 / 10;
      }

      const allKeys = [
        "gordo",
        "segundo",

        // ordinary
        "ln_last_4",
        "ln_last_3",
        "ln_last_2",

        // reintegro
        "last_1",

        // niño
        "tercero",
        "ln_extract_4",
        "ln_extract_3",
        "ln_extract_2",
        "approx_gordo_nino",

        // navidad
        "cuartos",
        "quintos",
        "pedreas",
        "approx_gordo",
        "approx_2",
        "approx_3",
        "centenas",
        "last_2",
        "last_2_segundo",
        "last_2_tercero",
      ];

      allKeys.forEach((k) => {
        winnersWorld[k] = p[k] ? poissonish(worldDecimos * p[k]) : 0;
      });

      // ---- Estructuras para modal ----
      const winnersEffective = {};
      const prizePerWinner = {};
      const payoutsTotal = {};

      allKeys.forEach((k) => {
        const world = Number(winnersWorld[k]) || 0;
        const youWins = playerKey === k ? dec : 0;

        winnersEffective[k] = world + youWins;
        prizePerWinner[k] = Number(prizePerDec[k]) || 0;
        payoutsTotal[k] = prizePerWinner[k] * winnersEffective[k];
      });

      const prizePoolPercent = Number(config?.economy?.prizePoolPercent) || 0;
      const prizePool = revenueMain * prizePoolPercent;

      // ---- draw payload (compatibilidad) ----
      return {
        draw: {
          numbers: win1Digits,
          secondNumbers: win2Digits || null,

          // ordinario
          endings4: ends4,
          endings3: ends3,
          endings2: ends2,

          // niño
          extractions4: ext4,
          extractions3: ext3,
          extractions2: ext2,

          // navidad
          win1,
          win2,
          win3,
          cuartos,
          quintos,
          pedreas,

          reintegros,
        },

        stats: {
          drawDate,
          drawType: dt,
          decimos: dec,
          pricePerDecimo,

          betsMain: worldDecimos,
          revenueMain,
          prizePoolPercent,
          prizePool,
          totalRevenueThisDraw: revenueMain,

          winnersEffective,
          prizePerWinner,
          payoutsTotal,

          prizePerDecimoWon,
          playerKey,
          win1,
          win2,
        },

        results: {
          player: {
            categoryKey: playerKey,

            category: categoryLabel,
            prize: totalPrize,
          },
          winners: winnersWorld,
          winnersEffective,
        },
      };
    },
  };
}
