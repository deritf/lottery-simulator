// assets/js/games/quinigol/quinigol.config.js

export const QuinigolConfig = {
  id: "quinigol",
  label: "El Quinigol",

  accentVar: "--color-quinigol",
  accentText: "#ffffff",

  economy: {
    pricePerDraw: 1.0,
    prizePoolPercent: 0.55,
    drawDays: ["thursday", "sunday"],

    worldBetsModel: {
      baseByWeekday: {
        thursday: 450_000,
        sunday: 700_000,
      },
      clampMin: 150_000,
      clampMax: 6_000_000,
      jackpotBumpK: 0.1,
      jackpotBumpRef: 1_000_000,
      noiseSigma: 0.14,
      noiseMin: 0.7,
      noiseMax: 1.35,
    },
  },

  teams: [
    "Real Madrid",
    "Barcelona",
    "Atlético de Madrid",
    "Athletic Club",
    "Real Sociedad",
    "Villarreal",
    "Valencia",
    "Betis",
    "Sevilla",
    "Celta",
    "Osasuna",
    "Getafe",
    "Mallorca",
    "Las Palmas",
    "Girona",
    "Alavés",
    "Rayo Vallecano",
    "Espanyol",
    "Leganés",
    "Valladolid",
    "Liverpool",
    "Manchester City",
    "Arsenal",
    "Chelsea",
    "Tottenham",
    "Inter de Milán",
    "Juventus",
    "AC Milan",
    "Napoli",
    "Roma",
    "Bayern Múnich",
    "Borussia Dortmund",
    "PSG",
    "Lyon",
    "Mónaco",
    "Benfica",
    "Porto",
    "Ajax",
    "PSV",
  ],

  matches: [
    "Inter de Milán - Arsenal",
    "Villarreal - Ajax",
    "Tottenham - Borussia Dortmund",
    "Sporting de Portugal - PSG",
    "Marsella - Liverpool",
    "Newcastle - PSV",
  ],

  pick: {
    matches: {
      count: 6,
      scalar: false,
    },
  },

  tokens: ["0", "1", "2", "M"],

  prizeDistributionOnRevenue: {
    6: 0.1,
    5: 0.09,
    4: 0.08,
    3: 0.08,
    2: 0.2,
  },

  probabilities: {
    6: 1 / 16_777_216,
    5: 1 / 186_413,
    4: 1 / 4_971,
    3: 1 / 248,
    2: 1 / 22,
  },

  rollover: {
    jackpotCategory: 6,
    minPrizeToPay: 1.0,
  },
};
