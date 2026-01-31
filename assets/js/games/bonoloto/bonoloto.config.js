// assets/js/games/bonoloto/bonoloto.config.js

/**
 * Configuración de Bonoloto (España) - Normas Junio 2022
 * - 6 números (1-49)
 * - Complementario (1-49, distinto de los 6)
 * - Reintegro (0-9)
 * - Sorteos: todos los días
 *
 * Precio por apuesta y sorteo: 0,50 €
 */

export const BonolotoConfig = {
  id: "bonoloto",
  label: "Bonoloto",

  accentVar: "--color-bonoloto",
  accentText: "#ffffff",

  economy: {
    pricePerDraw: 0.5,

    // Norma 7ª: 55% de la recaudación se destina a premios (45% categorías + 10% reintegro)
    prizePoolPercent: 0.55,

    drawDays: [
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
      "sunday",
    ],

    // Modelo de participación estimada (apuestas simples)
    worldBetsModel: {
      baseByWeekday: {
        monday: 4_800_000,
        tuesday: 4_900_000,
        wednesday: 5_000_000,
        thursday: 5_200_000,
        friday: 6_200_000,
        saturday: 6_800_000,
        sunday: 6_000_000,
      },

      clampMin: 2_000_000,
      clampMax: 12_000_000,

      jackpotBumpK: 0.18,
      jackpotBumpRef: 1_000_000,

      noiseSigma: 0.12,
      noiseMin: 0.75,
      noiseMax: 1.35,
    },

    // Bote acumulado de 1ª (6 aciertos) por falta de acertantes en sorteos previos
    initialJackpot: 0,

    // Límite operativo para evitar explosiones en simulación
    maxJackpot: 20_000_000,
  },

  pick: {
    main: { count: 6, min: 1, max: 49, pad: 2 },
  },

  // Probabilidades (aprox) para estimación de ganadores “mundo”
  probabilities: {
    6: 1 / 13_983_816,
    "5C": 1 / 2_330_636,
    5: 1 / 55_491,
    4: 1 / 1_032,
    3: 1 / 57,
    R: 1 / 10,
  },

  rules: {
    // Norma 7ª: reparto de recaudación
    recaudacionToCategoriasPct: 0.45,
    recaudacionToReintegroPct: 0.1,

    // Norma 8ª.1 (sobre el fondo del 45%, una vez deducida 5ª fija)
    distRestante: {
      6: 0.55,
      "5C": 0.2,
      5: 0.1,
      4: 0.15,
    },

    // Norma 8ª.1: 5ª categoría (3 aciertos) premio fijo
    fixedPrize3: 4.0,

    // Norma 9ª.1: reintegro = importe jugado en cada concurso (aquí 0,50€ por apuesta)
    reintegroPrize: 0.5,
  },
};
