import { z } from "zod";

const numericValueSchema = z.union([
  z.number(),
  z.string().trim().min(1).transform((value) => Number(value)),
]);

const nullableNumericValueSchema = z.union([numericValueSchema, z.null()]);

function finiteOrNull(value: number | null) {
  return value === null || Number.isFinite(value);
}

export const gameSchema = z.object({
  gameId: z.number().int(),
  season: z.number().int(),
  bracketGameId: z.string().min(1),
  home: z.string().min(1),
  away: z.string().min(1),
  homeScore: nullableNumericValueSchema.refine(finiteOrNull, "Must be a valid number or null"),
  awayScore: nullableNumericValueSchema.refine(finiteOrNull, "Must be a valid number or null"),
  line: nullableNumericValueSchema.refine(finiteOrNull, "Must be a valid number or null"),
  vegasLine: nullableNumericValueSchema.refine(finiteOrNull, "Must be a valid number or null"),
  ou: nullableNumericValueSchema.refine(finiteOrNull, "Must be a valid number or null"),
  vegasOu: nullableNumericValueSchema.refine(finiteOrNull, "Must be a valid number or null"),
  homeWinProb: nullableNumericValueSchema.refine(finiteOrNull, "Must be a valid number or null"),
  awayWinProb: nullableNumericValueSchema.refine(finiteOrNull, "Must be a valid number or null"),
});

export type Game = z.infer<typeof gameSchema>;
