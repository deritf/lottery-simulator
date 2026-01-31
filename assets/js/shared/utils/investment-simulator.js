/*
===============================================================================
COMENTARIO EXPLICATIVO
===============================================================================

Este archivo genera series temporales mensuales para comparar:

1) Lotería (saldo neto acumulado: premios - gasto)
2) Fondos indexados (valor acumulado si en vez de jugar se invirtiera lo gastado)

La idea clave es: cada mes se “aporta” el dinero gastado en sorteos y, sobre ese
capital, se aplica un rendimiento mensual (histórico o simulado). El resultado
final es una curva por fondo que puedes pintar en la gráfica.

-------------------------------------------------------------------------------
1) ENTRADA PRINCIPAL: buildInvestmentSeries(...)
-------------------------------------------------------------------------------

buildInvestmentSeries recibe:
- draws: array de sorteos simulados (cada uno con date y prize)
- pricePerDraw: coste por sorteo (incluye Joker si procede)
- scenarioSeed: semilla del escenario (misma semilla => misma trayectoria)
- options: opciones globales del simulador (calendario continuo, jitter, etc.)
- funds: configuración de cada fondo (tipo, JSON histórico, parámetros, etc.)

Devuelve:
{
  labels: ["01/2026", "02/2026", ...],  // eje X mensual
  series: [
    { name: "Lotería (neto)", data: [...] },
    { name: "MSCI World...",  data: [...] },
    ...
  ]
}

-------------------------------------------------------------------------------
2) PRNG (AZAR REPETIBLE): mulberry32 + mixSeed
-------------------------------------------------------------------------------

La simulación usa un generador pseudoaleatorio determinista:
- mulberry32(seed) devuelve una función rng() que da números en [0,1).
- mixSeed(...) mezcla la semilla del escenario (scenarioSeed) con la semilla
  propia de cada fondo (f.seed), el índice y el nombre del fondo.

Resultado: cada simulación nueva tiene trayectorias distintas, pero si mantienes
scenarioSeed (por ejemplo al “añadir años”) la trayectoria sigue coherente.

-------------------------------------------------------------------------------
3) CALENDARIO MENSUAL CONTINUO (MEJORA IMPORTANTE)
-------------------------------------------------------------------------------

Antes: si solo había sorteos ciertos meses, el fondo solo “crecía” esos meses.
Ahora: se construye un calendario mensual continuo entre el primer y último mes
de los sorteos (options.continuousMonths = true por defecto).

- monthMap agrupa el gasto y los premios por mes:
  monthMap["2026-01"] = { spent: X, won: Y }

- Si un mes no tiene sorteos, se rellena con:
  { spent: 0, won: 0 }

Esto hace que el fondo aplique rendimientos todos los meses, que es lo realista
(en bolsa no “se para” porque tú no juegues ese mes).

-------------------------------------------------------------------------------
4) SERIE DE LOTERÍA (BASE DE COMPARACIÓN)
-------------------------------------------------------------------------------

Se calcula el neto acumulado mes a mes:
- cumNet += won - spent
- lottery.push(cumNet)

Así tienes una curva que normalmente baja con el gasto, y sube puntualmente si
hay premios.

-------------------------------------------------------------------------------
5) CARGA DE HISTÓRICOS (JSON) + CACHE
-------------------------------------------------------------------------------

Cada fondo “historical_regime” apunta a un JSON (historicalUrl) con retornos
mensuales. ensureDataset(url):
- Si no está en cache: lanza fetch y marca status="loading"
- Si llega bien: status="ready" y emite evento "investment:datasetLoaded"
- Si falla: status="error" y emite evento "investment:datasetError"

Importante:
- Si el JSON aún está cargando, NO se usa fallback sintético “por accidente”.
  En su lugar, la serie del fondo se devuelve como [null, null, ...] para que
  la UI espere. Cuando llegue el evento datasetLoaded, tu UI recalcula y ya
  aparecen los datos reales.

-------------------------------------------------------------------------------
6) DOS MODOS DE FONDO
-------------------------------------------------------------------------------

A) Fondo histórico con regímenes (type="historical_regime")
   - Usa histórico real mientras haya datos (k <= lastHistKey)
   - Para meses futuros (más allá del histórico) genera retornos con un modelo
     Markov sencillo basado en regímenes.

B) Fondo sintético (fallback)
   - Si no hay histórico y no está cargando, simula retornos con una Normal
     (media y volatilidad anuales => mensuales) usando Box-Muller.

-------------------------------------------------------------------------------
7) PREPROCESADO: winsorización + hardClamp (control de extremos)
-------------------------------------------------------------------------------

Antes de construir el modelo Markov, se “limpia” la lista de retornos históricos:

preprocessReturns:
- windowMonths: solo usa la ventana más reciente (ej. 180 meses)
- winsorLow / winsorHigh: recorta extremos estadísticos (por cuantiles)
- hardClamp: límite duro mensual (ej. ±0.08 => ±8% mensual)

Objetivo: evitar que meses extremos (raros) dominen el modelo y produzcan
crecimientos irreales cuando se compone durante décadas.

-------------------------------------------------------------------------------
8) MODELO DE REGÍMENES (MARKOV): crisis / normal / rally
-------------------------------------------------------------------------------

buildRegimeModel divide los retornos en 3 regímenes:
- 0 = “crisis”   (retornos <= cuantil qLow)
- 1 = “normal”   (entre qLow y qHigh)
- 2 = “rally”    (>= cuantil qHigh)

Luego:
- Construye una matriz de transición trans[regimeActual][regimeSiguiente]
  contando cómo se pasa de un régimen al siguiente en el histórico.
- Aplica smoothing para no tener probabilidades 0 duras.
- Aplica “anti-rally”: limita la persistencia del rally (maxRallyPersistence)
  para evitar rachas alcistas eternas que explotan el compuesto.

Para simular el futuro:
- Se elige el siguiente régimen con weightedPickIndex según trans
- Se extrae un retorno al azar de la “bolsa” de retornos de ese régimen (pools)

Esto es más realista que una Normal simple, porque conserva “rachas” y
“cambios de clima” de mercado, pero con frenos.

-------------------------------------------------------------------------------
9) FASES PLANAS (LATERALIDAD) EN EL FUTURO
-------------------------------------------------------------------------------

buildFlatPhasePlanner introduce periodos donde el mercado está lateral:
- Cada cierto número de meses (minGapMonths..maxGapMonths) inicia una fase plana
- Dura (minDurationMonths..maxDurationMonths)
- En fase plana, el retorno se clampa a ±flatClamp (muy pequeño)

Esto mete “años aburridos” típicos de mercado, y reduce la tendencia a curvas
demasiado exponenciales en el largo plazo.

-------------------------------------------------------------------------------
10) BIAS FUTURO Y MICRO-RUIDO (JITTER)
-------------------------------------------------------------------------------

En el FUTURO, además del retorno del régimen:
- futureBias: fricción negativa mensual (ej. -0.0012) para representar costes,
  menor prima futura, etc.
- futureJitter (opcional): un ruido muy pequeño tipo Normal (std ~0.002) para
  que no quede una simulación “demasiado encorsetada” por los pools.

Después de todo, siempre se aplica un clamp final hardClamp.

-------------------------------------------------------------------------------
11) ACUMULACIÓN DEL VALOR DEL FONDO (LO MÁS IMPORTANTE)
-------------------------------------------------------------------------------

Para cada mes k:
1) value += spent  (aportación mensual: lo que se gastó en lotería ese mes)
2) Se decide r (retorno mensual):
   - Si hay histórico para ese mes: r = retorno real
   - Si es futuro: r = retorno simulado (Markov + fases planas + bias + clamp)
3) value *= (1 + r)  (capitaliza el rendimiento mensual)
4) data.push(value)

Así la curva del fondo representa el valor de haber invertido, mes a mes,
exactamente lo que se gastó en lotería.

-------------------------------------------------------------------------------
12) POR QUÉ ES “DIFERENTE” ENTRE FONDOS
-------------------------------------------------------------------------------

Cada fondo tiene parámetros propios:
- hardClamp / winsor / qLow qHigh / maxRallyPersistence / flat planner / bias
porque no todos los históricos son igual de “representativos”.
Ejemplo: MSCI World solo desde 2010 => periodo muy alcista => se endurecen
controles para no sobreestimar el futuro.

-------------------------------------------------------------------------------
MODIFICACIÓN (Enero 2026): CALIBRACIÓN DEL DRIFT (anti-dominancia a 1000 años)
-------------------------------------------------------------------------------

Para evitar que un índice (p.ej. S&P 500) domine por una pequeñísima ventaja de
retorno medio a muy largo plazo, se introduce:

- geomMeanMonthly(...) para estimar la media geométrica mensual del material
  histórico (procesado) que alimenta el modelo.
- targetAnnualReturn (opción global) => objetivo común a largo plazo.
- autoBias = targetMonthly - histGeom => sesgo futuro que alinea el drift.

Con options.useAutoBias=true (por defecto), el sesgo futuro fijo (f.futureBias)
pasa a ser opcional, y el futuro converge a un retorno esperado similar entre
fondos. Así se mantienen diferencias a 10-50 años, pero se evita “explosión”
injusta a 500-1000 años.

===============================================================================
*/

// assets/js/shared/utils/investment-simulator.js

// ==================
// PRNG DETERMINISTA
// ==================
function mulberry32(seed) {
  let t = seed >>> 0;
  return function () {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

// =======================
// HASH Y MEZCLA DE SEEDS
// =======================
function hash32(str) {
  let h = 0x811c9dc5;
  const s = String(str ?? "");
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function mixSeed(...parts) {
  let x = 0;
  for (const p of parts) {
    const v = Number.isFinite(Number(p)) ? Number(p) >>> 0 : hash32(String(p));
    x ^= v;
    x = Math.imul(x, 0x9e3779b1) >>> 0;
    x ^= x >>> 16;
  }
  return x >>> 0 || 1;
}

// ===========
// UTILIDADES
// ===========
function toMonthKey(d) {
  const dt = d instanceof Date ? d : new Date(d);
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function monthLabelFromKey(key) {
  const [y, m] = key.split("-");
  return `${m}/${y}`;
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

function weightedPickIndex(rng, weights) {
  let sum = 0;
  for (const w of weights) sum += Math.max(0, w || 0);
  if (sum <= 0) return 0;

  let x = rng() * sum;
  for (let i = 0; i < weights.length; i++) {
    x -= Math.max(0, weights[i] || 0);
    if (x <= 0) return i;
  }
  return weights.length - 1;
}

function randomInt(rng, a, b) {
  const lo = Math.min(a, b);
  const hi = Math.max(a, b);
  return lo + Math.floor(rng() * (hi - lo + 1));
}

function buildContinuousMonthKeys(minKey, maxKey) {
  if (!minKey || !maxKey) return [];
  const [y0, m0] = minKey.split("-").map(Number);
  const [y1, m1] = maxKey.split("-").map(Number);

  let y = y0;
  let m = m0;

  const out = [];
  while (y < y1 || (y === y1 && m <= m1)) {
    out.push(`${y}-${String(m).padStart(2, "0")}`);
    m += 1;
    if (m === 13) {
      m = 1;
      y += 1;
    }
  }
  return out;
}

// ====================================================================
// DRIFT: media geométrica mensual + conversión anual->mensual
// ====================================================================
function geomMeanMonthly(rs) {
  const xs = (rs || []).map(Number).filter(Number.isFinite);
  if (!xs.length) return 0;

  let sumLog = 0;
  let n = 0;

  for (const r of xs) {
    const x = 1 + r;
    if (x <= 0) continue;
    sumLog += Math.log(x);
    n += 1;
  }

  if (!n) return 0;
  return Math.exp(sumLog / n) - 1;
}

function annualToMonthly(a) {
  const A = Number(a);
  if (!Number.isFinite(A)) return 0;
  return Math.pow(1 + A, 1 / 12) - 1;
}

// ==================
// CACHE DE DATASETS
// ==================
const DATASET_CACHE = new Map();

function normalizeHistoricalArray(raw) {
  if (Array.isArray(raw)) {
    return raw
      .map((x) => ({
        m: String(x.m || x.month || ""),
        r: Number(x.r ?? x.return),
      }))
      .filter((x) => x.m && Number.isFinite(x.r));
  }

  const arr = raw?.returns;
  if (Array.isArray(arr)) {
    return arr
      .map((x) => ({
        m: String(x.month || x.m || ""),
        r: Number(x.r ?? x.return),
      }))
      .filter((x) => x.m && Number.isFinite(x.r));
  }

  return [];
}

function ensureDataset(url) {
  if (!url) return null;

  const cached = DATASET_CACHE.get(url);
  if (cached?.status === "ready") return cached.data;
  if (cached?.status === "loading") return null;

  DATASET_CACHE.set(url, { status: "loading", data: null, error: null });

  fetch(url, { cache: "no-store" })
    .then((r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    })
    .then((json) => {
      DATASET_CACHE.set(url, { status: "ready", data: json, error: null });
      window.dispatchEvent(
        new CustomEvent("investment:datasetLoaded", { detail: { url } }),
      );
    })
    .catch((err) => {
      const msg = String(err?.message || err);
      DATASET_CACHE.set(url, { status: "error", data: null, error: msg });
      window.dispatchEvent(
        new CustomEvent("investment:datasetError", {
          detail: { url, error: msg },
        }),
      );
    });

  return null;
}

function getDatasetStatus(url) {
  if (!url) return { status: "none" };
  return DATASET_CACHE.get(url) || { status: "none" };
}

// =============
// ESTADÍSTICAS
// =============
function quantileSorted(sorted, p) {
  if (!sorted.length) return 0;
  const idx = clamp(Math.round((sorted.length - 1) * p), 0, sorted.length - 1);
  return sorted[idx];
}

// ============================
// PREPROCESAMIENTO DE RETORNOS
// ============================
function preprocessReturns(rawReturns, opts = {}) {
  const {
    windowMonths = 180,
    winsorLow = 0.05,
    winsorHigh = 0.95,
    hardClamp = 0.12,
  } = opts;

  const rs0 = (Array.isArray(rawReturns) ? rawReturns : [])
    .map((x) => Number(x))
    .filter(Number.isFinite);

  const rs =
    windowMonths && rs0.length > windowMonths
      ? rs0.slice(rs0.length - windowMonths)
      : rs0.slice();

  if (rs.length < 24) return rs;

  const sorted = rs.slice().sort((a, b) => a - b);
  const lo = quantileSorted(sorted, winsorLow);
  const hi = quantileSorted(sorted, winsorHigh);

  return rs.map((r) => clamp(clamp(r, lo, hi), -hardClamp, hardClamp));
}

// ============================
// MODELO DE REGÍMENES (MARKOV)
// ============================
function buildRegimeModel(processedReturns, opts = {}) {
  const {
    qLow = 0.2,
    qHigh = 0.8,
    smoothing = 1,
    maxRallyPersistence = 0.55,
  } = opts;

  const rs = (Array.isArray(processedReturns) ? processedReturns : [])
    .map((x) => Number(x))
    .filter(Number.isFinite);

  if (rs.length < 24) {
    return {
      ok: false,
      reason: "Not enough historical returns",
      classify: () => 1,
      trans: [
        [1, 0, 0],
        [0, 1, 0],
        [0, 0, 1],
      ],
      pools: [[], rs.slice(), []],
      startRegime: 1,
    };
  }

  const sorted = rs.slice().sort((a, b) => a - b);
  const low = quantileSorted(sorted, qLow);
  const high = quantileSorted(sorted, qHigh);

  const classify = (r) => (r <= low ? 0 : r >= high ? 2 : 1);
  const regimes = rs.map(classify);

  const pools = [[], [], []];
  for (let i = 0; i < rs.length; i++) pools[regimes[i]].push(rs[i]);

  const counts = [
    [smoothing, smoothing, smoothing],
    [smoothing, smoothing, smoothing],
    [smoothing, smoothing, smoothing],
  ];

  for (let i = 1; i < regimes.length; i++) {
    counts[regimes[i - 1]][regimes[i]] += 1;
  }

  const trans = counts.map((row) => {
    const s = row.reduce((a, b) => a + b, 0);
    return row.map((v) => v / (s || 1));
  });

  if (
    trans[2] &&
    Number.isFinite(trans[2][2]) &&
    trans[2][2] > maxRallyPersistence
  ) {
    const row = trans[2].slice();
    const oldStay = row[2];
    const newStay = maxRallyPersistence;

    const excess = oldStay - newStay;
    row[2] = newStay;

    const otherSum = (row[0] || 0) + (row[1] || 0);
    if (otherSum > 0) {
      row[0] = row[0] + excess * (row[0] / otherSum);
      row[1] = row[1] + excess * (row[1] / otherSum);
    } else {
      row[1] = row[1] + excess;
    }

    const s = row.reduce((a, b) => a + b, 0) || 1;
    trans[2] = row.map((v) => v / s);
  }

  const startRegime = regimes[regimes.length - 1] ?? 1;

  return { ok: true, classify, trans, pools, startRegime };
}

function drawReturnFromRegime(rng, pools, regime) {
  const pool = pools?.[regime] || [];
  if (!pool.length) {
    const normal = pools?.[1] || [];
    if (normal.length) return normal[Math.floor(rng() * normal.length)];
    const any = (pools?.[0] || []).concat(pools?.[2] || []);
    if (any.length) return any[Math.floor(rng() * any.length)];
    return 0;
  }
  return pool[Math.floor(rng() * pool.length)];
}

// ==========================
// FASES PLANAS (LATERALIDAD)
// ==========================
function buildFlatPhasePlanner(rng, opts = {}) {
  const {
    minGapMonths = 96,
    maxGapMonths = 144,
    minDurationMonths = 24,
    maxDurationMonths = 36,
    flatClamp = 0.01,
  } = opts;

  let nextStart = randomInt(rng, minGapMonths, maxGapMonths);
  let remaining = 0;

  function step(monthIndex) {
    if (remaining > 0) {
      remaining -= 1;
      return { isFlat: true, flatClamp };
    }

    if (monthIndex >= nextStart) {
      remaining = randomInt(rng, minDurationMonths, maxDurationMonths);
      nextStart = monthIndex + randomInt(rng, minGapMonths, maxGapMonths);
      remaining -= 1;
      return { isFlat: true, flatClamp };
    }

    return { isFlat: false, flatClamp };
  }

  return { step };
}

// ==========================
// SERIE SINTÉTICA (FALLBACK)
// ==========================
function buildSyntheticSeries(
  name,
  monthKeys,
  monthMap,
  rng,
  annualMean,
  annualVol,
) {
  const muM = annualMean / 12;
  const volM = annualVol / Math.sqrt(12);

  let value = 0;
  const data = [];

  for (const k of monthKeys) {
    const { spent } = monthMap.get(k) || { spent: 0 };

    value += spent;

    const u1 = Math.max(1e-9, rng());
    const u2 = rng();
    const z = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);

    const r = muM + volM * z;
    value *= 1 + r;

    data.push(round2(value));
  }

  return { name, data, meta: { synthetic: true } };
}

// =================================================
// FUNCIÓN PRINCIPAL: CONSTRUIR SERIES DE INVERSIÓN
// =================================================
export function buildInvestmentSeries({
  draws,
  pricePerDraw,
  scenarioSeed,

  options = {
    continuousMonths: true,
    applyHistoricalHardClamp: false,
    useFutureJitter: true,
    futureJitterStd: 0.002,

    useAutoBias: true,
    targetAnnualReturn: 0.065,
  },

  funds = [
    {
      name: "MSCI World Net EUR (histórico)",
      type: "historical_regime",
      seed: 101,
      historicalUrl:
        "assets/data/funds/msci_world_net_eur_monthly_returns.json",
      preprocess: {
        windowMonths: 180,
        winsorLow: 0.1,
        winsorHigh: 0.9,
        hardClamp: 0.08,
      },
      regime: {
        qLow: 0.25,
        qHigh: 0.75,
        smoothing: 1,
        maxRallyPersistence: 0.45,
      },
      flat: {
        minGapMonths: 72,
        maxGapMonths: 120,
        minDurationMonths: 30,
        maxDurationMonths: 42,
        flatClamp: 0.008,
      },
      futureBias: -0.0015,
      fallback: { annualMean: 0.065, annualVol: 0.16 },
    },
    {
      name: "S&P 500 (histórico)",
      type: "historical_regime",
      seed: 202,
      historicalUrl: "assets/data/funds/spx_monthly_hedged_eur_returns.json",
      preprocess: {
        windowMonths: 180,
        winsorLow: 0.05,
        winsorHigh: 0.95,
        hardClamp: 0.09,
      },
      regime: { qLow: 0.2, qHigh: 0.8, smoothing: 1, maxRallyPersistence: 0.5 },
      flat: {
        minGapMonths: 96,
        maxGapMonths: 144,
        minDurationMonths: 24,
        maxDurationMonths: 36,
        flatClamp: 0.01,
      },
      futureBias: -0.0012,
      fallback: { annualMean: 0.075, annualVol: 0.18 },
    },
    {
      name: "STOXX Europe 600 Net EUR (histórico)",
      type: "historical_regime",
      seed: 505,
      historicalUrl:
        "assets/data/funds/stoxx_europe_600_net_eur_monthly_returns.json",
      preprocess: {
        windowMonths: 180,
        winsorLow: 0.05,
        winsorHigh: 0.95,
        hardClamp: 0.12,
      },
      regime: {
        qLow: 0.2,
        qHigh: 0.8,
        smoothing: 1,
        maxRallyPersistence: 0.55,
      },
      flat: {
        minGapMonths: 96,
        maxGapMonths: 144,
        minDurationMonths: 24,
        maxDurationMonths: 36,
        flatClamp: 0.01,
      },
      futureBias: -0.0008,
      fallback: { annualMean: 0.06, annualVol: 0.16 },
    },
    {
      name: "Euro Stoxx 50 (histórico)",
      type: "historical_regime",
      seed: 303,
      historicalUrl: "assets/data/funds/eurostoxx50_monthly_returns.json",
      preprocess: {
        windowMonths: 180,
        winsorLow: 0.05,
        winsorHigh: 0.95,
        hardClamp: 0.12,
      },
      regime: {
        qLow: 0.2,
        qHigh: 0.8,
        smoothing: 1,
        maxRallyPersistence: 0.55,
      },
      flat: {
        minGapMonths: 96,
        maxGapMonths: 144,
        minDurationMonths: 24,
        maxDurationMonths: 36,
        flatClamp: 0.01,
      },
      futureBias: -0.0008,
      fallback: { annualMean: 0.055, annualVol: 0.2 },
    },
    {
      name: "IBEX 35 TR (histórico)",
      type: "historical_regime",
      seed: 404,
      historicalUrl: "assets/data/funds/ibextr_monthly_returns.json",
      preprocess: {
        windowMonths: 180,
        winsorLow: 0.05,
        winsorHigh: 0.95,
        hardClamp: 0.12,
      },
      regime: {
        qLow: 0.2,
        qHigh: 0.8,
        smoothing: 1,
        maxRallyPersistence: 0.55,
      },
      flat: {
        minGapMonths: 96,
        maxGapMonths: 144,
        minDurationMonths: 24,
        maxDurationMonths: 36,
        flatClamp: 0.01,
      },
      futureBias: -0.0008,
      fallback: { annualMean: 0.055, annualVol: 0.22 },
    },
  ],
} = {}) {
  const safeDraws = Array.isArray(draws) ? draws : [];
  const p = Number(pricePerDraw) || 0;

  if (!safeDraws.length || !p) return { labels: [], series: [] };

  const monthMap = new Map();
  for (const d of safeDraws) {
    const key = toMonthKey(d.date);
    const prev = monthMap.get(key) || { spent: 0, won: 0 };
    prev.spent += p;
    prev.won += Number(d.prize) || 0;
    monthMap.set(key, prev);
  }

  const observedKeys = Array.from(monthMap.keys()).sort();
  const minKey = observedKeys[0];
  const maxKey = observedKeys[observedKeys.length - 1];

  const monthKeys =
    options?.continuousMonths === false
      ? observedKeys.slice()
      : buildContinuousMonthKeys(minKey, maxKey);

  if (options?.continuousMonths !== false) {
    for (const k of monthKeys) {
      if (!monthMap.has(k)) monthMap.set(k, { spent: 0, won: 0 });
    }
  }

  const labels = monthKeys.map(monthLabelFromKey);

  const lottery = [];
  let cumNet = 0;
  for (const k of monthKeys) {
    const { spent, won } = monthMap.get(k);
    cumNet += won - spent;
    lottery.push(round2(cumNet));
  }

  const baseScenarioSeed =
    Number.isFinite(Number(scenarioSeed)) && Number(scenarioSeed) !== 0
      ? Number(scenarioSeed) >>> 0
      : 1;

  const fundSeries = (funds || []).map((f, idx) => {
    const fundSeed = mixSeed(
      baseScenarioSeed,
      f?.seed ?? 0,
      idx,
      f?.name ?? "",
    );
    const rng = mulberry32(fundSeed);

    if (f.type === "historical_regime") {
      let histArr = [];

      if (Array.isArray(f.historical)) {
        histArr = normalizeHistoricalArray(f.historical);
      } else if (f.historicalUrl) {
        const ds = ensureDataset(f.historicalUrl);
        histArr = ds ? normalizeHistoricalArray(ds) : [];
      }

      if (!histArr.length && f.historicalUrl) {
        const st = getDatasetStatus(f.historicalUrl);
        if (st.status === "loading" || st.status === "none") {
          return {
            name: f.name,
            data: monthKeys.map(() => null),
            meta: { pendingDataset: true, url: f.historicalUrl },
          };
        }
      }

      if (!histArr.length) {
        const annualMean = Number(f.fallback?.annualMean ?? 0);
        const annualVol = Number(f.fallback?.annualVol ?? 0);
        return buildSyntheticSeries(
          f.name,
          monthKeys,
          monthMap,
          rng,
          annualMean,
          annualVol,
        );
      }

      histArr.sort((a, b) => String(a.m).localeCompare(String(b.m)));

      const histMap = new Map(histArr.map((x) => [String(x.m), Number(x.r)]));
      const lastHistKey = histArr.length
        ? String(histArr[histArr.length - 1].m)
        : null;

      const rawHistReturns = histArr
        .map((x) => Number(x.r))
        .filter(Number.isFinite);
      const processedForModel = preprocessReturns(rawHistReturns, f.preprocess);
      const model = buildRegimeModel(processedForModel, f.regime);

      const targetAnnual = Number(options?.targetAnnualReturn ?? 0.065);
      const targetMonthly = annualToMonthly(targetAnnual);
      const histGeom = geomMeanMonthly(processedForModel);
      const autoBias = targetMonthly - histGeom;
      const useAutoBias = options?.useAutoBias !== false;

      const flatPlanner = buildFlatPhasePlanner(rng, f.flat);

      const applyHistClamp = !!options?.applyHistoricalHardClamp;
      const useJitter = options?.useFutureJitter !== false;
      const jitterStd = Number(options?.futureJitterStd ?? 0);

      let value = 0;
      const data = [];
      let currentRegime = model.startRegime ?? 1;
      let futureMonthIndex = 0;

      for (const k of monthKeys) {
        const { spent } = monthMap.get(k) || { spent: 0 };

        value += spent;

        let r;

        if (lastHistKey && k <= lastHistKey && histMap.has(k)) {
          r = histMap.get(k);

          if (applyHistClamp) {
            const hard = Number(f.preprocess?.hardClamp ?? 0.12);
            if (Number.isFinite(hard) && hard > 0) r = clamp(r, -hard, hard);
          }

          if (model.ok) currentRegime = model.classify(r);
        } else {
          const flatState = flatPlanner.step(futureMonthIndex);
          futureMonthIndex += 1;

          const probs = model.trans?.[currentRegime] || [0.2, 0.6, 0.2];
          currentRegime = weightedPickIndex(rng, probs);

          r = drawReturnFromRegime(rng, model.pools, currentRegime);

          if (useJitter && Number.isFinite(jitterStd) && jitterStd > 0) {
            const u1 = Math.max(1e-9, rng());
            const u2 = rng();
            const z =
              Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
            r = r + jitterStd * z;
          }

          if (flatState.isFlat) {
            const fc = Number(flatState.flatClamp) || 0.01;
            r = clamp(r, -fc, fc);
          }

          const bias = useAutoBias ? autoBias : Number(f.futureBias ?? 0);
          if (Number.isFinite(bias) && bias !== 0) r = r + bias;

          const hard = Number(f.preprocess?.hardClamp ?? 0.12);
          if (Number.isFinite(hard) && hard > 0) r = clamp(r, -hard, hard);
        }

        value *= 1 + (Number.isFinite(r) ? r : 0);
        data.push(round2(value));
      }

      return {
        name: f.name,
        data,
        meta: {
          synthetic: false,
          drift: {
            targetAnnual,
            targetMonthly,
            histGeomMonthly: histGeom,
            autoBiasMonthly: autoBias,
            useAutoBias,
          },
        },
      };
    }

    return buildSyntheticSeries(
      f.name,
      monthKeys,
      monthMap,
      rng,
      Number(f.annualMean ?? 0),
      Number(f.annualVol ?? 0),
    );
  });

  return {
    labels,
    series: [{ name: "Lotería (neto)", data: lottery }, ...fundSeries],
  };
}
