// assets/js/games/euromillones/euromillones.config.js

/**
 * Configuración de Euromillones (España)
 * Sorteo: 5 números (1-50) + 2 estrellas (1-12)
 *
 * España:
 * - Precio total: 2,50€ (incluye juego asociado “El Millón” de 0,30€)
 * - El Millón es automático (no se elige)
 */

export const EuromillonesConfig = {
  id: "euromillones",
  label: "Euromillones",

  accentVar: "--color-euromillones",
  accentText: "#ffffff",

  economy: {
    pricePerDraw: 2.5,

    // Norma 8ª.1: 50% de la recaudación a fondo de premios
    prizePoolPercent: 0.5,

    drawDays: ["tuesday", "friday"],

    worldBetsModel: {
      baseByWeekday: {
        tuesday: 45_000_000,
        friday: 65_000_000,
      },
      clampMin: 25_000_000,
      clampMax: 120_000_000,
      jackpotBumpK: 0.35,
      jackpotBumpRef: 10_000_000,
      noiseSigma: 0.12,
      noiseMin: 0.75,
      noiseMax: 1.35,
    },

    initialJackpot: 17_000_000,

    // Tope dinámico (Normas: 200M → +10M por ciclo → máx 250M)
    jackpotCap: {
      start: 200_000_000,
      step: 10_000_000,
      max: 250_000_000,
    },
  },

  pick: {
    main: { count: 5, min: 1, max: 50, pad: 2, label: "Números" },
    stars: { count: 2, min: 1, max: 12, pad: 2, label: "Estrellas" },
  },

  extras: {
    // El Millón
    millon: {
      enabled: true,
      automatic: true,
      pricePerBet: 0,
      prize: 1_000_000,
      spainShare: 0.12,
    },
  },

  // Probabilidades por categoría (aprox estándar) para estimar ganadores “mundo”
  probabilities: {
    "5+2": 1 / 139_838_160,
    "5+1": 1 / 6_991_908,
    "5+0": 1 / 3_107_515,
    "4+2": 1 / 621_503,
    "4+1": 1 / 31_075,
    "3+2": 1 / 14_125,
    "4+0": 1 / 13_811,
    "2+2": 1 / 985,
    "3+1": 1 / 706,
    "3+0": 1 / 314,
    "1+2": 1 / 188,
    "2+1": 1 / 49,
    "2+0": 1 / 22,
  },

  // Norma 8ª.1: porcentajes OFICIALES del fondo de premios (no de recaudación)
  // 1ª (5+2) depende del nº de sorteo en el ciclo: 50% o 42% (se calcula en engine)
  // Fondo de Reserva: 10% o 18% (se calcula en engine)
  fixedCategoryPercents: {
    "5+1": 2.61,
    "5+0": 0.61,
    "4+2": 0.19,
    "4+1": 0.35,
    "3+2": 0.37,
    "4+0": 0.26,
    "2+2": 1.3,
    "3+1": 1.45,
    "3+0": 2.7,
    "1+2": 3.27,
    "2+1": 10.3,
    "2+0": 16.59,
  },

  categoryOrder: [
    "5+2",
    "5+1",
    "5+0",
    "4+2",
    "4+1",
    "3+2",
    "4+0",
    "2+2",
    "3+1",
    "3+0",
    "1+2",
    "2+1",
    "2+0",
  ],

  categoryLabels: {
    "5+2": "1ª Categoría (5+2)",
    "5+1": "2ª Categoría (5+1)",
    "5+0": "3ª Categoría (5+0)",
    "4+2": "4ª Categoría (4+2)",
    "4+1": "5ª Categoría (4+1)",
    "3+2": "6ª Categoría (3+2)",
    "4+0": "7ª Categoría (4+0)",
    "2+2": "8ª Categoría (2+2)",
    "3+1": "9ª Categoría (3+1)",
    "3+0": "10ª Categoría (3+0)",
    "1+2": "11ª Categoría (1+2)",
    "2+1": "12ª Categoría (2+1)",
    "2+0": "13ª Categoría (2+0)",
  },
};
