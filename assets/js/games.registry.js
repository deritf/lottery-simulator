// assets/js/games.registry.js

import { PrimitivaUI } from "./games/primitiva/primitiva.ui.js";
import { createPrimitivaEngine } from "./games/primitiva/primitiva.engine.js";
import { PrimitivaConfig } from "./games/primitiva/primitiva.config.js";
import { PrimitivaJoker } from "./games/primitiva/primitiva.joker.js";

import { EuromillonesUI } from "./games/euromillones/euromillones.ui.js";
import { createEuromillonesEngine } from "./games/euromillones/euromillones.engine.js";
import { EuromillonesConfig } from "./games/euromillones/euromillones.config.js";

import { BonolotoUI } from "./games/bonoloto/bonoloto.ui.js";
import { createBonolotoEngine } from "./games/bonoloto/bonoloto.engine.js";
import { BonolotoConfig } from "./games/bonoloto/bonoloto.config.js";

import { GordoUI } from "./games/gordo/gordo.ui.js";
import { createGordoEngine } from "./games/gordo/gordo.engine.js";
import { GordoConfig } from "./games/gordo/gordo.config.js";

import { EurodreamsUI } from "./games/eurodreams/eurodreams.ui.js";
import { createEurodreamsEngine } from "./games/eurodreams/eurodreams.engine.js";
import { EurodreamsConfig } from "./games/eurodreams/eurodreams.config.js";

import { LoteriaNacionalUI } from "./games/loterianacional/loterianacional.ui.js";
import { createLoteriaNacionalEngine } from "./games/loterianacional/loterianacional.engine.js";
import { LoteriaNacionalConfig } from "./games/loterianacional/loterianacional.config.js";

import { QuinielaUI } from "./games/quiniela/quiniela.ui.js";
import { createQuinielaEngine } from "./games/quiniela/quiniela.engine.js";
import { QuinielaConfig } from "./games/quiniela/quiniela.config.js";

import { LototurfUI } from "./games/lototurf/lototurf.ui.js";
import { createLototurfEngine } from "./games/lototurf/lototurf.engine.js";
import { LototurfConfig } from "./games/lototurf/lototurf.config.js";

import { QuinigolUI } from "./games/quinigol/quinigol.ui.js";
import { createQuinigolEngine } from "./games/quinigol/quinigol.engine.js";
import { QuinigolConfig } from "./games/quinigol/quinigol.config.js";

function normalizeGameId(id) {
  return String(id || "").trim();
}

function swapHyphenUnderscore(id) {
  const s = normalizeGameId(id);
  if (!s) return s;
  if (s.includes("-")) return s.replace(/-/g, "_");
  if (s.includes("_")) return s.replace(/_/g, "-");
  return s;
}

export const GAMES_REGISTRY = {
  primitiva: {
    id: "primitiva",
    name: "La Primitiva",
    config: PrimitivaConfig,
    UI: PrimitivaUI,
    Engine: createPrimitivaEngine,
    Joker: PrimitivaJoker,
    enabled: true,
  },

  euromillones: {
    id: "euromillones",
    name: "Euromillones",
    config: EuromillonesConfig,
    UI: EuromillonesUI,
    Engine: createEuromillonesEngine,
    hasStars: true,
    enabled: true,
  },

  bonoloto: {
    id: "bonoloto",
    name: "Bonoloto",
    config: BonolotoConfig,
    UI: BonolotoUI,
    Engine: createBonolotoEngine,
    enabled: true,
  },

  gordo: {
    id: "gordo",
    name: "El Gordo de la Primitiva",
    config: GordoConfig,
    UI: GordoUI,
    Engine: createGordoEngine,
    enabled: true,
  },

  eurodreams: {
    id: "eurodreams",
    name: "EuroDreams",
    config: EurodreamsConfig,
    UI: EurodreamsUI,
    Engine: createEurodreamsEngine,
    enabled: true,
  },

  "loteria-nacional": {
    id: "loteria-nacional",
    name: "Lotería Nacional",
    config: LoteriaNacionalConfig,
    UI: LoteriaNacionalUI,
    Engine: createLoteriaNacionalEngine,
    enabled: true,
  },

  loteria_nacional: {
    id: "loteria-nacional",
    name: "Lotería Nacional",
    config: LoteriaNacionalConfig,
    UI: LoteriaNacionalUI,
    Engine: createLoteriaNacionalEngine,
    enabled: true,
  },

  quiniela: {
    id: "quiniela",
    name: "La Quiniela",
    config: QuinielaConfig,
    UI: QuinielaUI,
    Engine: createQuinielaEngine,
    enabled: true,
  },

  lototurf: {
    id: "lototurf",
    name: "Lototurf",
    config: LototurfConfig,
    UI: LototurfUI,
    Engine: createLototurfEngine,
    enabled: true,
  },

  lototuf: {
    id: "lototurf",
    name: "Lototurf",
    config: LototurfConfig,
    UI: LototurfUI,
    Engine: createLototurfEngine,
    enabled: true,
  },

  "loto-turf": {
    id: "lototurf",
    name: "Lototurf",
    config: LototurfConfig,
    UI: LototurfUI,
    Engine: createLototurfEngine,
    enabled: true,
  },

  loto_turf: {
    id: "lototurf",
    name: "Lototurf",
    config: LototurfConfig,
    UI: LototurfUI,
    Engine: createLototurfEngine,
    enabled: true,
  },

  quinigol: {
    id: "quinigol",
    name: "El Quinigol",
    config: QuinigolConfig,
    UI: QuinigolUI,
    Engine: createQuinigolEngine,
    enabled: true,
  },
};

export function getGame(gameId) {
  const id = normalizeGameId(gameId);
  if (!id) return null;

  if (GAMES_REGISTRY[id]) return GAMES_REGISTRY[id];

  const swapped = swapHyphenUnderscore(id);
  if (GAMES_REGISTRY[swapped]) return GAMES_REGISTRY[swapped];

  return null;
}

export function getEnabledGames() {
  const enabled = Object.values(GAMES_REGISTRY).filter((g) => g.enabled);

  const seen = new Set();
  const unique = [];
  for (const g of enabled) {
    const id = String(g.id || "");
    if (seen.has(id)) continue;
    seen.add(id);
    unique.push(g);
  }
  return unique;
}

export function getAllGames() {
  const all = Object.values(GAMES_REGISTRY);
  const seen = new Set();
  const unique = [];
  for (const g of all) {
    const id = String(g.id || "");
    if (seen.has(id)) continue;
    seen.add(id);
    unique.push(g);
  }
  return unique;
}

export function isGameEnabled(gameId) {
  const game = getGame(gameId);
  return game ? game.enabled : false;
}
