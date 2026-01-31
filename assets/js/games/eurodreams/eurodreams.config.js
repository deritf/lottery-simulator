// assets/js/games/eurodreams/eurodreams.config.js

export const EurodreamsConfig = {
  id: "eurodreams",
  label: "EuroDreams",

  accentVar: "--color-eurodreams",
  accentText: "#ffffff",

  economy: {
    pricePerDraw: 2.5,
    prizePoolPercent: 0.52,
    drawDays: ["monday", "thursday"],

    worldBetsModel: {
      baseByWeekday: {
        monday: 4_200_000,
        thursday: 6_000_000,
      },
      clampMin: 2_000_000,
      clampMax: 14_000_000,
      jackpotBumpK: 0.12,
      jackpotBumpRef: 1_000_000,
      noiseSigma: 0.09,
      noiseMin: 0.82,
      noiseMax: 1.22,
    },
  },

  pick: {
    main: { count: 6, min: 1, max: 40, pad: 2 },
    dream: { count: 1, min: 1, max: 5, pad: 1 },
  },

  probabilities: {
    "6+1": 1 / 19_191_900,
    "6+0": 1 / 4_797_975,
    5: 1 / 18_816,
    4: 1 / 456,
    3: 1 / 32,
    2: 1 / 6,
  },

  prizeDistribution: {
    "6+1": 0.3,
    "6+0": 0.14,
    5: 0.22,
    4: 0.18,
    3: 0.1,
    2: 0.06,
  },
};
