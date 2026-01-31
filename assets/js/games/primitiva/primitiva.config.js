// assets/js/games/primitiva/primitiva.config.js

/**
 * Configuración de La Primitiva
 * Basada en games.json + parámetros del engine
 */

export const PrimitivaConfig = {
  id: "primitiva",
  label: "La Primitiva",

  accentVar: "--color-primitiva",
  accentText: "#ffffff",

  economy: {
    pricePerDraw: 1.0,
    prizePoolPercent: 0.55,
    drawDays: ["monday", "thursday", "saturday"],

    // NUEVO (formal): modelo de participación mundial (apuestas simples estimadas)
    worldBetsModel: {
      // Bases por día (orden de magnitud realista)
      // Puedes ajustar fino cuando compares con resultados reales.
      baseByWeekday: {
        monday: 5_800_000,
        thursday: 11_600_000,
        saturday: 12_300_000,
      },

      // Límites razonables (para evitar valores absurdos)
      clampMin: 3_500_000,
      clampMax: 25_000_000,

      // Efecto bote (suave, logarítmico)
      jackpotBumpK: 0.18,
      jackpotBumpRef: 1_000_000,

      // Ruido (variación natural)
      noiseSigma: 0.1, // ~10%
      noiseMin: 0.8,
      noiseMax: 1.25,
    },
  },

  pick: {
    main: { count: 6, min: 1, max: 49, pad: 2 },
    reintegro: { count: 1, min: 0, max: 9, pad: 1 },
  },

  extras: {
    joker: {
      enabled: true,
      pricePerBet: 1.0,
      accentVar: "--color-joker",
    },
  },

  probabilities: {
    "6R": 1 / 139_838_160,
    6: 1 / 13_983_816,
    "5C": 1 / 2_330_636,
    5: 1 / 55_491,
    4: 1 / 1_032,
    3: 1 / 57,
    R: 1 / 10,
  },

  // Reparto “restante” tras pagar 5ª (3 aciertos) a premio fijo (8€),
  // según normas SELAE 2022 (30/37/6/11/16).
  // Ojo: 3 aciertos NO va por % aquí (es fijo salvo aplicación de 8ª.2).
  prizeDistribution: {
    "6R": 0.3,
    6: 0.37,
    "5C": 0.06,
    5: 0.11,
    4: 0.16,
    3: 0.0,
  },

  jokerPrizes: {
    7: 1_000_000,
    6: 10_000,
    5: 1_000,
    4: 300,
    3: 50,
    2: 5,
    1: 1,
  },
};
