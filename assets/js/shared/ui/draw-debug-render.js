// assets/js/shared/ui/draw-debug-render.js
// Render + lógica de cálculo del modal de detalle del sorteo

import { formatCurrency, padNumber } from "../utils/format.js";
import { getCategoryRows } from "./draw-debug-categories.js";
import {
  fmtListWithMatches,
  fmtListWithMatchesPlusComplementario,
  fmtReintegro,
  fmtMoney,
  fmtInt,
  fmtPct,
  num,
  escapeHtml,
  getByPath,
  row,
  sumRow,
  iconSvg,
  mutedNote,
  normalizeDigits,
  helpHotspot,
} from "./draw-debug-helpers.js";

import { computePrizeSplit, getPrizeLabels } from "./draw-debug-prize-split.js";

/* ===========================
   HELPERS · COMPARTIDOS
   =========================== */

function firstVal(...vals) {
  for (const v of vals) {
    if (v !== null && v !== undefined && v !== "") return v;
  }
  return null;
}

function moneyToneClass(v) {
  const n = num(v);
  if (n > 0) return "ddm__pos";
  if (n < 0) return "ddm__neg";
  return "ddm__zero";
}

function moneySpan(v, html) {
  return `<span class="ddm__money ${moneyToneClass(v)}">${html}</span>`;
}

/* ===========================
   FISCALIDAD (España) · Gravamen especial loterías
   - Exento (habitual): 40.000 €
   - Retención: 20% sobre el exceso
   - Nota: si apuesta < 0,50 €, el exento se reduce proporcionalmente (no siempre aplica)
   =========================== */

/**
 * Devuelve un objeto “completo” para poder reutilizarlo tanto en:
 * - Card de fiscalidad (necesita exempt, taxable, tax, net)
 * - Tabla por categorías (necesita tax, net)
 */
function computeSpainLotteryTax(grossPrize, opts = {}) {
  const rate = Number.isFinite(Number(opts.rate)) ? Number(opts.rate) : 0.2;
  const baseExempt = Number.isFinite(Number(opts.exempt))
    ? Number(opts.exempt)
    : 40000;

  const g = Math.max(0, num(grossPrize));
  const exempt = Math.max(0, baseExempt);
  const taxable = Math.max(0, g - exempt);
  const tax = taxable * rate;
  const net = Math.max(0, g - tax);

  return { gross: g, exempt, taxable, tax, net, rate };
}

// Heurística simple por categoría/juego.
// Si más adelante quieres afinar por tipo de apuesta o extras, lo centralizamos aquí.
function spainExemptByRow(gameId, rowObj) {
  const label = String(rowObj?.label || "").toLowerCase();
  const key = String(rowObj?.key || "").toLowerCase();

  const isRefundLike =
    key.includes("reintegro") ||
    label.includes("reintegro") ||
    key.includes("refund") ||
    label.includes("refund") ||
    label.includes("devol");

  if (isRefundLike) return 0;

  // El Millón (si aparece como fila/categoría)
  if (
    gameId === "euromillones" &&
    (key.includes("millon") || label.includes("millón"))
  ) {
    return 24000;
  }

  return 40000;
}

/* ===========================
   Joker helpers (premio = prefijo/sufijo consecutivo)
   =========================== */

function jokerPrefixLen(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b)) return 0;
  if (a.length !== 7 || b.length !== 7) return 0;
  let len = 0;
  for (let i = 0; i < 7; i++) {
    if (Number(a[i]) === Number(b[i])) len++;
    else break;
  }
  return len;
}

function jokerSuffixLen(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b)) return 0;
  if (a.length !== 7 || b.length !== 7) return 0;
  let len = 0;
  for (let i = 6; i >= 0; i--) {
    if (Number(a[i]) === Number(b[i])) len++;
    else break;
  }
  return len;
}

// Devuelve {mask, len, mode} donde mode = "prefix"|"suffix"|null
// En tu engine Joker premia desde 1 cifra (1€), no desde 2.
function jokerWinningMask(yourDigits, drawnDigits) {
  const empty = {
    mask: [false, false, false, false, false, false, false],
    len: 0,
    mode: null,
  };
  if (!Array.isArray(yourDigits) || !Array.isArray(drawnDigits)) return empty;
  if (yourDigits.length !== 7 || drawnDigits.length !== 7) return empty;

  const p = jokerPrefixLen(yourDigits, drawnDigits);
  const s = jokerSuffixLen(yourDigits, drawnDigits);

  const bestLen = Math.max(p, s);

  // Mínimo premiable = 1 cifra
  if (bestLen < 1) return empty;

  // Si empatan, preferimos prefijo
  const mode = p >= s ? "prefix" : "suffix";

  const mask = [false, false, false, false, false, false, false];
  if (mode === "prefix") {
    for (let i = 0; i < bestLen; i++) mask[i] = true;
  } else {
    for (let i = 6; i > 6 - bestLen; i--) mask[i] = true;
  }

  return { mask, len: bestLen, mode };
}

function renderJokerDigits(digits, mask) {
  if (!Array.isArray(digits) || digits.length !== 7) return "—";
  const m = Array.isArray(mask) && mask.length === 7 ? mask : null;

  // Usamos "number" para que se vea como en combinaciones (píldoras separadas)
  return digits
    .map((d, i) => {
      const hit = m ? Boolean(m[i]) : false;
      const cls = hit ? "number ddm__hit" : "number";
      return `<span class="${cls}">${escapeHtml(String(Number(d)))}</span>`;
    })
    .join(" ");
}

function renderCodeAsNumberPills(code) {
  const s = String(code ?? "").trim();
  if (!s) return "—";

  // separa letras y números, y los pinta como "píldoras" separadas por espacios
  return s
    .split("")
    .map((ch) => `<span class="number">${escapeHtml(ch)}</span>`)
    .join(" ");
}

/* ===========================
   Card lateral Joker / El Millón
   =========================== */

function renderAddonCard(draw, t, lang, locale, gameId, extra = {}) {
  const stats = draw?.stats || {};
  const isPrimitiva = gameId === "primitiva";
  const isEuro = gameId === "euromillones";

  // Joker: leer muchas rutas posibles (incluye engine)
  const yourJokerRaw = firstVal(
    getByPath(draw, "your.jokerDigits"),
    getByPath(draw, "your.joker.digits"),
    getByPath(draw, "your.joker"),
    getByPath(draw, "your.jokerNumber"),
    getByPath(draw, "your.jokerCode"),
    getByPath(stats, "yourJokerDigits"),
    getByPath(stats, "yourJoker"),
    getByPath(stats, "joker.your"),
    getByPath(stats, "joker.yourDigits"),
    getByPath(stats, "joker.yourCode"),
    getByPath(draw, "picks.joker"),
    getByPath(draw, "picks.jokerDigits"),
    getByPath(draw, "results.player.jokerPlayed"),
  );

  const drawnJokerRaw = firstVal(
    getByPath(draw, "drawn.jokerDigits"),
    getByPath(draw, "drawn.joker.digits"),
    getByPath(draw, "drawn.joker"),
    getByPath(draw, "drawn.jokerNumber"),
    getByPath(draw, "drawn.jokerCode"),
    getByPath(stats, "drawnJokerDigits"),
    getByPath(stats, "drawnJoker"),
    getByPath(stats, "joker.drawn"),
    getByPath(stats, "joker.drawnDigits"),
    getByPath(stats, "joker.drawnCode"),
    getByPath(draw, "results.joker"),
    getByPath(draw, "results.jokerDigits"),
    getByPath(draw, "draw.joker"),
  );

  const yourJokerDigits = normalizeDigits(yourJokerRaw);
  const drawnJokerDigits = normalizeDigits(drawnJokerRaw);

  const jokerEnabled =
    Boolean(stats?.jokerEnabled) ||
    Boolean(yourJokerDigits || drawnJokerDigits);

  const jokerPrizeThisDraw = num(extra?.jokerPrizeThisDraw);
  const jokerShare = num(extra?.jokerShare);
  const jokerNetThisDraw = num(extra?.jokerNetThisDraw);

  // PRIMITIVA: Joker card con Aciertos
  if (isPrimitiva && jokerEnabled && (yourJokerDigits || drawnJokerDigits)) {
    const L_YOUR = lang === "en" ? "Your Joker" : "Tu Joker";
    const L_DRAWN = lang === "en" ? "Drawn Joker" : "Joker sorteado";
    const L_HITS = lang === "en" ? "Hits" : "Aciertos";
    const L_COST = lang === "en" ? "Joker cost" : "Coste Joker";
    const L_PRIZE = lang === "en" ? "Joker prize" : "Premio Joker";
    const L_NET = lang === "en" ? "Joker net" : "Balance Joker";

    const { mask: winMask, len: winLen } = jokerWinningMask(
      yourJokerDigits,
      drawnJokerDigits,
    );

    // Resaltado “real”: solo el tramo consecutivo que da premio (>=1)
    const yourHtml = renderJokerDigits(yourJokerDigits, winMask);
    const drawnHtml = renderJokerDigits(drawnJokerDigits, winMask);

    // Aciertos Joker: ahora también cuenta 1 cifra
    const hits = winLen >= 1 ? winLen : 0;

    const costHtml = moneySpan(
      -Math.abs(jokerShare),
      fmtMoney(jokerShare, locale),
    );
    const prizeHtml = moneySpan(
      jokerPrizeThisDraw,
      fmtMoney(jokerPrizeThisDraw, locale),
    );
    const netHtml = moneySpan(
      jokerNetThisDraw,
      fmtMoney(jokerNetThisDraw, locale),
    );

    return `
      <div class="ddm__card">
        <h4>${escapeHtml("Joker")}</h4>

        ${row(
          escapeHtml(L_YOUR),
          `<span class="ddm__digits">${yourHtml || "—"}</span>`,
        )}
        ${row(
          escapeHtml(L_DRAWN),
          `<span class="ddm__digits">${drawnHtml || "—"}</span>`,
        )}

        ${row(
          escapeHtml(L_HITS),
          `<span class="ddm__highlight">${escapeHtml(String(hits))}</span>`,
        )}

        <div class="ddm__dividerTop"></div>

        ${row(escapeHtml(L_COST), `<strong>${costHtml}</strong>`)}
        ${row(escapeHtml(L_PRIZE), `<strong>${prizeHtml}</strong>`)}
        ${row(escapeHtml(L_NET), `<strong>${netHtml}</strong>`)}
      </div>
    `;
  }

  // El Millón (Euromillones)
  if (isEuro) {
    // Tu código (jugador)
    const yourMillon = firstVal(
      getByPath(draw, "your.millonCode"),
      getByPath(draw, "your.millon"),
      getByPath(stats, "yourMillonCode"),
      getByPath(stats, "millonPlayed"),
      getByPath(draw, "results.player.millonPlayed"),
    );

    // Código ganador del sorteo (viene del engine como draw.millon)
    const drawnMillon = firstVal(
      getByPath(draw, "drawn.millonCode"),
      getByPath(draw, "drawn.millon"),
      getByPath(draw, "draw.millon"),
      getByPath(stats, "millonDrawn"),
      getByPath(draw, "results.draw.millon"),
    );

    const millonPrizeThisDraw = num(
      firstVal(
        getByPath(stats, "millonPrizeThisDraw"),
        getByPath(draw, "results.player.millonPrize"),
        getByPath(draw, "results.player.millon.prize"),
      ) ?? 0,
    );

    const millonCostThisDraw = num(
      firstVal(
        getByPath(stats, "millonPlayerCost"),
        getByPath(stats, "millonPricePerBetExtra"),
        getByPath(draw, "results.player.millonCost"),
      ) ?? 0,
    );

    const millonNetThisDraw = millonPrizeThisDraw - millonCostThisDraw;

    const L_YOUR = lang === "en" ? "Your code" : "Tu código";
    const L_DRAWN = lang === "en" ? "Drawn code" : "Código sorteado";
    const L_COST = lang === "en" ? "Cost" : "Coste";
    const L_PRIZE = lang === "en" ? "Prize" : "Premio";
    const L_NET = lang === "en" ? "Balance" : "Balance";

    return `
    <div class="ddm__card">
      <h4>${escapeHtml("El Millón")}</h4>

      ${row(
        escapeHtml(L_YOUR),
        `<span class="ddm__digits">${renderCodeAsNumberPills(yourMillon)}</span>`,
      )}

      ${row(
        escapeHtml(L_DRAWN),
        `<span class="ddm__digits">${renderCodeAsNumberPills(drawnMillon)}</span>`,
      )}

      <div class="ddm__dividerTop"></div>

      ${row(
        escapeHtml(L_COST),
        `<strong>${moneySpan(
          -Math.abs(millonCostThisDraw),
          fmtMoney(millonCostThisDraw, locale),
        )}</strong>`,
      )}
      ${row(
        escapeHtml(L_PRIZE),
        `<strong>${moneySpan(
          millonPrizeThisDraw,
          fmtMoney(millonPrizeThisDraw, locale),
        )}</strong>`,
      )}
      ${row(
        escapeHtml(L_NET),
        `<strong>${moneySpan(
          millonNetThisDraw,
          fmtMoney(millonNetThisDraw, locale),
        )}</strong>`,
      )}
    </div>
  `;
  }

  return `<div class="ddm__card ddm__card--ghost"></div>`;
}

/* ===========================
   API pública: HTML del modal (contenido)
   =========================== */

export function renderDrawDetailHtml(draw, drawNumber, ctx) {
  const { lang, locale, t, tAny, hs } = ctx;

  const gameId = draw?.gameId || document.body.dataset.game || "primitiva";
  const isEurodreams = gameId === "eurodreams";
  const isPrimitiva = gameId === "primitiva";
  const isEuro = gameId === "euromillones";
  const isGordo = gameId === "gordo";
  const isLN = gameId === "loteria-nacional";
  const isQuiniela = gameId === "quiniela";

  const yourMain = draw?.your?.main || [];
  const drawnMain = draw?.drawn?.main || [];
  const matchesMain =
    isLN || isQuiniela ? [] : drawnMain.filter((n) => yourMain.includes(n));

  const stats = draw?.stats || {};
  const results = draw?.results || {};

  const betsMain = num(stats?.betsMain);
  const revenueMain = num(stats?.revenueMain);
  const prizePoolPercent = num(stats?.prizePoolPercent);
  const prizePool = num(stats?.prizePool);

  const lnDecimos = num(stats?.decimos ?? draw?.your?.decimos);
  const lnPricePerDecimo = num(stats?.pricePerDecimo);
  const lnSpendThisDraw = lnPricePerDecimo * (lnDecimos || 0);

  const jokerEnabledStats = Boolean(stats?.jokerEnabled);
  const jokerBetsWorld = num(stats?.jokerBetsWorld);
  const revenueJokerWorld = num(stats?.revenueJokerWorld);

  // Coste REAL del Joker del jugador (inyectado desde simulation-controls.js)
  // Fallback: jokerShare antiguo (si existía)
  const jokerPlayerCost = num(stats?.jokerPlayerCost);
  const jokerShareFallback = num(stats?.jokerShare);
  const jokerShare = jokerPlayerCost > 0 ? jokerPlayerCost : jokerShareFallback;

  // --- Total prize (puede venir ya sumado) ---
  const totalPrizeThisDraw = num(
    stats?.totalPrizeThisDraw ??
      stats?.prizeThisDraw ??
      draw?.totalPrize ??
      draw?.prizeTotal ??
      draw?.prize ??
      0,
  );

  // --- Joker prize: intenta muchas rutas (engine / draw / stats) ---
  const jokerPrizeThisDraw = num(
    firstVal(
      stats?.jokerPrizeThisDraw,
      stats?.prizeJokerThisDraw,
      stats?.jokerPrize,
      getByPath(stats, "joker.prizeThisDraw"),
      getByPath(stats, "joker.prize"),
      draw?.prizeJoker,
      draw?.jokerPrize,
      getByPath(draw, "prizes.joker"),
      getByPath(draw, "payouts.joker"),
      getByPath(draw, "results.jokerPrize"),
      getByPath(draw, "results.player.jokerPrize"),
      getByPath(draw, "results.player.jokerPrizeThisDraw"),
      getByPath(draw, "results.player.prizeJokerThisDraw"),
      getByPath(draw, "results.player.prizeJokerThisDraw"),
    ) ?? 0,
  );

  const jokerNetThisDraw = jokerPrizeThisDraw - jokerShare;

  // --- Main prize: si no viene separado, lo inferimos del total ---
  const mainPrizeThisDrawRaw = firstVal(
    stats?.mainPrizeThisDraw,
    stats?.prizeMainThisDraw,
    stats?.prizeMain,
    getByPath(stats, "main.prizeThisDraw"),
    draw?.prizeMain,
    draw?.mainPrize,
    getByPath(draw, "prizes.main"),
    getByPath(draw, "payouts.main"),
  );

  const mainPrizeThisDraw = Number.isFinite(Number(mainPrizeThisDrawRaw))
    ? num(mainPrizeThisDrawRaw)
    : Math.max(0, totalPrizeThisDraw - jokerPrizeThisDraw);

  // --- Coste del principal (si no lo tienes, quedará 0) ---
  const mainCostThisDraw = num(
    firstVal(
      stats?.mainPlayerCost,
      stats?.playerCostMain,
      stats?.costMainPlayer,
      stats?.spendMainThisDraw,
      stats?.mainSpendThisDraw,
      getByPath(stats, "main.playerCost"),
      getByPath(stats, "main.cost"),
    ) ?? 0,
  );

  const mainNetThisDraw = mainPrizeThisDraw - mainCostThisDraw;

  const millonEnabled =
    Boolean(stats?.millonEnabled) ||
    Boolean(draw?.your?.millonEnabled) ||
    Boolean(draw?.your?.millon) ||
    Boolean(draw?.your?.millonCode) ||
    Boolean(getByPath(draw, "results.player.millonPlayed"));

  const totalRevenueThisDraw = num(stats?.totalRevenueThisDraw);

  const jackpotBefore = num(stats?.jackpotBefore);
  const jackpotContributionBase = num(stats?.jackpotContributionBase);
  const rolloverToJackpot = num(stats?.rolloverToJackpot);
  const jackpotInPlayToday = num(stats?.jackpotPotThisDraw);
  const jackpotPaidTotal = num(stats?.jackpotPaidTotal);
  const jackpotAfter = num(stats?.jackpotAfter);

  const jackpotWinnersEffective = num(stats?.jackpotWinnersEffective);

  const winnersEffective =
    stats?.winnersEffective || results?.winnersEffective || {};
  const prizePerWinner = stats?.prizePerWinner || {};
  const payoutsTotal = stats?.payoutsTotal || {};

  const drawTypeCtx = String(
    stats?.drawType || draw?.your?.drawType || "navidad",
  );

  const showJackpotCard =
    !isEurodreams &&
    !isLN &&
    !isQuiniela &&
    (isPrimitiva ||
      isEuro ||
      isGordo ||
      jackpotBefore > 0 ||
      jackpotInPlayToday > 0 ||
      jackpotAfter > 0 ||
      jackpotContributionBase > 0 ||
      rolloverToJackpot > 0 ||
      jackpotPaidTotal > 0);

  const didacticEurodreams = t(
    "results.drawDetail.didacticEurodreams",
    lang === "en"
      ? "EuroDreams has no classic rollover jackpot in this simulator."
      : "EuroDreams no tiene bote acumulado clásico en este simulador.",
  );

  const didactic =
    jackpotWinnersEffective > 0
      ? t(
          "results.drawDetail.didacticWithWinner",
          lang === "en"
            ? "Since there was a jackpot winner, today's jackpot is paid out."
            : "Como hubo ganador/es del bote, el bote en juego HOY se paga.",
        )
      : t(
          "results.drawDetail.didacticNoWinner",
          lang === "en"
            ? "Since there was no jackpot winner, today's jackpot is carried over."
            : "Como NO hubo ganador/es del bote, el bote en juego HOY se acumula.",
        );

  const addonCardHtml = renderAddonCard(draw, t, lang, locale, gameId, {
    jokerShare,
    jokerPrizeThisDraw,
    jokerNetThisDraw,
  });

  // ===== Fiscalidad (España) sobre el premio total del jugador =====
  const taxSpain = computeSpainLotteryTax(totalPrizeThisDraw, {
    exempt: 40000,
    rate: 0.2,
  });

  const taxTitle = t(
    "results.drawDetail.tax.title",
    lang === "en" ? "Tax (Spain)" : "Fiscalidad (España)",
  );
  const taxLExempt = t(
    "results.drawDetail.tax.exempt",
    lang === "en" ? "Tax-free amount" : "Importe exento",
  );
  const taxLTaxable = t(
    "results.drawDetail.tax.taxable",
    lang === "en" ? "Taxable amount" : "Importe sujeto",
  );
  const taxLWithheld = t(
    "results.drawDetail.tax.withheld",
    lang === "en" ? "Withholding (20%)" : "Retención (20%)",
  );
  const taxLNet = t(
    "results.drawDetail.tax.net",
    lang === "en" ? "Net prize" : "Premio neto",
  );

  const taxNote = mutedNote(
    escapeHtml(
      lang === "en"
        ? "Spain: first €40,000 tax-free and 20% withholding on the excess. If the bet is under €0.50, the tax-free threshold is reduced proportionally; shared tickets prorate the exemption. Other countries may differ."
        : "España: primeros 40.000 € exentos y retención del 20% sobre el exceso. Si la apuesta es inferior a 0,50 €, el exento se reduce proporcionalmente; si hay cotitulares, el exento se prorratea. En otros países puede ser distinto.",
    ),
  );

  // Hotspot de ayuda SOLO a nivel de módulos (títulos)
  const statsHelpTitle = t(
    "results.drawDetail.help.sections.prizePool.title",
    lang === "en" ? "Prize pool" : "Pool de premios",
  );
  const jokerHelpTitle = t(
    "results.drawDetail.help.sections.joker.title",
    lang === "en" ? "Joker" : "Joker",
  );

  return `
    ${renderCombinaciones(draw, matchesMain, locale, t, lang, gameId, addonCardHtml)}

    <div class="ddm__spacer"></div>

    <div class="ddm__grid">
      <div class="ddm__card">
        <h4>${
          isLN
            ? t(
                "results.drawDetail.spendingTitle",
                lang === "en" ? "Your spending" : "Tu gasto",
              )
            : hs(
                t(
                  "results.drawDetail.statsTitle",
                  lang === "en" ? "Draw statistics" : "Estadísticas del sorteo",
                ),
                "prizePool",
                statsHelpTitle,
              )
        }</h4>

        ${
          isLN
            ? `
          ${row(
            t(
              "results.drawDetail.lnDecimos",
              lang === "en" ? "Decimos played" : "Décimos jugados",
            ),
            fmtInt(lnDecimos, locale),
          )}
          ${row(
            t(
              "results.drawDetail.lnPricePerDecimo",
              lang === "en" ? "Price per decimo" : "Precio por décimo",
            ),
            fmtMoney(lnPricePerDecimo, locale),
          )}
          <div class="ddm__dividerTop"></div>
          ${row(
            t(
              "results.drawDetail.lnSpendThisDraw",
              lang === "en"
                ? "Total spent this draw"
                : "Total gastado este sorteo",
            ),
            `<strong>${moneySpan(-Math.abs(lnSpendThisDraw), fmtMoney(lnSpendThisDraw, locale))}</strong>`,
          )}
        `
            : `
          ${row(
            t(
              "results.drawDetail.betsWorld",
              lang === "en" ? "Bets (world)" : "Apuestas (mundo)",
            ),
            fmtInt(betsMain, locale),
          )}

          ${row(
            t(
              "results.drawDetail.revenueMain",
              lang === "en" ? "Revenue (main)" : "Recaudación (principal)",
            ),
            fmtMoney(revenueMain, locale),
          )}

          ${row(
            t(
              "results.drawDetail.prizePoolPercent",
              lang === "en" ? "Prize pool %" : "% a premios",
            ),
            fmtPct(prizePoolPercent, 1, locale),
          )}

          ${row(
            t(
              "results.drawDetail.prizePool",
              lang === "en" ? "Prize pool" : "Pool de premios",
            ),
            fmtMoney(prizePool, locale),
          )}

          ${
            jokerEnabledStats
              ? `
            <div class="ddm__dividerTop"></div>

            <div style="display:flex;align-items:center;gap:10px;">
              <span style="font-weight:700;">${escapeHtml(
                t(
                  "results.drawDetail.jokerWorldTitle",
                  lang === "en" ? "Joker (world)" : "Joker (mundo)",
                ),
              )}</span>
              <span style="flex:1 1 auto;"></span>
              <span>${hs(escapeHtml(lang === "en" ? "Help" : "Ayuda"), "joker", jokerHelpTitle)}</span>
            </div>

            ${row(
              t(
                "results.drawDetail.jokerBetsWorld",
                lang === "en" ? "Joker bets (world)" : "Apuestas Joker (mundo)",
              ),
              fmtInt(jokerBetsWorld, locale),
            )}

            ${row(
              t(
                "results.drawDetail.jokerRevenueWorld",
                lang === "en"
                  ? "Joker revenue (world)"
                  : "Recaudación Joker (mundo)",
              ),
              fmtMoney(revenueJokerWorld, locale),
            )}

            ${row(
              t(
                "results.drawDetail.jokerYourCost",
                lang === "en" ? "Your Joker cost" : "Tu gasto Joker",
              ),
              moneySpan(-Math.abs(jokerShare), fmtMoney(jokerShare, locale)),
            )}
          `
              : ""
          }

          <div class="ddm__dividerTop"></div>
          ${row(
            t(
              "results.drawDetail.totalRevenue",
              lang === "en"
                ? "Total revenue this draw"
                : "Total ingresos del sorteo",
            ),
            `<strong>${fmtMoney(totalRevenueThisDraw, locale)}</strong>`,
          )}
        `
        }
      </div>

      ${
        showJackpotCard
          ? `
      <div class="ddm__card">
        <h4>${hs(
          t(
            "results.drawDetail.jackpotBalance",
            lang === "en" ? "Jackpot balance" : "Bote (balance)",
          ),
          "jackpot",
          lang === "en" ? "Jackpot logic" : "Lógica del bote",
        )}</h4>

        ${
          isEurodreams
            ? mutedNote(escapeHtml(didacticEurodreams))
            : mutedNote(escapeHtml(didactic))
        }

        <div class="ddm__dividerTop"></div>

        ${row(
          lang === "en" ? "Jackpot before" : "Bote antes del sorteo",
          moneySpan(jackpotBefore, fmtMoney(jackpotBefore, locale)),
        )}

        ${row(
          lang === "en" ? "Base contribution" : "Aportación base al bote",
          moneySpan(
            jackpotContributionBase,
            fmtMoney(jackpotContributionBase, locale),
          ),
        )}

        ${row(
          lang === "en"
            ? "Rollover into jackpot"
            : "Arrastres que entran al bote",
          moneySpan(rolloverToJackpot, fmtMoney(rolloverToJackpot, locale)),
        )}

        <div class="ddm__dividerTop"></div>

        ${row(
          lang === "en" ? "Jackpot in play today" : "Bote en juego hoy",
          `<strong>${moneySpan(jackpotInPlayToday, fmtMoney(jackpotInPlayToday, locale))}</strong>`,
        )}

        ${row(
          lang === "en" ? "Jackpot paid (total)" : "Bote pagado (total)",
          moneySpan(
            -Math.abs(jackpotPaidTotal),
            fmtMoney(jackpotPaidTotal, locale),
          ),
        )}

        ${row(
          lang === "en" ? "Jackpot after" : "Bote para el siguiente sorteo",
          `<strong>${moneySpan(jackpotAfter, fmtMoney(jackpotAfter, locale))}</strong>`,
        )}

        <div class="ddm__dividerTop"></div>

        <div class="ddm__sumBox">
          ${sumRow(
            "",
            lang === "en" ? "Jackpot before" : "Bote antes",
            moneySpan(jackpotBefore, fmtMoney(jackpotBefore, locale)),
            moneyToneClass(jackpotBefore),
          )}
          ${sumRow(
            "+",
            lang === "en" ? "Base contribution" : "Aportación base del sorteo",
            moneySpan(
              jackpotContributionBase,
              fmtMoney(jackpotContributionBase, locale),
            ),
            moneyToneClass(jackpotContributionBase),
          )}
          ${sumRow(
            "+",
            lang === "en"
              ? "Rollover (no-winner categories)"
              : "Arrastres desde categorías sin acertantes",
            moneySpan(rolloverToJackpot, fmtMoney(rolloverToJackpot, locale)),
            moneyToneClass(rolloverToJackpot),
          )}
          <div class="ddm__sumDivider"></div>
          ${sumRow(
            "=",
            lang === "en" ? "Jackpot in play today" : "Bote en juego hoy",
            `<strong>${moneySpan(jackpotInPlayToday, fmtMoney(jackpotInPlayToday, locale))}</strong>`,
            moneyToneClass(jackpotInPlayToday),
          )}
          ${sumRow(
            "−",
            lang === "en"
              ? "Paid if jackpot winner(s)"
              : "Pagado si hubo ganador/es de bote",
            moneySpan(
              -Math.abs(jackpotPaidTotal),
              fmtMoney(jackpotPaidTotal, locale),
            ),
            moneyToneClass(-Math.abs(jackpotPaidTotal)),
          )}
          <div class="ddm__sumDivider"></div>
          ${sumRow(
            "=",
            lang === "en" ? "Next jackpot" : "Bote siguiente sorteo",
            `<strong>${moneySpan(jackpotAfter, fmtMoney(jackpotAfter, locale))}</strong>`,
            moneyToneClass(jackpotAfter),
          )}
        </div>

      </div>
      `
          : ""
      }
    </div>

    <div class="ddm__spacer"></div>

    <!-- Fiscalidad (España): visible y patente -->
    <div class="ddm__card">
      <h4>${escapeHtml(taxTitle)}</h4>

      ${row(escapeHtml(taxLExempt), fmtMoney(taxSpain.exempt, locale))}
      ${row(escapeHtml(taxLTaxable), fmtMoney(taxSpain.taxable, locale))}
      ${row(
        escapeHtml(taxLWithheld),
        moneySpan(
          -Math.abs(taxSpain.tax),
          `-${fmtMoney(taxSpain.tax, locale)}`,
        ),
      )}

      <div class="ddm__dividerTop"></div>

      ${row(
        escapeHtml(taxLNet),
        `<strong>${moneySpan(taxSpain.net, fmtMoney(taxSpain.net, locale))}</strong>`,
      )}

      ${taxNote}
    </div>

    <div class="ddm__spacer"></div>

    <div class="ddm__card">
      <h4>${escapeHtml(
        t(
          "results.drawDetail.help.modalTitle",
          lang === "en" ? "Help" : "Cómo leer este sorteo",
        ),
      )}</h4>
      <div class="ddm__muted">
        ${escapeHtml(
          t(
            "results.drawDetail.help.clickInstruction",
            lang === "en"
              ? "Click on underlined labels to see explanations."
              : "Haz clic en las etiquetas subrayadas para ver explicaciones.",
          ),
        )}
      </div>
    </div>

    <div class="ddm__spacer"></div>

    ${renderWinnersTable(
      winnersEffective,
      prizePerWinner,
      payoutsTotal,
      locale,
      t,
      lang,
      gameId,
      { drawType: drawTypeCtx, jokerEnabled: jokerEnabledStats, millonEnabled },
    )}
  `;
}

/* ===========================
   RENDERIZADO DE SECCIONES
   =========================== */

function renderCombinaciones(
  draw,
  matchesMain,
  locale,
  t,
  lang,
  gameId,
  addonCardHtml,
) {
  const isEuro = gameId === "euromillones";
  const isEurodreams = gameId === "eurodreams";
  const isPrimitiva = gameId === "primitiva";
  const isBonoloto = gameId === "bonoloto";
  const isGordo = gameId === "gordo";
  const isLN = gameId === "loteria-nacional";
  const isQuiniela = gameId === "quiniela";

  if (isQuiniela) {
    const yourSigns = draw?.your?.signs || [];
    const drawnSigns = draw?.drawn?.signs || [];

    const yourPleno = draw?.your?.pleno || { home: null, away: null };
    const drawnPleno = draw?.drawn?.pleno || { home: null, away: null };

    const hits = countQuinielaHits(yourSigns, drawnSigns);
    const plenoHit =
      yourPleno?.home != null &&
      yourPleno?.away != null &&
      drawnPleno?.home != null &&
      drawnPleno?.away != null &&
      String(yourPleno.home) === String(drawnPleno.home) &&
      String(yourPleno.away) === String(drawnPleno.away);

    const yourGrid = fmtQuinielaSigns(yourSigns, drawnSigns);
    const drawnGrid = fmtQuinielaSigns(drawnSigns, yourSigns);

    const plenoHtml = (p, ref) => {
      const h = p?.home ?? "—";
      const a = p?.away ?? "—";
      const hit =
        ref &&
        ref?.home != null &&
        ref?.away != null &&
        String(h) === String(ref.home) &&
        String(a) === String(ref.away);

      const cls = hit ? "reintegro ddm__hit" : "reintegro";
      return `<span class="${cls}">${escapeHtml(String(h))}-${escapeHtml(String(a))}</span>`;
    };

    const totalPrizeLabel = t(
      "results.drawDetail.totalPrize",
      lang === "en" ? "Total prize" : "Premio total",
    );

    const rawPrize = draw?.prize;
    const prizeHtml =
      rawPrize === null || rawPrize === undefined
        ? "—"
        : formatCurrency(num(rawPrize), locale);

    const hitsLabel = t(
      "results.drawDetail.hits",
      lang === "en" ? "Hits" : "Aciertos",
    );

    const L_YOUR = t(
      "results.drawDetail.yourCombination",
      lang === "en" ? "Your combination" : "Tu combinación",
    );
    const L_DRAWN = t(
      "results.drawDetail.drawnCombination",
      lang === "en" ? "Drawn combination" : "Combinación sorteada",
    );

    const plenoLabel = t(
      "ui.quiniela.pleno15",
      lang === "en" ? "Exact score (match 15)" : "Pleno al 15",
    );

    return `
      <div class="ddm__grid">
        <div class="ddm__card">
          <h4>${t(
            "results.drawDetail.combinations",
            lang === "en" ? "Combinations" : "Combinaciones",
          )}</h4>

          ${row(`${L_YOUR} (1X2)`, yourGrid)}
          ${row(`${L_DRAWN} (1X2)`, drawnGrid)}

          <div class="ddm__dividerTop"></div>

          ${row(`${plenoLabel} (${lang === "en" ? "you" : "tú"})`, plenoHtml(yourPleno, drawnPleno))}
          ${row(`${plenoLabel} (${lang === "en" ? "draw" : "sorteo"})`, plenoHtml(drawnPleno, yourPleno))}

          <div class="ddm__dividerTop"></div>

          ${row(
            hitsLabel,
            `<span class="ddm__highlight">${hits}</span>${
              plenoHit ? ` <span class="ddm__hit">(P15)</span>` : ""
            }`,
          )}

          <div class="ddm__dividerTop"></div>
          ${row(totalPrizeLabel, `<strong>${prizeHtml}</strong>`)}
        </div>

        <div class="ddm__card ddm__card--ghost"></div>
      </div>
    `;
  }

  const yourMain = draw?.your?.main || [];
  const drawnMain = draw?.drawn?.main || [];

  const stats = draw?.stats || {};
  const drawType = String(stats?.drawType || draw?.your?.drawType || "navidad");
  const isLNOrd = isLN && (drawType === "jueves" || drawType === "sabado");

  const yourRein = draw?.your?.reintegro;
  const drawnRein = draw?.drawn?.reintegro;

  const yourStars = draw?.your?.stars || [];
  const drawnStars = draw?.drawn?.stars || [];

  const yourClave = draw?.your?.clave;
  const drawnClave = draw?.drawn?.clave;

  const yourDream = draw?.your?.dream;
  const drawnDream = draw?.drawn?.dream;

  const drawnComplementario =
    draw?.drawn?.complementario !== undefined
      ? draw.drawn.complementario
      : null;

  const yourSet = new Set(yourMain);
  const drawnSet = new Set(drawnMain);

  const compSet =
    drawnComplementario !== null && drawnComplementario !== undefined
      ? new Set([Number(drawnComplementario)])
      : new Set();

  const yourLine = fmtListWithMatchesPlusComplementario(
    yourMain,
    2,
    drawnSet,
    compSet,
  );
  const drawnLine = fmtListWithMatches(drawnMain, 2, yourSet);

  function lnMaskByPosition(aDigits, bDigits) {
    const m = [false, false, false, false, false];
    if (!Array.isArray(aDigits) || !Array.isArray(bDigits)) return m;
    if (aDigits.length !== 5 || bDigits.length !== 5) return m;
    for (let i = 0; i < 5; i++) {
      m[i] = Number(aDigits[i]) === Number(bDigits[i]);
    }
    return m;
  }

  function lnHtmlNumberWithHits(digits, mask) {
    if (!Array.isArray(digits) || digits.length !== 5) return "—";
    return digits
      .map((d, i) => {
        const cls = mask && mask[i] ? "number ddm__hit" : "number";
        return `<span class="${cls}">${escapeHtml(String(Number(d)))}</span>`;
      })
      .join("");
  }

  const lnMask = isLN ? lnMaskByPosition(yourMain, drawnMain) : null;

  const yourValue = isLN ? lnHtmlNumberWithHits(yourMain, lnMask) : yourLine;
  const drawnValue = isLN ? lnHtmlNumberWithHits(drawnMain, lnMask) : drawnLine;

  const lnSecond =
    draw?.drawn?.secondMain ||
    draw?.drawn?.secondNumbers ||
    draw?.drawn?.second ||
    null;

  const lnEndings4 =
    draw?.drawn?.endings4 ||
    draw?.drawn?.endingsFour ||
    draw?.drawn?.terminaciones4 ||
    null;

  const lnEndings3 =
    draw?.drawn?.endings3 ||
    draw?.drawn?.endingsThree ||
    draw?.drawn?.terminaciones3 ||
    null;

  const lnEndings2 =
    draw?.drawn?.endings2 ||
    draw?.drawn?.endingsTwo ||
    draw?.drawn?.terminaciones2 ||
    null;

  const lnReintegros =
    draw?.drawn?.reintegros ||
    draw?.drawn?.reintegroList ||
    draw?.drawn?.reintegrosList ||
    null;

  const yourLastDigit =
    isLN && Array.isArray(yourMain) && yourMain.length === 5
      ? String(Number(yourMain[4]))
      : null;

  const reinHtml =
    isLN && Array.isArray(lnReintegros) && lnReintegros.length
      ? lnReintegros
          .map((r) => {
            const rr = String(r);
            const hit = yourLastDigit != null && rr === yourLastDigit;
            const cls = hit ? "reintegro ddm__hit" : "reintegro";
            return `<span class="${cls}">R:${padNumber(r, 1)}</span>`;
          })
          .join(" ")
      : "";

  const endingsHtml = (arr, len, label) => {
    if (!Array.isArray(arr) || !arr.length) return "";
    const yourStr = Array.isArray(yourMain) ? yourMain.join("") : "";
    const pills = arr
      .map((s) => {
        const ss = String(s).padStart(len, "0");
        const hit = yourStr && yourStr.endsWith(ss);
        const cls = hit ? "number ddm__hit" : "number";
        return `<span class="${cls}">${escapeHtml(ss)}</span>`;
      })
      .join(" ");
    return row(label, pills);
  };

  const hitsLabel = t(
    "results.drawDetail.hits",
    lang === "en" ? "Hits" : "Aciertos",
  );

  const starsLabel =
    t(
      "results.drawDetail.starsLabel",
      t("meta.labels.stars", lang === "en" ? "Stars" : "Estrellas"),
    ) + ` (${lang === "en" ? "your/drawn" : "tú/sorteo"})`;

  const starsLine = (arr, matchSet) =>
    Array.isArray(arr) && arr.length
      ? arr
          .map((n) => {
            const isMatch = matchSet && matchSet.has(n);
            const cls = isMatch
              ? "number number--star ddm__hit"
              : "number number--star";
            return `<span class="${cls}">${padNumber(n, 2)}</span>`;
          })
          .join(" ")
      : "—";

  const yourStarsSet = new Set(yourStars);
  const drawnStarsSet = new Set(drawnStars);

  const claveMatch =
    yourClave !== null &&
    yourClave !== undefined &&
    drawnClave !== null &&
    drawnClave !== undefined &&
    Number(yourClave) === Number(drawnClave);

  const claveValue = (v, isHit) => {
    if (v === null || v === undefined) return "—";
    const cls = isHit ? "reintegro ddm__hit" : "reintegro";
    return `<span class="${cls}">K:${padNumber(v, 1)}</span>`;
  };

  const dreamMatch =
    yourDream !== null &&
    yourDream !== undefined &&
    drawnDream !== null &&
    drawnDream !== undefined &&
    Number(yourDream) === Number(drawnDream);

  const dreamValue = (v, isHit) => {
    if (v === null || v === undefined) return "—";
    const cls = isHit ? "reintegro ddm__hit" : "reintegro";
    return `<span class="${cls}">S:${padNumber(v, 1)}</span>`;
  };

  // ========= PREMIOS (split principal / Joker / El Millón) =========

  const labels = getPrizeLabels({ lang, t, gameId });
  const split = computePrizeSplit(draw, gameId);

  const {
    totalPrizeLabel,
    totalNetLabel,
    prizeMainLabel,
    netMainLabel,
    prizeJokerLabel,
    netJokerLabel,
    prizeMillonLabel,
    netMillonLabel,
  } = labels;

  const {
    mainPrize,
    mainNet,
    showJokerSplit,
    jokerPrize,
    jokerNet,
    showMillonSplit,
    millonPrize,
    millonNet,
    totalPrizeEffective,
    totalNet,
  } = split;

  // Mostrar “Premio principal / Balance principal / Total” en TODOS los juegos.
  // (Las filas extra como Joker/El Millón se añaden solo si aplica)
  const showSplitBlock = true;

  const legacyPrizeHtml =
    draw?.prize === null || draw?.prize === undefined
      ? "—"
      : formatCurrency(num(draw?.prize), locale);

  return `
    <div class="ddm__grid">
      <div class="ddm__card">
        <h4>${t(
          "results.drawDetail.combinations",
          lang === "en" ? "Combinations" : "Combinaciones",
        )}</h4>

        ${row(
          t(
            "results.drawDetail.yourCombination",
            lang === "en" ? "Your combination" : "Tu combinación",
          ),
          `${yourValue}${
            isPrimitiva || isBonoloto
              ? fmtReintegro(yourRein, yourRein === drawnRein)
              : ""
          }${isGordo ? claveValue(yourClave, claveMatch) : ""}${
            isEurodreams ? dreamValue(yourDream, dreamMatch) : ""
          }`,
        )}

        ${row(
          t(
            "results.drawDetail.drawnCombination",
            lang === "en" ? "Drawn combination" : "Combinación sorteada",
          ),
          `${drawnValue}${
            isPrimitiva || isBonoloto
              ? fmtReintegro(drawnRein, yourRein === drawnRein)
              : ""
          }${isGordo ? claveValue(drawnClave, claveMatch) : ""}${
            isEurodreams ? dreamValue(drawnDream, dreamMatch) : ""
          }${isLN ? ` ${reinHtml}` : ""}`,
        )}

        ${
          isLNOrd && Array.isArray(lnSecond) && lnSecond.length === 5
            ? row(
                lang === "en" ? "2nd prize number" : "Número 2º premio",
                lnHtmlNumberWithHits(lnSecond, null),
              )
            : ""
        }

        ${
          isLNOrd
            ? `
              <div class="ddm__dividerTop"></div>
              ${endingsHtml(lnEndings4, 4, lang === "en" ? "4-digit endings" : "Terminaciones 4 cifras")}
              ${endingsHtml(lnEndings3, 3, lang === "en" ? "3-digit endings" : "Terminaciones 3 cifras")}
              ${endingsHtml(lnEndings2, 2, lang === "en" ? "2-digit endings" : "Terminaciones 2 cifras")}
            `
            : ""
        }

        ${
          !isLN
            ? row(
                hitsLabel,
                `<span class="ddm__highlight">${matchesMain.length}</span>`,
              )
            : ""
        }

        ${
          isEuro
            ? `
          ${row(
            starsLabel,
            `${starsLine(yourStars, drawnStarsSet)} / ${starsLine(drawnStars, yourStarsSet)}`,
          )}
        `
            : ""
        }

        <div class="ddm__dividerTop"></div>

        ${
          showSplitBlock
            ? `
              ${row(
                prizeMainLabel,
                `<strong>${moneySpan(mainPrize, fmtMoney(mainPrize, locale))}</strong>`,
              )}
              ${row(
                netMainLabel,
                `<strong>${moneySpan(mainNet, fmtMoney(mainNet, locale))}</strong>`,
              )}

              ${
                showMillonSplit
                  ? `
                    <div class="ddm__dividerTop"></div>
                    ${row(
                      prizeMillonLabel,
                      `<strong>${moneySpan(millonPrize, fmtMoney(millonPrize, locale))}</strong>`,
                    )}
                    ${row(
                      netMillonLabel,
                      `<strong>${moneySpan(millonNet, fmtMoney(millonNet, locale))}</strong>`,
                    )}
                  `
                  : ""
              }

              ${
                showJokerSplit
                  ? `
                    <div class="ddm__dividerTop"></div>
                    ${row(
                      prizeJokerLabel,
                      `<strong>${moneySpan(jokerPrize, fmtMoney(jokerPrize, locale))}</strong>`,
                    )}
                    ${row(
                      netJokerLabel,
                      `<strong>${moneySpan(jokerNet, fmtMoney(jokerNet, locale))}</strong>`,
                    )}
                  `
                  : ""
              }

              <div class="ddm__dividerTop"></div>
              ${row(totalPrizeLabel, `<strong>${fmtMoney(totalPrizeEffective, locale)}</strong>`)}
              ${row(
                totalNetLabel,
                `<strong>${moneySpan(totalNet, fmtMoney(totalNet, locale))}</strong>`,
              )}
            `
            : `
              ${row(totalPrizeLabel, `<strong>${legacyPrizeHtml}</strong>`)}
            `
        }
      </div>

      ${addonCardHtml || `<div class="ddm__card ddm__card--ghost"></div>`}
    </div>
  `;
}

function computeTotalPaid({ winners, prizePerWinner, payoutProvided }) {
  const w = num(winners);
  const p = num(prizePerWinner);
  const provided = num(payoutProvided);

  const computed = w > 0 && p > 0 ? w * p : 0;

  if (provided > 0) {
    const tol = Math.max(0.01, computed * 0.005);
    const diff = Math.abs(provided - computed);

    if (computed === 0) return provided;

    if (diff > tol) return computed;

    return provided;
  }

  return computed;
}

function renderWinnersTable(
  winnersEffective,
  prizePerWinner,
  payoutsTotal,
  locale,
  t,
  lang,
  gameId,
  ctx = {},
) {
  const rows = getCategoryRows(gameId, t, lang, ctx);

  const thTaxSpain = t(
    "results.drawDetail.tableHeaders.taxSpainPerWinner",
    lang === "en"
      ? "Tax withheld / winner (Spain)"
      : "Hacienda (España) / ganador",
  );

  const thNetSpain = t(
    "results.drawDetail.tableHeaders.netPerWinnerSpain",
    lang === "en" ? "Net / winner (Spain)" : "Neto ganador (España)",
  );

  const body = rows
    .map((r) => {
      const key = r.dataKey ?? r.key;

      const winners = num(winnersEffective?.[key]);
      const prize = num(prizePerWinner?.[key]);

      const payout = computeTotalPaid({
        winners,
        prizePerWinner: prize,
        payoutProvided: payoutsTotal?.[key],
      });

      const k = String(r?.key || "").toLowerCase();
      const label = String(r?.label || "").toLowerCase();
      const isRefundLike =
        k.includes("reintegro") ||
        label.includes("reintegro") ||
        k.includes("refund") ||
        label.includes("refund") ||
        label.includes("devol");

      const tax = isRefundLike
        ? 0
        : computeSpainLotteryTax(prize, { exempt: 40000, rate: 0.2 }).tax;
      const net = isRefundLike
        ? prize
        : computeSpainLotteryTax(prize, { exempt: 40000, rate: 0.2 }).net;

      const taxHtml = moneySpan(-Math.abs(tax), `-${fmtMoney(tax, locale)}`);
      const netHtml = moneySpan(net, fmtMoney(net, locale));

      const catCell = `
        <span class="ddm__catCell ${r.tone || ""}">
          <span class="ddm__catIconSvg" aria-hidden="true">${iconSvg(r.icon)}</span>
          <span>${escapeHtml(r.label)}</span>
        </span>
      `;

      return `
        <tr>
          <td>${catCell}</td>
          <td>${fmtInt(winners, locale)}</td>
          <td>${fmtMoney(prize, locale)}</td>
          <td>${fmtMoney(payout, locale)}</td>
          <td><strong>${taxHtml}</strong></td>
          <td><strong>${netHtml}</strong></td>
        </tr>
      `;
    })
    .join("");

  const footerNote = mutedNote(
    escapeHtml(
      lang === "en"
        ? "Spain (typical case): first €40,000 tax-free and 20% withholding on the excess (per prize). Other countries may differ."
        : "España (caso típico): primeros 40.000 € exentos y retención del 20% sobre el exceso (por premio). En otros países puede ser distinto.",
    ),
  );

  return `
    <table class="ddm__table">
      <thead>
        <tr>
          <th>${escapeHtml(
            t(
              "results.drawDetail.tableHeaders.category",
              lang === "en" ? "Category" : "Categoría",
            ),
          )}</th>
          <th>${escapeHtml(
            t(
              "results.drawDetail.tableHeaders.winners",
              lang === "en" ? "Winners (world + you)" : "Ganadores (mundo+tú)",
            ),
          )}</th>
          <th>${escapeHtml(
            t(
              "results.drawDetail.tableHeaders.prizePerWinner",
              lang === "en" ? "Prize / winner" : "Premio / ganador",
            ),
          )}</th>
          <th>${escapeHtml(
            t(
              "results.drawDetail.tableHeaders.totalPaid",
              lang === "en" ? "Total paid" : "Pagado total",
            ),
          )}</th>
          <th>${escapeHtml(thTaxSpain)}</th>
          <th>${escapeHtml(thNetSpain)}</th>
        </tr>
      </thead>
      <tbody>${body}</tbody>
    </table>

    ${footerNote}
  `;
}

/* ===========================
   HELPERS · QUINIELA
   =========================== */

function countQuinielaHits(your, drawn) {
  if (!Array.isArray(your) || !Array.isArray(drawn)) return 0;
  let hits = 0;
  for (let i = 0; i < Math.min(14, your.length, drawn.length); i++) {
    if (your[i] && drawn[i] && String(your[i]) === String(drawn[i])) hits++;
  }
  return hits;
}

function fmtQuinielaSigns(list, refList) {
  const a = Array.isArray(list) ? list : [];
  const ref = Array.isArray(refList) ? refList : [];

  let out = `<div style="display:flex;flex-wrap:wrap;gap:6px;">`;

  for (let i = 0; i < 14; i++) {
    const v = a[i] ?? "—";
    const isHit = ref[i] != null && String(ref[i]) === String(v);
    const cls = isHit ? "number ddm__hit" : "number";
    out += `<span class="${cls}">${escapeHtml(String(v))}</span>`;
  }

  out += `</div>`;
  return out;
}
