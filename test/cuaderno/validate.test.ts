import { describe, expect, it } from "vitest";
import { firstError, huntInputSchema } from "../../src/app/cuaderno/validate.js";

// The shape HuntForm submits: every field is a string from FormData.
const form = {
  huntedOn: "2026-09-20",
  monsterName: "Rey Dau",
  rank: "alto",
  variant: "",
  weapon: "longsword",
  time: "18:40",
  carts: "1",
  result: "ok",
  build: "Set Rathalos, Ataque 4, Ojo crítico 3",
  hits: "Picado aéreo ×4",
  causes: ["pos", "tell"],
  cartCause: "",
  learned: "Tras el rugido hay tiempo para un contraataque",
  weaknesses: "",
  missingItems: "Antídotos",
  prep: "",
  wentWell: "",
  mainError: "",
  nextGoal: "Alejarme en diagonal cuando despega",
};

function errorFor(patch: Record<string, unknown>): string {
  const r = huntInputSchema.safeParse({ ...form, ...patch });
  expect(r.success).toBe(false);
  return firstError(r.error!);
}

describe("huntInputSchema", () => {
  it("accepts a full mockup-style submission and maps it to table values", () => {
    const r = huntInputSchema.parse(form);
    expect(r).toMatchObject({
      monsterName: "Rey Dau",
      monsterSlug: "rey-dau",
      timeSeconds: 1120,
      carts: 1,
      causes: ["pos", "tell"],
      variant: null, // blank → NULL
      cartCause: null,
      missingItems: "Antídotos",
    });
    expect(r).not.toHaveProperty("time");
  });

  it("allows a blank time", () => {
    expect(huntInputSchema.parse({ ...form, time: "" }).timeSeconds).toBeNull();
  });

  it("dedupes causes", () => {
    expect(huntInputSchema.parse({ ...form, causes: ["pos", "pos"] }).causes).toEqual(["pos"]);
  });

  it("rejects a malformed time with the mockup's message", () => {
    expect(errorFor({ time: "18:4" })).toBe(
      "Escribe el tiempo como minutos:segundos, por ejemplo 18:40.",
    );
  });

  it("requires a monster", () => {
    expect(errorFor({ monsterName: "  " })).toBe("Falta el monstruo.");
  });

  it("rejects a monster name with nothing sluggable", () => {
    expect(errorFor({ monsterName: "!!!" })).toBe("El nombre del monstruo no es válido.");
  });

  it("rejects carts above 3", () => {
    expect(errorFor({ carts: "4" })).toBe("Máximo 3 desmayos.");
  });

  it.each([
    [{ weapon: "sword" }, "Arma no válida."],
    [{ rank: "g" }, "Rango no válido."],
    [{ result: "win" }, "Resultado no válido."],
    [{ causes: ["lag"] }, "Causa no válida."],
  ])("rejects out-of-set values %j", (patch, message) => {
    expect(errorFor(patch)).toBe(message);
  });

  it("accepts all 14 weapons", () => {
    expect(huntInputSchema.parse({ ...form, weapon: "heavy-bowgun" }).weapon).toBe("heavy-bowgun");
  });
});
