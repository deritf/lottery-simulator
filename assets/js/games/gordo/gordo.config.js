// assets/js/games/gordo/gordo.config.js

export const GordoConfig = {
  id: "gordo",
  label: "El Gordo de la Primitiva",

  pick: {
    main: { count: 5, min: 1, max: 54, pad: 2 },
    clave: { count: 1, min: 0, max: 9, pad: 1 },
  },

  economy: {
    pricePerDraw: 1.5,

    drawDays: [0],

    // 55% a premios (0.55)
    prizePoolPercent: 0.55,

    // Modelo simple de volumen (ajustable)
    worldBetsModel: {
      base: 1_000_000,
      clampMin: 200_000,
      clampMax: 3_000_000,
      jackpotBumpK: 0.22,
      jackpotBumpRef: 4_500_000,
      noiseSigma: 0.12,
      noiseMin: 0.75,
      noiseMax: 1.35,
    },

    // límites operativos
    maxJackpotPot: 60_000_000,
    maxReserveAbs: 200_000_000,
  },

  rules: {
    // Norma 7ª: sobre ventas
    salesToCategoriasPct: 0.45,
    salesToReintegroPct: 0.1,

    // Norma 8ª: dentro del 45% (pero expresado sobre ventas)
    // - 22% ventas: “fondo 1ª” (su reparto real lo gestiona norma 9ª)
    firstFundPctOfSales: 0.22,

    // - 23% ventas: resto categorías, menos 8ª fija
    restFundPctOfSales: 0.23,

    // 8ª: reparto del “fondo obtenido” tras deducir 8ª fija
    restDist: {
      5: 0.33, // 2ª
      "4K": 0.06, // 3ª
      4: 0.07, // 4ª
      "3K": 0.08, // 5ª
      3: 0.26, // 6ª
      "2K": 0.2, // 7ª
    },

    fixedPrize2: 3.0, // 8ª: 2 aciertos (sin clave)
    minGuaranteedFirst: 4_500_000, // 9ª.1
  },
};
