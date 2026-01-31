// assets/js/games/lototurf/lototurf.config.js

export const LototurfConfig = {
  id: "lototurf",
  label: "Lototurf",

  accentVar: "--color-lototurf",
  accentText: "#ffffff",

  economy: {
    pricePerDraw: 1.0,
    prizePoolPercent: 0.55,
    drawDays: ["sunday"],

    worldBetsModel: {
      baseByWeekday: { sunday: 950_000 },
      clampMin: 250_000,
      clampMax: 3_500_000,
      jackpotBumpK: 0.0,
      jackpotBumpRef: 500_000,
      noiseSigma: 0.12,
      noiseMin: 0.75,
      noiseMax: 1.28,
    },
  },

  pick: {
    main: { count: 6 },
    horse: { count: 1, scalar: true },
    reintegro: { count: 1, scalar: true, optional: true },
  },

  ranges: {
    numbersMin: 1,
    numbersMax: 31,
    horseMin: 1,
    horseMax: 12,
    reintegroMin: 0,
    reintegroMax: 9,
  },

  // Reintegro: devolución fija (importe jugado)
  reintegroPrize: 1.0,

  // Porcentajes reales (sobre VENTA)
  pools: {
    categoriesPercent: 0.3, // 30% a 7 categorías
    reintegroPercent: 0.1, // 10% a reintegro
    reservePercent: 0.15, // 15% a Fondo de Reserva
  },

  // Distribución real del 30% (porcentajes sobre VENTA, suma 0.30)
  prizeDistribution: {
    "6+horse": 0.06,
    6: 0.07,
    "5+horse": 0.03,
    5: 0.04,
    "4+horse": 0.02,
    4: 0.04,
    "3+horse": 0.04,
  },

  // Fondo mínimo garantizado: 1ª categoría del primer sorteo de cada ciclo
  guaranteedFirstCategory: 1_000_000,

  // Mínimo legal de premio unitario para pagar una categoría
  minPrizePerWinner: 1.5,

  // Caballos participantes en la carrera (norma: si <12, los que faltan se consideran retirados)
  // Esto SOLO afecta a la sustitución del caballo pronosticado y al sorteo del caballo ganador.
  horseParticipantsModel: {
    // Por defecto: casi siempre 12; a veces menos (ejemplo razonable).
    // Si quieres “siempre 12”, pon: { weights: { 12: 1 } }
    weights: {
      12: 0.9,
      11: 0.04,
      10: 0.03,
      9: 0.02,
      8: 0.01,
    },
    min: 1,
    max: 12,
  },

  // Importante: el reintegro es un pago independiente (no “categoría alternativa”)
  reintegroIsAddon: true,
};
