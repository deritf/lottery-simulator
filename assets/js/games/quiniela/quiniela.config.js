// assets/js/games/quiniela/quiniela.config.js

export const QuinielaConfig = {
  id: "quiniela",
  label: "La Quiniela",

  accentVar: "--color-quiniela",
  accentText: "#ffffff",

  economy: {
    pricePerDraw: 0.75, // 0,75€ por bloque/apuesta
    prizePoolPercent: 0.55, // 55% a premios (BOE)

    drawDays: ["sunday"],

    // Modelo de apuestas totales
    worldBetsModel: {
      baseByWeekday: { sunday: 2_200_000 },
      clampMin: 600_000,
      clampMax: 8_000_000,
      jackpotBumpK: 0.1,
      jackpotBumpRef: 1_000_000,
      noiseSigma: 0.1,
      noiseMin: 0.8,
      noiseMax: 1.25,
    },
  },

  // Pool de equipos para generar jornadas aleatorias
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
    "Granada",
    "Cádiz",
    "Levante",
    "Eibar",
    "Elche",
    "Tenerife",
    "Sporting de Gijón",
    "Real Oviedo",
    "Zaragoza",
    "Almería",
    "Huesca",
    "Burgos",
    "Racing de Santander",
    "Málaga",
    "Deportivo La Coruña",

    // Inglaterra
    "Manchester City",
    "Manchester United",
    "Liverpool",
    "Arsenal",
    "Chelsea",
    "Tottenham",
    "Newcastle",
    "Aston Villa",
    "West Ham",
    "Brighton",

    // Italia
    "Inter de Milán",
    "AC Milan",
    "Juventus",
    "Napoli",
    "Roma",
    "Lazio",
    "Atalanta",
    "Fiorentina",

    // Alemania
    "Bayern Múnich",
    "Borussia Dortmund",
    "RB Leipzig",
    "Bayer Leverkusen",
    "Eintracht Frankfurt",

    // Francia
    "PSG",
    "Olympique de Marsella",
    "Lyon",
    "Mónaco",
    "Lille",

    // Portugal
    "Benfica",
    "Porto",
    "Sporting de Portugal",
    "Braga",

    // Países Bajos
    "Ajax",
    "PSV",
    "Feyenoord",

    // Otros europeos conocidos
    "Celtic",
    "Rangers",
    "Galatasaray",
    "Fenerbahçe",
    "Shakhtar Donetsk",
  ],

  // Fallback (por si no hay pool o prefieres fijar una jornada)
  matches: [
    "Inter de Milán - Arsenal",
    "Villarreal - Ajax",
    "Tottenham - Borussia Dortmund",
    "Sporting de Portugal - PSG",
    "Olympiacos - Bayer Leverkusen",
    "Copenhague - Nápoles",
    "Galatasaray - At. Madrid",
    "Atalanta - Athletic Club",
    "Juventus - Benfica",
    "Slavia Praga - Barcelona",
    "Marsella - Liverpool",
    "Newcastle - PSV",
    "Paok - Betis",
    "Celta - Lille",
  ],
  pleno15: "Real Madrid - Mónaco",

  // Probabilidades “1 entre X”
  probabilities: {
    pleno15: 1 / 76_527_504,
    14: 1 / 4_782_969,
    13: 1 / 170_820,
    12: 1 / 13_140,
    11: 1 / 1_643,
    10: 1 / 299,
  },

  // Reparto interno del pool (55%) para UI/debug
  // % sobre recaudación: pleno15 10%, 14 12%, 13/12/11 8%, 10 9% (total 55%)
  // Aquí lo expresamos como fracción del pool (55%):
  // pleno15: 10/55, 14: 12/55, 13: 8/55, 12: 8/55, 11: 8/55, 10: 9/55
  prizeDistribution: {
    pleno15: 10 / 55,
    14: 12 / 55,
    13: 8 / 55,
    12: 8 / 55,
    11: 8 / 55,
    10: 9 / 55,
  },

  // Modelo simple para generar signos 1/X/2
  outcomeModel: {
    pHome: 0.46,
    pDraw: 0.26,
    pAway: 0.28,
  },

  // Modelo simple para generar goles del pleno (para 0/1/2/M)
  goalsModel: {
    p0: 0.26,
    p1: 0.3,
    p2: 0.22,
    pM: 0.22,
  },
};
