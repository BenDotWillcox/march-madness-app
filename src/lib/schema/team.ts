import { z } from "zod";
import { TEAM_COLOR_HEX_PATTERN } from "@/lib/team-color";

const teamColorSchema = z.string().regex(TEAM_COLOR_HEX_PATTERN, "Must be a 6-digit hex color");

export const teamRecordSchema = z.object({
  wins: z.number().int().min(0),
  losses: z.number().int().min(0),
});

export const predictiveMetricsSchema = z.object({
  netRanking: z.number().nullable(),
  kenpomAdjEm: z.number().nullable(),
  evanMiyaRank: z.number().nullable().optional(),
  bartTorvikRank: z.number().nullable(),
  offenseAdj: z.number().nullable(),
  defenseAdj: z.number().nullable(),
  offRank: z.number().nullable().optional(),
  defRank: z.number().nullable().optional(),
  tempoRank: z.number().nullable().optional(),
  overallRating: z.number().nullable().optional(),
  offenseRating: z.number().nullable().optional(),
  defenseRating: z.number().nullable().optional(),
  tempoRating: z.number().nullable().optional(),
  twoFgPct: z.number().nullable().optional(),
  threeFgPct: z.number().nullable().optional(),
  ftPct: z.number().nullable().optional(),
  eFgPct: z.number().nullable().optional(),
  ftRate: z.number().nullable().optional(),
  threePRate: z.number().nullable().optional(),
  ftRateD: z.number().nullable().optional(),
  threePRateD: z.number().nullable().optional(),
  eFgPctD: z.number().nullable().optional(),
  twoFgPctD: z.number().nullable().optional(),
  threeFgPctD: z.number().nullable().optional(),
  aRateD: z.number().nullable().optional(),
  orPct: z.number().nullable().optional(),
  drPct: z.number().nullable().optional(),
  toPct: z.number().nullable().optional(),
  toPctD: z.number().nullable().optional(),
  aRate: z.number().nullable().optional(),
});

export const resumeMetricsSchema = z.object({
  q1Wins: z.number().int().min(0),
  q1Losses: z.number().int().min(0),
  q2Wins: z.number().int().min(0).optional(),
  q2Losses: z.number().int().min(0).optional(),
  q3Wins: z.number().int().min(0).optional(),
  q3Losses: z.number().int().min(0).optional(),
  q4Wins: z.number().int().min(0).optional(),
  q4Losses: z.number().int().min(0).optional(),
  wab: z.number().nullable().optional(),
  kpi: z.number().nullable().optional(),
});

export const teamTagTypeSchema = z.enum(["strength", "weakness"]);

export const teamTagSchema = z.object({
  label: z.string().trim().min(1),
  type: teamTagTypeSchema,
});

export const teamSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  conference: z.string().min(1),
  record: teamRecordSchema,
  predictiveMetrics: predictiveMetricsSchema,
  resumeMetrics: resumeMetricsSchema,
  tags: z.array(teamTagSchema).default([]),
  seed: z.number().int().min(1).max(16).optional(),
  teamColor: teamColorSchema.nullable().default(null),
  updatedAt: z.string().datetime(),
});

export const teamInputSchema = teamSchema.omit({
  updatedAt: true,
});

export const teamsFileSchema = z.array(teamSchema);

export type Team = z.infer<typeof teamSchema>;
export type TeamInput = z.infer<typeof teamInputSchema>;
export type TeamTag = z.infer<typeof teamTagSchema>;
export type TeamTagType = z.infer<typeof teamTagTypeSchema>;

export const metricDisplayOrder = [
  {
    key: "netRanking",
    label: "NET Ranking",
    lowerIsBetter: true,
    group: "predictive" as const,
  },
  {
    key: "kenpomAdjEm",
    label: "KenPom AdjEM",
    lowerIsBetter: false,
    group: "predictive" as const,
  },
  {
    key: "evanMiyaRank",
    label: "EvanMiya Rank",
    lowerIsBetter: true,
    group: "predictive" as const,
  },
  {
    key: "bartTorvikRank",
    label: "Bart Torvik Rank",
    lowerIsBetter: true,
    group: "predictive" as const,
  },
  {
    key: "offenseAdj",
    label: "Adj Offense",
    lowerIsBetter: false,
    group: "predictive" as const,
  },
  {
    key: "defenseAdj",
    label: "Adj Defense",
    lowerIsBetter: true,
    group: "predictive" as const,
  },
  {
    key: "offRank",
    label: "Off Rank",
    lowerIsBetter: true,
    group: "predictive" as const,
  },
  {
    key: "defRank",
    label: "Def Rank",
    lowerIsBetter: true,
    group: "predictive" as const,
  },
  {
    key: "tempoRank",
    label: "Tempo Rank",
    lowerIsBetter: true,
    group: "predictive" as const,
  },
  {
    key: "overallRating",
    label: "Overall Rating",
    lowerIsBetter: false,
    group: "predictive" as const,
  },
  {
    key: "offenseRating",
    label: "Offense Rating",
    lowerIsBetter: false,
    group: "predictive" as const,
  },
  {
    key: "defenseRating",
    label: "Defense Rating",
    lowerIsBetter: false,
    group: "predictive" as const,
  },
  {
    key: "tempoRating",
    label: "Tempo Rating",
    lowerIsBetter: false,
    group: "predictive" as const,
  },
  {
    key: "q1Wins",
    label: "Q1 Wins",
    lowerIsBetter: false,
    group: "resume" as const,
  },
  {
    key: "q1Losses",
    label: "Q1 Losses",
    lowerIsBetter: true,
    group: "resume" as const,
  },
] as const;

export type MetricDefinition = (typeof metricDisplayOrder)[number];
