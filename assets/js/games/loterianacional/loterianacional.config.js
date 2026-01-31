// assets/js/games/loterianacional/loterianacional.config.js

export const LoteriaNacionalConfig = {
  id: "loteria-nacional",
  label: "Lotería Nacional",

  accentVar: "--color-loteria-nacional",
  accentText: null,

  economy: {
    pricePerDraw: 20,
    prizePoolPercent: 0.7,
    drawDays: ["thursday"],

    worldBetsModel: {
      baseByWeekday: { thursday: 8_000_000 },
      clampMin: 1_000_000,
      clampMax: 30_000_000,
      jackpotBumpK: 0.0,
      jackpotBumpRef: 1,
      noiseSigma: 0.2,
      noiseMin: 0.6,
      noiseMax: 1.5,
    },

    initialJackpot: 0,
    maxJackpot: 0,
  },

  pick: {
    main: { count: 5, min: 0, max: 9, pad: 1, label: "Cifras" },
    decimos: { count: 1, scalar: true, min: 1, max: 10, label: "Décimos" },
    drawType: {
      count: 1,
      scalar: true,
      label: "Sorteo",
      values: ["navidad", "nino", "jueves", "sabado"],
    },
  },

  pricesByDrawType: {
    jueves: 3,
    sabado: 6,
    navidad: 20,
    nino: 20,
  },

  prizesByDrawType: {
    navidad: { first: 400_000, second: 125_000, third: 50_000 },
    nino: { first: 200_000, second: 75_000, third: 25_000 },

    jueves: { first: 30_000, second: 6_000 },
    sabado: { first: 60_000, second: 12_000 },
  },
};
