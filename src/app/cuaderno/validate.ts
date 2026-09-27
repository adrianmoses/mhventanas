import { z } from "zod";
import { parseTime, slugifyMonster } from "./format.js";
import { HUNT_CAUSES, HUNT_RANKS, HUNT_RESULTS, HUNT_WEAPONS } from "./labels.js";

/** Closed-set field with a Spanish error message instead of zod's default. */
function oneOf<T extends [string, ...string[]]>(values: T, message: string) {
  return z.enum(values, { errorMap: () => ({ message }) });
}

/** Blank strings become null so optional text columns stay NULL, not "". */
const optionalText = z
  .string()
  .max(2000, "Texto demasiado largo.")
  .optional()
  .nullable()
  .transform((v) => (v && v.trim() ? v.trim() : null));

/**
 * The hunt form as submitted (all strings, like the mockup's form fields).
 * Parsed into the shape the `hunts` table stores.
 */
export const huntInputSchema = z
  .object({
    huntedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Falta la fecha."),
    monsterName: z.string().trim().min(1, "Falta el monstruo.").max(80),
    rank: oneOf(HUNT_RANKS, "Rango no válido."),
    variant: optionalText,
    weapon: oneOf(HUNT_WEAPONS, "Arma no válida."),
    time: z.string().optional().default(""),
    carts: z.coerce
      .number({ message: "Desmayos no válidos." })
      .int("Desmayos no válidos.")
      .min(0, "Desmayos no válidos.")
      .max(3, "Máximo 3 desmayos."),
    result: oneOf(HUNT_RESULTS, "Resultado no válido."),
    build: optionalText,
    hits: optionalText,
    causes: z.array(oneOf(HUNT_CAUSES, "Causa no válida.")).default([]),
    cartCause: optionalText,
    learned: optionalText,
    weaknesses: optionalText,
    missingItems: optionalText,
    prep: optionalText,
    wentWell: optionalText,
    mainError: optionalText,
    nextGoal: optionalText,
  })
  .superRefine((v, ctx) => {
    if (v.time.trim() && parseTime(v.time) == null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["time"],
        message: "Escribe el tiempo como minutos:segundos, por ejemplo 18:40.",
      });
    }
    if (!slugifyMonster(v.monsterName)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["monsterName"],
        message: "El nombre del monstruo no es válido.",
      });
    }
  })
  .transform(({ time, monsterName, causes, ...rest }) => ({
    ...rest,
    monsterName,
    monsterSlug: slugifyMonster(monsterName),
    timeSeconds: parseTime(time),
    causes: [...new Set(causes)],
  }));

export type HuntFormInput = z.input<typeof huntInputSchema>;
export type HuntValues = z.output<typeof huntInputSchema>;

/** First validation message, for the form's single status line. */
export function firstError(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Revisa los datos de la cacería.";
}
