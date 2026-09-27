import { huntCause, huntRank, huntResult, huntWeapon } from "../../db/schema.js";

export type HuntWeapon = (typeof huntWeapon.enumValues)[number];
export type HuntRank = (typeof huntRank.enumValues)[number];
export type HuntResult = (typeof huntResult.enumValues)[number];
export type HuntCause = (typeof huntCause.enumValues)[number];

export const HUNT_WEAPONS = huntWeapon.enumValues;
export const HUNT_RANKS = huntRank.enumValues;
export const HUNT_RESULTS = huntResult.enumValues;
export const HUNT_CAUSES = huntCause.enumValues;

/** Spanish labels for all 14 weapons (glossary: Espada Larga, Gran Espada). */
export const HUNT_WEAPON_LABELS: Record<HuntWeapon, string> = {
  greatsword: "Gran Espada",
  longsword: "Espada Larga",
  "sword-and-shield": "Espada y Escudo",
  "dual-blades": "Espadas Dobles",
  hammer: "Martillo",
  "hunting-horn": "Cornamusa",
  lance: "Lanza",
  gunlance: "Lanza Pistola",
  "switch-axe": "Hacha Espada",
  "charge-blade": "Hacha Cargada",
  "insect-glaive": "Glaive Insecto",
  bow: "Arco",
  "light-bowgun": "Ballesta Ligera",
  "heavy-bowgun": "Ballesta Pesada",
};

export const HUNT_RANK_LABELS: Record<HuntRank, string> = {
  bajo: "Bajo",
  alto: "Alto",
  maestro: "Maestro",
};

export const HUNT_RESULT_LABELS: Record<HuntResult, string> = {
  ok: "Completada",
  fail: "Fallida",
  quit: "Abandonada",
};

/** "Por qué te golpearon" chips. */
export const HUNT_CAUSE_LABELS: Record<HuntCause, string> = {
  tell: "No vi la señal",
  pos: "Mal posicionado",
  greed: "Ataqué de más",
  dodge: "Esquivé mal",
  stamina: "Sin aguante",
  heal: "Curé en mal momento",
  wind: "Rugido / viento / temblor",
  other: "Otro",
};
