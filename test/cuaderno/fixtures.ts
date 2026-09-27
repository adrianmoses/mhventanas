import type { Hunt } from "../../src/app/cuaderno/stats.js";

const blank = {
  variant: null,
  build: null,
  hits: null,
  cartCause: null,
  learned: null,
  weaknesses: null,
  missingItems: null,
  prep: null,
  wentWell: null,
  mainError: null,
  nextGoal: null,
} as const;

/** Build a Hunt with sensible defaults. */
export function hunt(p: Partial<Hunt> & Pick<Hunt, "id">): Hunt {
  return {
    huntedOn: "2026-09-20",
    monsterName: "Rathalos",
    monsterSlug: "rathalos",
    rank: "alto",
    weapon: "longsword",
    timeSeconds: null,
    carts: 0,
    result: "ok",
    causes: [],
    ...blank,
    ...p,
  };
}

/** The mockup's three sample entries. */
export const SAMPLES: Hunt[] = [
  hunt({
    id: 1,
    huntedOn: "2026-09-20",
    build: "Set Rathalos, Ataque 4, Ojo crítico 3",
    timeSeconds: 1120,
    carts: 1,
    hits: "Picado aéreo ×4, bola de fuego ×2",
    causes: ["pos", "tell"],
    cartCause: "Picado aéreo mientras me curaba",
    learned: "Tras el rugido hay tiempo para un contraataque",
    weaknesses: "Débil al dragón. Rompí cabeza",
    missingItems: "Antídotos",
    nextGoal: "Alejarme en diagonal cuando despega",
  }),
  hunt({
    id: 2,
    huntedOn: "2026-09-24",
    timeSeconds: 955,
    hits: "Coletazo ×2",
    causes: ["greed"],
    prep: "Comí defensa, 1 trampa de choque",
    nextGoal: "Parar tras el primer castigo al coletazo",
  }),
  hunt({
    id: 3,
    huntedOn: "2026-09-25",
    monsterName: "Nargacuga",
    monsterSlug: "nargacuga",
    timeSeconds: 1380,
    carts: 2,
    causes: ["tell", "stamina", "greed"],
    missingItems: "Bebidas de resistencia",
    weaknesses: "Débil al trueno",
    nextGoal: "Esquivar hacia un lado del coletazo vertical",
  }),
];
