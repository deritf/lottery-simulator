// assets/js/shared/ui/draw-log.js

import { EventBus } from "../utils/events.js";
import {
  formatCurrency,
  formatDateShort,
  padNumber,
  formatNumber,
} from "../utils/format.js";
import { getCurrentI18nDict } from "../../app/i18n.js";

let allDraws = [];
let currentFilter = "all";

let drawNumberByRef = new Map();

const PAGE_SIZE = 50;
let currentList = [];
let renderedCount = 0;
let io = null;
let sentinelEl = null;

// Keys válidas para traducir categorías de Lotería Nacional
const LN_CATEGORY_KEYS = new Set([
  "gordo",
  "segundo",
  "tercero",
  "cuartos",
  "quintos",
  "pedreas",
  "approx_gordo",
  "approx_gordo_nino",
  "approx_2",
  "approx_3",
  "centenas",

  // ordinario
  "ln_last_4",
  "ln_last_3",
  "ln_last_2",

  // niño
  "ln_extract_4",
  "ln_extract_3",
  "ln_extract_2",

  // navidad / genéricas
  "last_2",
  "last_2_segundo",
  "last_2_tercero",
  "last_1",

  // compat antiguas
  "last_4",
  "last_3",
]);

export function initDrawLog() {
  EventBus.on("sim:done", (payload) => {
    allDraws = payload.draws || [];

    drawNumberByRef = new Map();
    for (let i = 0; i < allDraws.length; i++) {
      drawNumberByRef.set(allDraws[i], i + 1);
    }

    renderDrawLog();
  });

  EventBus.on("lang:changed", () => {
    updateSpecialFilterButton(document.body.dataset.game);
    renderDrawLog();
  });

  EventBus.on("game:changed", ({ gameId }) => {
    updateSpecialFilterButton(gameId);
    currentFilter = "all";
    setActiveFilterButton("all");
    renderDrawLog();
  });

  setupFilters();
  updateSpecialFilterButton(document.body.dataset.game);
  setActiveFilterButton(currentFilter);
}

function setupFilters() {
  const filterBtns = document.querySelectorAll("[data-log-filter]");
  filterBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      if (btn.hidden) return;

      currentFilter = btn.dataset.logFilter;
      setActiveFilterButton(currentFilter);
      renderDrawLog();
    });
  });
}

function setActiveFilterButton(filterValue) {
  const filterBtns = document.querySelectorAll("[data-log-filter]");
  filterBtns.forEach((b) => b.classList.remove("is-active"));

  let active = Array.from(filterBtns).find(
    (b) => b.dataset.logFilter === filterValue && !b.hidden,
  );
  if (!active) {
    active = Array.from(filterBtns).find(
      (b) => b.dataset.logFilter === "all" && !b.hidden,
    );
  }

  if (active) active.classList.add("is-active");
}

function updateSpecialFilterButton(gameId) {
  const btn = document.querySelector(
    '[data-log-filter="joker"], [data-log-filter="millon"]',
  );
  if (!btn) return;

  const lang = document.body.dataset.lang || "es";

  const hasSpecial = gameId === "primitiva" || gameId === "euromillones";

  if (!hasSpecial) {
    btn.hidden = true;

    if (currentFilter === "joker" || currentFilter === "millon") {
      currentFilter = "all";
      setActiveFilterButton("all");
    }

    return;
  }

  btn.hidden = false;

  if (gameId === "euromillones") {
    btn.dataset.logFilter = "millon";
    btn.textContent = lang === "en" ? "Only El Millón" : "Solo El Millón";
  } else {
    btn.dataset.logFilter = "joker";
    btn.textContent = lang === "en" ? "Only Joker" : "Solo Joker";
  }
}

function renderDrawLog() {
  const container = document.getElementById("draw-log-body");
  if (!container) return;

  const lang = document.body.dataset.lang || "es";
  const dict = getCurrentI18nDict();
  const t = (path, fallback) => getByPath(dict, path) ?? fallback;

  cleanupInfinite();
  container.innerHTML = "";

  const filtered = filterDraws(allDraws, currentFilter);

  if (filtered.length === 0) {
    const emptyMsg = t(
      "results.drawlog.empty",
      lang === "en" ? "No draws to show" : "No hay sorteos para mostrar",
    );

    container.innerHTML = `
      <div style="text-align:center;padding:40px;color:var(--color-texto-secundario);">
        ${escapeHtml(emptyMsg)}
      </div>
    `;
    return;
  }

  currentList = filtered;
  renderedCount = 0;

  appendNextBatch(container);

  sentinelEl = document.createElement("div");
  sentinelEl.className = "drawlog__sentinel";
  sentinelEl.style.height = "1px";
  container.appendChild(sentinelEl);

  const scrollRoot = container.closest(".drawlog__list") || null;

  io = new IntersectionObserver(
    (entries) => {
      const entry = entries && entries[0];
      if (!entry || !entry.isIntersecting) return;
      appendNextBatch(container);
    },
    { root: scrollRoot, rootMargin: "200px 0px", threshold: 0 },
  );

  io.observe(sentinelEl);
}

function appendNextBatch(container) {
  if (renderedCount >= currentList.length) {
    stopObserverIfDone();
    return;
  }

  const next = currentList.slice(renderedCount, renderedCount + PAGE_SIZE);
  renderedCount += next.length;

  const frag = document.createDocumentFragment();
  for (const draw of next) {
    const drawNumber = drawNumberByRef.get(draw) || 0;
    frag.appendChild(createDrawCard(draw, drawNumber));
  }

  if (sentinelEl && sentinelEl.parentNode === container) {
    container.insertBefore(frag, sentinelEl);
  } else {
    container.appendChild(frag);
  }

  stopObserverIfDone();
}

function stopObserverIfDone() {
  if (renderedCount >= currentList.length && io) {
    io.disconnect();
    io = null;
  }
}

function cleanupInfinite() {
  if (io) {
    io.disconnect();
    io = null;
  }
  sentinelEl = null;
  currentList = [];
  renderedCount = 0;
}

/* ===========================
   FILTROS "SOLO JOKER / SOLO EL MILLÓN"
   =========================== */

function getJokerPrize(d) {
  const j = d?.joker;
  const v =
    j?.prize ?? j?.won ?? j?.amount ?? j?.winnings ?? j?.prizeAmount ?? 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function getMillonPrize(d) {
  const m = d?.millon;
  const v =
    m?.prize ?? m?.won ?? m?.amount ?? m?.winnings ?? m?.prizeAmount ?? 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function isJokerWin(d) {
  const j = d?.joker;
  if (!j) return false;

  if (getJokerPrize(d) > 0) return true;

  const played = String(j?.your ?? j?.played ?? j?.player ?? "").trim();
  const drawn = String(j?.drawn ?? j?.winning ?? j?.result ?? "").trim();
  if (played && drawn && played === drawn) return true;

  return false;
}

function isMillonWin(d) {
  if (d?.gameId && d.gameId !== "euromillones") return false;

  const m = d?.millon;
  if (!m) return false;

  if (getMillonPrize(d) > 0) return true;

  const played = String(m?.your ?? "").trim();
  const drawn = String(m?.drawn ?? "").trim();
  if (played && drawn && played === drawn) return true;

  return false;
}

function filterDraws(draws, filter) {
  switch (filter) {
    case "winners":
    case "wins":
      return draws.filter((d) => d.prize > 0);

    case "jackpots":
      return draws.filter(
        (d) =>
          d.category === "6R" ||
          d.category === "6" ||
          d.category === "5+2" ||
          d.category === "5+1" ||
          d.category === "6+1" ||
          d.category === "6+0",
      );

    case "joker":
      return draws.filter((d) => isJokerWin(d));

    case "millon":
      return draws.filter((d) => isMillonWin(d));

    default:
      return draws;
  }
}

function createDrawCard(draw, drawNumber) {
  const lang = document.body.dataset.lang || "es";
  const locale = lang === "en" ? "en-GB" : "es-ES";
  const dict = getCurrentI18nDict();
  const t = (path, fallback) => getByPath(dict, path) ?? fallback;

  const isQuiniela = draw?.gameId === "quiniela";
  const isLototurf = draw?.gameId === "lototurf";

  const fallbackGame = (() => {
    if (draw?.gameId === "quiniela")
      return lang === "en" ? "La Quiniela" : "La Quiniela";
    if (draw?.gameId === "euromillones")
      return lang === "en" ? "EuroMillions" : "Euromillones";
    if (draw?.gameId === "bonoloto") return "Bonoloto";
    if (draw?.gameId === "gordo")
      return lang === "en" ? "El Gordo" : "El Gordo";
    if (draw?.gameId === "eurodreams")
      return lang === "en" ? "EuroDreams" : "EuroDreams";
    if (draw?.gameId === "loteria-nacional")
      return lang === "en" ? "National Lottery" : "Lotería Nacional";
    if (draw?.gameId === "lototurf")
      return lang === "en" ? "Lototurf" : "Lototurf";
    return lang === "en" ? "La Primitiva" : "La Primitiva";
  })();

  const L_GAME_MAIN =
    draw?.gameLabel ||
    t(`games.${draw?.gameId}.label`, null) ||
    t("results.drawlog.gameMain", fallbackGame);

  const L_GAME_JOKER = t("results.drawlog.gameJoker", "Joker");
  const L_GAME_MILLON = t("meta.labels.millon", "El Millón");

  const L_YOUR = t("results.drawlog.your", lang === "en" ? "Your" : "Tu");
  const L_DRAWN = t("results.drawlog.drawn", lang === "en" ? "Draw" : "Sorteo");
  const L_CATEGORY = t(
    "results.drawlog.category",
    lang === "en" ? "Category" : "Categoría",
  );
  const L_BETS = t("results.drawlog.bets", lang === "en" ? "Bets" : "Apuestas");
  const L_JACKPOT = t(
    "results.drawlog.jackpot",
    lang === "en" ? "Jackpot" : "Bote",
  );
  const L_PRIZE = t(
    "results.drawlog.prize",
    lang === "en" ? "PRIZE" : "PREMIO",
  );

  const L_STARS = t("ui.labels.stars", lang === "en" ? "Stars" : "Estrellas");
  const L_KEY = t("ui.labels.key", lang === "en" ? "Key" : "Clave");
  const L_DREAM = t("ui.labels.dream", lang === "en" ? "Dream" : "Sueño");
  const L_HORSE = t("ui.labels.horse", lang === "en" ? "Horse" : "Caballo");

  const L_HITS = t("quiniela.hits", lang === "en" ? "Hits" : "Aciertos");
  const L_PLENO = t(
    "quiniela.pleno15",
    lang === "en" ? "Match 15" : "Pleno al 15",
  );

  const card = document.createElement("div");
  card.className = "drawlog-item";

  const isWinner = draw.prize > 0;
  const isJackpot =
    draw.category === "6R" ||
    draw.category === "6" ||
    draw.category === "5+2" ||
    draw.category === "5+1" ||
    draw.category === "6+1" ||
    draw.category === "6+0";

  if (isWinner) card.classList.add("is-win");
  if (isJackpot) card.classList.add("is-jackpot");

  const meta = document.createElement("div");
  meta.className = "drawlog-item__meta";

  const numBtn = document.createElement("button");
  numBtn.type = "button";
  numBtn.className = "drawlog-item__numBtn";
  numBtn.innerHTML = `<span class="drawlog-item__hash">#</span>${drawNumber}`;
  numBtn.addEventListener("click", () => {
    EventBus.emit("drawlog:open", { draw, drawNumber });
  });

  const d = draw?.date instanceof Date ? draw.date : new Date(draw?.date);

  const weekdayEl = document.createElement("div");
  weekdayEl.className = "drawlog-item__weekday";

  const date = document.createElement("div");
  date.className = "drawlog-item__date";

  if (!Number.isNaN(d.getTime())) {
    const weekday = new Intl.DateTimeFormat(locale, { weekday: "long" }).format(
      d,
    );
    const weekdayCap = weekday
      ? weekday[0].toUpperCase() + weekday.slice(1)
      : "";
    weekdayEl.textContent = weekdayCap || "—";
    date.textContent = formatDateShort(d, locale);
  } else {
    weekdayEl.textContent = "—";
    date.textContent = "—";
  }

  meta.appendChild(numBtn);
  meta.appendChild(weekdayEl);
  meta.appendChild(date);

  const content = document.createElement("div");
  content.className = "drawlog-item__content";

  function formatPrizeValue(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) return "—";
    return formatCurrency(n, locale);
  }

  // ============================
  // QUINIELA: render específico
  // ============================
  if (isQuiniela) {
    const line1 = document.createElement("div");
    line1.className = "drawlog-item__line";
    line1.appendChild(tagPill(L_GAME_MAIN));

    const yourSigns = Array.isArray(draw?.your?.signs) ? draw.your.signs : [];
    const drawnSigns = Array.isArray(draw?.drawn?.signs)
      ? draw.drawn.signs
      : [];

    const hits14 =
      typeof draw?.results?.player?.hits14 === "number"
        ? draw.results.player.hits14
        : countQuinielaHits14(yourSigns, drawnSigns);

    // Pleno al 15: arriba del todo (como categoría top)
    const yourPl = draw?.your?.pleno || null;
    const drawnPl = draw?.drawn?.pleno || null;
    const yourPlTxt = formatPleno(yourPl);
    const drawnPlTxt = formatPleno(drawnPl);
    const plenoMatch =
      yourPlTxt !== "—" && drawnPlTxt !== "—" && yourPlTxt === drawnPlTxt;

    line1.appendChild(
      makeGroup(L_PLENO, (root) => {
        const wrap = document.createElement("span");
        wrap.className = "drawlog-q__pleno";

        // Mostramos "Sorteo / Tú" para evitar confusión
        const a = document.createElement("span");
        a.className = "drawlog-q__pl";
        a.textContent = drawnPlTxt; // sorteo

        const sep = document.createElement("span");
        sep.className = "muted";
        sep.textContent = " / ";

        const b = document.createElement("span");
        b.className = "drawlog-q__pl";
        b.textContent = yourPlTxt; // tú

        if (plenoMatch) {
          a.classList.add("drawlog-item__match");
          b.classList.add("drawlog-item__match");
        }

        wrap.appendChild(a);
        wrap.appendChild(sep);
        wrap.appendChild(b);
        root.appendChild(wrap);
      }),
    );

    line1.appendChild(dotSep());

    // Aciertos 14: debajo del pleno
    line1.appendChild(
      makeGroup(L_HITS, (root) => {
        const v = document.createElement("strong");
        v.textContent = `${hits14}/14`;
        root.appendChild(v);
      }),
    );

    content.appendChild(line1);

    const gridLine = document.createElement("div");
    gridLine.className = "drawlog-item__line";
    gridLine.appendChild(
      makeGroup(lang === "en" ? "1X2" : "1X2", (root) => {
        root.appendChild(buildQuinielaGrid(yourSigns, drawnSigns));
      }),
    );
    content.appendChild(gridLine);

    if (draw?.bets != null || draw?.jackpot != null) {
      const line3 = document.createElement("div");
      line3.className = "drawlog-item__line";

      line3.appendChild(
        makeGroup(L_BETS, (root) => {
          const betsVal = document.createElement("span");
          betsVal.textContent =
            draw?.bets != null ? formatNumber(draw.bets, locale) : "—";
          root.appendChild(betsVal);
        }),
      );

      line3.appendChild(dotSep());

      line3.appendChild(
        makeGroup(L_JACKPOT, (root) => {
          const jackVal = document.createElement("span");

          // Preferimos variantes si existen (por si el engine expone carryover/next)
          const v =
            draw?.jackpotCarryover ??
            draw?.jackpotNext ??
            draw?.jackpot ??
            null;

          jackVal.textContent = v != null ? formatCurrency(v, locale) : "—";
          root.appendChild(jackVal);
        }),
      );

      content.appendChild(line3);
    }

    const prizeMeta = document.createElement("div");
    prizeMeta.className = "drawlog-item__prizeMeta";

    const prizeLabel = document.createElement("div");
    prizeLabel.className = "drawlog-item__prizeLabel";
    prizeLabel.textContent = L_PRIZE;

    const prizeValue = document.createElement("div");
    prizeValue.className = "drawlog-item__prizeValue";
    prizeValue.textContent = formatPrizeValue(draw?.prize);

    prizeMeta.appendChild(prizeLabel);
    prizeMeta.appendChild(prizeValue);

    card.appendChild(meta);
    card.appendChild(content);
    card.appendChild(prizeMeta);

    return card;
  }

  // ============================
  // RESTO DE JUEGOS
  // ============================

  const yourMain = draw?.your?.main || [];
  const drawnMain = draw?.drawn?.main || [];
  const yourStars = draw?.your?.stars || [];
  const drawnStars = draw?.drawn?.stars || [];

  const yourClave = draw?.your?.clave;
  const drawnClave = draw?.drawn?.clave;

  const yourDream = draw?.your?.dream;
  const drawnDream = draw?.drawn?.dream;

  const yourHorse = draw?.your?.horse;
  const drawnHorse = draw?.drawn?.horse;

  const isLN = draw?.gameId === "loteria-nacional";

  const yourSet = new Set(yourMain);
  const drawnSet = new Set(drawnMain);

  const yourStarsSet = new Set(yourStars);
  const drawnStarsSet = new Set(drawnStars);

  const line1 = document.createElement("div");
  line1.className = "drawlog-item__line";

  line1.appendChild(tagPill(L_GAME_MAIN));

  line1.appendChild(
    makeGroup(L_YOUR, (root) => {
      if (isLN) {
        for (let i = 0; i < yourMain.length; i++) {
          const pill = numPill(yourMain[i], 1);
          if (
            Array.isArray(drawnMain) &&
            drawnMain.length === yourMain.length &&
            Number(drawnMain[i]) === Number(yourMain[i])
          ) {
            pill.classList.add("drawlog-item__match");
          }
          root.appendChild(pill);
        }
      } else {
        yourMain.forEach((n) => {
          const pill = numPill(n, 2);
          if (drawnSet.has(n)) pill.classList.add("drawlog-item__match");
          root.appendChild(pill);
        });
      }

      if (Array.isArray(yourStars) && yourStars.length) {
        root.appendChild(
          kvMini(L_STARS, starsInlinePills(yourStars, drawnStarsSet), false),
        );
      }

      if (yourDream !== null && yourDream !== undefined) {
        root.appendChild(
          kvMini(
            L_DREAM,
            numPill(yourDream, 1),
            drawnDream !== null && drawnDream !== undefined
              ? Number(drawnDream) === Number(yourDream)
              : false,
          ),
        );
      }

      if (yourClave !== null && yourClave !== undefined) {
        root.appendChild(
          kvMini(
            L_KEY,
            numPill(yourClave, 1),
            drawnClave !== null && drawnClave !== undefined
              ? Number(drawnClave) === Number(yourClave)
              : false,
          ),
        );
      }

      if (isLototurf && yourHorse !== null && yourHorse !== undefined) {
        root.appendChild(
          kvMini(
            "C",
            numPill(yourHorse, 1),
            drawnHorse !== null && drawnHorse !== undefined
              ? Number(drawnHorse) === Number(yourHorse)
              : false,
          ),
        );
      }

      if (
        draw?.your?.reintegro !== null &&
        draw?.your?.reintegro !== undefined
      ) {
        root.appendChild(
          kvMini(
            "R",
            numPill(draw.your.reintegro, 1),
            draw?.drawn?.reintegro === draw?.your?.reintegro,
          ),
        );
      }
    }),
  );

  line1.appendChild(dotSep());

  line1.appendChild(
    makeGroup(L_DRAWN, (root) => {
      if (isLN) {
        for (let i = 0; i < drawnMain.length; i++) {
          const pill = numPill(drawnMain[i], 1);
          if (
            Array.isArray(yourMain) &&
            yourMain.length === drawnMain.length &&
            Number(drawnMain[i]) === Number(yourMain[i])
          ) {
            pill.classList.add("drawlog-item__match");
          }
          root.appendChild(pill);
        }
      } else {
        drawnMain.forEach((n) => {
          const pill = numPill(n, 2);
          if (yourSet.has(n)) pill.classList.add("drawlog-item__match");
          root.appendChild(pill);
        });
      }

      if (Array.isArray(drawnStars) && drawnStars.length) {
        root.appendChild(
          kvMini(L_STARS, starsInlinePills(drawnStars, yourStarsSet), false),
        );
      }

      if (drawnDream !== null && drawnDream !== undefined) {
        root.appendChild(
          kvMini(
            L_DREAM,
            numPill(drawnDream, 1),
            yourDream !== null && yourDream !== undefined
              ? Number(drawnDream) === Number(yourDream)
              : false,
          ),
        );
      }

      if (drawnClave !== null && drawnClave !== undefined) {
        root.appendChild(
          kvMini(
            L_KEY,
            numPill(drawnClave, 1),
            yourClave !== null && yourClave !== undefined
              ? Number(drawnClave) === Number(yourClave)
              : false,
          ),
        );
      }

      if (isLototurf && drawnHorse !== null && drawnHorse !== undefined) {
        root.appendChild(
          kvMini(
            "C",
            numPill(drawnHorse, 1),
            yourHorse !== null && yourHorse !== undefined
              ? Number(drawnHorse) === Number(yourHorse)
              : false,
          ),
        );
      }

      if (
        draw?.drawn?.reintegro !== null &&
        draw?.drawn?.reintegro !== undefined
      ) {
        root.appendChild(
          kvMini(
            "R",
            numPill(draw.drawn.reintegro, 1),
            draw?.drawn?.reintegro === draw?.your?.reintegro,
          ),
        );
      }
    }),
  );

  line1.appendChild(dotSep());

  const catGroup = document.createElement("span");
  catGroup.className = "drawlog-item__group";
  const catK = document.createElement("span");
  catK.className = "drawlog-item__k";
  catK.textContent = `${L_CATEGORY}:`;
  const catV = document.createElement("strong");
  catV.className = "drawlog-item__v";

  catV.textContent = resolveCategoryLabel(draw, dict, lang);

  catGroup.appendChild(catK);
  catGroup.appendChild(catV);
  line1.appendChild(catGroup);

  content.appendChild(line1);

  if (draw?.joker) {
    const line2 = document.createElement("div");
    line2.className = "drawlog-item__line";

    line2.appendChild(tagPill(L_GAME_JOKER));

    const played = String(draw?.joker?.your ?? "");
    const drawnJ = String(draw?.joker?.drawn ?? "");
    const match = jokerBestHits(played, drawnJ);

    line2.appendChild(
      makeGroup(`${L_YOUR}`, (root) => {
        const youVal = document.createElement("span");
        youVal.innerHTML = formatJokerWithHits(played, match);
        root.appendChild(youVal);
      }),
    );

    line2.appendChild(dotSep());

    line2.appendChild(
      makeGroup(`${L_DRAWN}`, (root) => {
        const drVal = document.createElement("span");
        drVal.innerHTML = drawnJ ? formatJokerWithHits(drawnJ, match) : "—";
        root.appendChild(drVal);
      }),
    );

    content.appendChild(line2);
  }

  if (draw?.millon) {
    const lineM = document.createElement("div");
    lineM.className = "drawlog-item__line";

    lineM.appendChild(tagPill(L_GAME_MILLON));

    const played = String(draw?.millon?.your ?? "");
    const drawnM = String(draw?.millon?.drawn ?? "");
    const isMatch = played && drawnM && played === drawnM;

    lineM.appendChild(
      makeGroup(`${L_YOUR}`, (root) => {
        const v = document.createElement("span");
        v.textContent = played || "—";
        if (isMatch) v.classList.add("drawlog-item__match");
        root.appendChild(v);
      }),
    );

    lineM.appendChild(dotSep());

    lineM.appendChild(
      makeGroup(`${L_DRAWN}`, (root) => {
        const v = document.createElement("span");
        v.textContent = drawnM || "—";
        if (isMatch) v.classList.add("drawlog-item__match");
        root.appendChild(v);
      }),
    );

    content.appendChild(lineM);
  }

  if (draw?.bets != null || draw?.jackpot != null) {
    const line3 = document.createElement("div");
    line3.className = "drawlog-item__line";

    line3.appendChild(
      makeGroup(L_BETS, (root) => {
        const betsVal = document.createElement("span");
        betsVal.textContent =
          draw?.bets != null ? formatNumber(draw.bets, locale) : "—";
        root.appendChild(betsVal);
      }),
    );

    line3.appendChild(dotSep());

    line3.appendChild(
      makeGroup(L_JACKPOT, (root) => {
        const jackVal = document.createElement("span");

        const v =
          draw?.jackpotCarryover ?? draw?.jackpotNext ?? draw?.jackpot ?? null;

        jackVal.textContent = v != null ? formatCurrency(v, locale) : "—";
        root.appendChild(jackVal);
      }),
    );

    content.appendChild(line3);
  }

  const prizeMeta = document.createElement("div");
  prizeMeta.className = "drawlog-item__prizeMeta";

  const prizeLabel = document.createElement("div");
  prizeLabel.className = "drawlog-item__prizeLabel";
  prizeLabel.textContent = L_PRIZE;

  const prizeValue = document.createElement("div");
  prizeValue.className = "drawlog-item__prizeValue";
  prizeValue.textContent = formatPrizeValue(draw?.prize);

  prizeMeta.appendChild(prizeLabel);
  prizeMeta.appendChild(prizeValue);

  card.appendChild(meta);
  card.appendChild(content);
  card.appendChild(prizeMeta);

  return card;

  function tagPill(text) {
    const el = document.createElement("span");
    el.className = "drawlog-item__tag";
    el.textContent = text;
    return el;
  }

  function makeGroup(label, fillFn) {
    const wrap = document.createElement("span");
    wrap.className = "drawlog-item__group";

    const k = document.createElement("span");
    k.className = "drawlog-item__k";
    k.textContent = `${label}:`;

    const v = document.createElement("span");
    v.className = "drawlog-item__v";

    wrap.appendChild(k);
    wrap.appendChild(v);

    if (typeof fillFn === "function") fillFn(v);

    return wrap;
  }

  function kvMini(key, valueNode, isMatch) {
    const mini = document.createElement("span");
    mini.className = "drawlog-item__mini";

    const k = document.createElement("span");
    k.className = "drawlog-item__kmini";
    k.textContent = `${key}:`;

    mini.appendChild(k);
    if (isMatch) valueNode.classList.add("drawlog-item__match");
    mini.appendChild(valueNode);
    return mini;
  }

  function starsInlinePills(values, matchSet) {
    const wrap = document.createElement("span");
    wrap.className = "drawlog-item__stars";

    for (const n of values) {
      const pill = numPill(n, 2);
      pill.classList.add("number--star");
      if (matchSet && matchSet.has(n))
        pill.classList.add("drawlog-item__match");
      wrap.appendChild(pill);
    }

    return wrap;
  }
}

function resolveCategoryLabel(draw, dict, lang) {
  const raw = draw?.category ?? null;

  if (draw?.gameId !== "loteria-nacional") {
    return raw ?? "—";
  }

  // 1) Buscar una key “real” (si la hubiera)
  const keyCandidates = [
    draw?.categoryKey,
    draw?.results?.player?.categoryKey,
    draw?.stats?.playerKey,
    draw?.stats?.player?.categoryKey,
  ]
    .map((x) => (x == null ? "" : String(x).trim()))
    .filter(Boolean);

  let key = keyCandidates.find((k) => LN_CATEGORY_KEYS.has(k)) || "";

  // 2) Si no hay key, inferirla desde el label (Refund, Last 2 digits..., etc.)
  if (!key) {
    key = inferLnKeyFromLabel(raw);
  }

  // 3) Si hay key válida: intentar i18n; si falta, fallback interno por idioma
  if (key && LN_CATEGORY_KEYS.has(key)) {
    const path = `results.drawDetail.categoriesLoteriaNacional.${key}`;
    const fromI18n = getByPath(dict, path);
    if (typeof fromI18n === "string" && fromI18n.trim()) return fromI18n;

    const fb = lnCategoryFallbackLabel(key, lang);
    if (fb) return fb;

    return raw ?? key;
  }

  // 4) Si no podemos resolver key, devolvemos lo que venga
  return raw ?? "—";
}

function lnCategoryFallbackLabel(key, lang) {
  const isEn = String(lang || "es").toLowerCase() === "en";

  const EN = {
    gordo: "First prize",
    segundo: "Second prize",
    tercero: "Third prize",
    cuartos: "Fourth prize",
    quintos: "Fifth prize",
    pedreas: "Pedrea",

    approx_gordo: "Approx. 1st prize (±1)",
    approx_gordo_nino: "Approx. 1st prize (±1)",
    approx_2: "Approx. 2nd prize (±1)",
    approx_3: "Approx. 3rd prize (±1)",
    centenas: "Hundreds (1st/2nd/3rd)",

    ln_last_4: "Last 4 digits",
    ln_last_3: "Last 3 digits",
    ln_last_2: "Last 2 digits",

    ln_extract_4: "Extraction (4 digits)",
    ln_extract_3: "Extraction (3 digits)",
    ln_extract_2: "Extraction (2 digits)",

    last_2: "Last 2 digits (1st)",
    last_2_segundo: "Last 2 digits (2nd)",
    last_2_tercero: "Last 2 digits (3rd)",
    last_1: "Refund",

    last_4: "Last 4 digits",
    last_3: "Last 3 digits",
  };

  const ES = {
    gordo: "Primer premio",
    segundo: "Segundo premio",
    tercero: "Tercer premio",
    cuartos: "Cuarto premio",
    quintos: "Quinto premio",
    pedreas: "Pedrea",

    approx_gordo: "Aprox. 1º premio (±1)",
    approx_gordo_nino: "Aprox. 1º premio (±1)",
    approx_2: "Aprox. 2º premio (±1)",
    approx_3: "Aprox. 3º premio (±1)",
    centenas: "Centenas (1º/2º/3º)",

    ln_last_4: "Últimas 4 cifras",
    ln_last_3: "Últimas 3 cifras",
    ln_last_2: "Últimas 2 cifras",

    ln_extract_4: "Extracción 4 cifras",
    ln_extract_3: "Extracción 3 cifras",
    ln_extract_2: "Extracción 2 cifras",

    last_2: "2 últimas cifras (1º)",
    last_2_segundo: "2 últimas cifras (2º)",
    last_2_tercero: "2 últimas cifras (3º)",
    last_1: "Reintegro",

    last_4: "Últimas 4 cifras",
    last_3: "Últimas 3 cifras",
  };

  const map = isEn ? EN : ES;
  return map[key] || "";
}

function inferLnKeyFromLabel(label) {
  const s = String(label ?? "")
    .trim()
    .toLowerCase();

  if (!s) return "";

  // Reintegro / Refund
  if (s === "reintegro" || s === "refund" || s.includes("reinteg")) {
    return "last_1";
  }

  // 2 últimas cifras / last 2 digits (navidad)
  if (
    s.includes("2 últimas cifras") ||
    s.includes("2 ultimas cifras") ||
    s.includes("last 2 digits")
  ) {
    if (
      s.includes("(2º)") ||
      s.includes("(2o)") ||
      s.includes("2º") ||
      s.includes("(2nd)") ||
      s.includes("2nd")
    ) {
      return "last_2_segundo";
    }
    if (
      s.includes("(3º)") ||
      s.includes("(3o)") ||
      s.includes("3º") ||
      s.includes("(3rd)") ||
      s.includes("3rd")
    ) {
      return "last_2_tercero";
    }
    return "last_2";
  }

  // Ordinario: últimas cifras
  if (
    s.includes("últimas 4 cifras") ||
    s.includes("ultimas 4 cifras") ||
    s.includes("last 4 digits")
  ) {
    return "ln_last_4";
  }
  if (
    s.includes("últimas 3 cifras") ||
    s.includes("ultimas 3 cifras") ||
    s.includes("last 3 digits")
  ) {
    return "ln_last_3";
  }
  if (s.includes("últimas 2 cifras") || s.includes("ultimas 2 cifras")) {
    return "ln_last_2";
  }

  // Niño: extracciones
  if (
    s.includes("extracción 4 cifras") ||
    s.includes("extraccion 4 cifras") ||
    (s.includes("extraction") && s.includes("4"))
  ) {
    return "ln_extract_4";
  }
  if (
    s.includes("extracción 3 cifras") ||
    s.includes("extraccion 3 cifras") ||
    (s.includes("extraction") && s.includes("3"))
  ) {
    return "ln_extract_3";
  }
  if (
    s.includes("extracción 2 cifras") ||
    s.includes("extraccion 2 cifras") ||
    (s.includes("extraction") && s.includes("2"))
  ) {
    return "ln_extract_2";
  }

  if (s.includes("pedrea")) return "pedreas";

  // Premios principales
  if (
    s.includes("primer premio") ||
    s.includes("first prize") ||
    s.includes("el gordo")
  )
    return "gordo";
  if (s.includes("segundo premio") || s.includes("second prize"))
    return "segundo";
  if (s.includes("tercer premio") || s.includes("third prize"))
    return "tercero";
  if (s.includes("cuarto premio") || s.includes("fourth prize"))
    return "cuartos";
  if (s.includes("quinto premio") || s.includes("fifth prize"))
    return "quintos";

  // Aproximaciones / centenas
  if (s.includes("aprox") || s.includes("approx") || s.includes("aproxim")) {
    if (
      s.includes("gordo") ||
      s.includes("1st") ||
      s.includes("1º") ||
      s.includes("1o")
    )
      return "approx_gordo";
    if (s.includes("2nd") || s.includes("2º") || s.includes("2o"))
      return "approx_2";
    if (s.includes("3rd") || s.includes("3º") || s.includes("3o"))
      return "approx_3";
  }
  if (s.includes("centenas") || s.includes("hundreds")) return "centenas";

  return "";
}

function numPill(value, pad) {
  const el = document.createElement("span");
  el.className = "number";
  el.textContent = padNumber(value, pad);
  return el;
}

function dotSep() {
  const d = document.createElement("span");
  d.className = "muted";
  d.textContent = " · ";
  return d;
}

function jokerBestHits(player, drawn) {
  const p = String(player || "");
  const d = String(drawn || "");
  const L = Math.min(p.length, d.length);

  // prefijo
  let pref = 0;
  for (let i = 0; i < L; i++) {
    if (p[i] === d[i]) pref++;
    else break;
  }

  // sufijo
  let suf = 0;
  for (let i = 0; i < L; i++) {
    const pi = p[p.length - 1 - i];
    const di = d[d.length - 1 - i];
    if (pi === di) suf++;
    else break;
  }

  const len = Math.max(pref, suf);
  if (len < 1) return { len: 0, mode: null };

  const mode = pref >= suf ? "prefix" : "suffix";
  return { len, mode };
}

function formatJokerWithHits(code, match) {
  const s = String(code || "");
  if (!s) return "—";
  if (!match || !match.len || !match.mode) return escapeHtml(s);

  const len = match.len;

  if (match.mode === "prefix") {
    const a = escapeHtml(s.slice(0, len));
    const b = escapeHtml(s.slice(len));
    return `<span class="drawlog-item__match">${a}</span>${b}`;
  }

  // suffix
  const a = escapeHtml(s.slice(0, s.length - len));
  const b = escapeHtml(s.slice(s.length - len));
  return `${a}<span class="drawlog-item__match">${b}</span>`;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function getByPath(obj, path) {
  if (!obj || !path) return null;
  return path
    .split(".")
    .reduce((acc, k) => (acc && acc[k] != null ? acc[k] : null), obj);
}

// ============================
// Quiniela helpers (drawlog)
// ============================

function normalizeSign(v) {
  const s = String(v || "")
    .trim()
    .toUpperCase();
  if (s === "1" || s === "X" || s === "2") return s;
  return null;
}

function countQuinielaHits14(yourSigns, drawnSigns) {
  const a = Array.isArray(yourSigns) ? yourSigns : [];
  const b = Array.isArray(drawnSigns) ? drawnSigns : [];
  let hits = 0;
  for (let i = 0; i < 14; i++) {
    const y = normalizeSign(a[i]);
    const d = normalizeSign(b[i]);
    if (y && d && y === d) hits++;
  }
  return hits;
}

function formatPleno(plenoObj) {
  const p = plenoObj && typeof plenoObj === "object" ? plenoObj : null;
  const h = p
    ? String(p.home ?? "")
        .trim()
        .toUpperCase()
    : "";
  const a = p
    ? String(p.away ?? "")
        .trim()
        .toUpperCase()
    : "";
  if (!h || !a) return "—";
  return `${h}-${a}`;
}

function buildQuinielaGrid(yourSigns, drawnSigns) {
  const a = Array.isArray(yourSigns) ? yourSigns : [];
  const b = Array.isArray(drawnSigns) ? drawnSigns : [];

  const grid = document.createElement("div");
  grid.className = "drawlog-q__grid";

  for (let i = 0; i < 14; i++) {
    const cell = document.createElement("div");
    cell.className = "drawlog-q__cell";

    const y = normalizeSign(a[i]);
    const d = normalizeSign(b[i]);

    const top = document.createElement("div");
    top.className = "drawlog-q__y";
    top.textContent = y ?? "—";

    const bot = document.createElement("div");
    bot.className = "drawlog-q__d";
    bot.textContent = d ?? "—";

    const isMatch = y && d && y === d;
    cell.classList.toggle("is-match", Boolean(isMatch));
    cell.classList.toggle("is-miss", Boolean(y && d && y !== d));

    const idx = document.createElement("div");
    idx.className = "drawlog-q__i";
    idx.textContent = String(i + 1);

    cell.appendChild(idx);
    cell.appendChild(top);
    cell.appendChild(bot);

    grid.appendChild(cell);
  }

  return grid;
}
