import { z } from "zod";

export const bracketRoundSchema = z.enum([
  "first_four",
  "round_of_64",
  "round_of_32",
  "sweet_16",
  "elite_8",
  "final_4",
  "championship",
]);

export const bracketSlotSchema = z.object({
  seed: z.number().int().min(1).max(16).nullable(),
  teamId: z.string().nullable(),
  sourceLabel: z.string().min(1).nullable().optional(),
});

export const bracketGameInfoSchema = z.object({
  tipoff: z.string().min(1).nullable(),
  location: z.string().min(1).nullable(),
  spread: z.string().min(1).nullable(),
  total: z.string().min(1).nullable(),
});

export const bracketGameSchema = z.object({
  id: z.string(),
  round: bracketRoundSchema,
  region: z.enum(["east", "west", "south", "midwest", "national"]),
  home: bracketSlotSchema,
  away: bracketSlotSchema,
  winnerTeamId: z.string().nullable(),
  winnerSourceLabel: z.string().min(1).nullable().optional(),
  nextGameId: z.string().nullable(),
  nextSlot: z.enum(["home", "away"]).nullable(),
  gameInfo: bracketGameInfoSchema.optional(),
});

export const bracketStateSchema = z.object({
  year: z.number().int(),
  games: z.array(bracketGameSchema),
  updatedAt: z.string().datetime(),
});

export type BracketState = z.infer<typeof bracketStateSchema>;
export type BracketGame = z.infer<typeof bracketGameSchema>;
export type BracketRound = z.infer<typeof bracketRoundSchema>;
export type BracketSlot = z.infer<typeof bracketSlotSchema>;
