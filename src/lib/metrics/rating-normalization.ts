import type { Team } from "@/lib/schema/team";

export const ratingGaugeMetrics = [
  { key: "overallRating", label: "Overall", rankKey: "evanMiyaRank" },
  { key: "offenseRating", label: "Offense", rankKey: "offRank" },
  { key: "defenseRating", label: "Defense", rankKey: "defRank" },
  { key: "tempoRating", label: "Tempo", rankKey: "tempoRank" },
] as const;

export const radarMetricGroups = [
  {
    key: "shooting",
    label: "Shooting",
    metrics: [
      { key: "twoFgPct", label: "2FG%", higherIsBetter: true },
      { key: "threeFgPct", label: "3FG%", higherIsBetter: true },
      { key: "ftPct", label: "FT%", higherIsBetter: true },
      { key: "eFgPct", label: "eFG%", higherIsBetter: true },
      { key: "ftRate", label: "FTRate", higherIsBetter: true },
      { key: "threePRate", label: "3PRate", higherIsBetter: true },
    ],
  },
  {
    key: "defense",
    label: "Defense",
    metrics: [
      { key: "ftRateD", label: "FTRateD", higherIsBetter: false },
      { key: "threePRateD", label: "3PRateD", higherIsBetter: false },
      { key: "eFgPctD", label: "eFG%D", higherIsBetter: false },
      { key: "twoFgPctD", label: "2FG%D", higherIsBetter: false },
      { key: "threeFgPctD", label: "3FG%D", higherIsBetter: false },
      { key: "aRateD", label: "ARateD", higherIsBetter: false },
    ],
  },
  {
    key: "possession",
    label: "Possession",
    metrics: [
      { key: "orPct", label: "OR%", higherIsBetter: true },
      { key: "drPct", label: "DR%", higherIsBetter: false },
      { key: "toPct", label: "TO%", higherIsBetter: false },
      { key: "toPctD", label: "TO%D", higherIsBetter: true },
      { key: "aRate", label: "ARate", higherIsBetter: true },
    ],
  },
] as const;

export type RatingGaugeMetricKey = (typeof ratingGaugeMetrics)[number]["key"];
export type RadarMetricKey = (typeof radarMetricGroups)[number]["metrics"][number]["key"];
type RankMetricKey = NonNullable<(typeof ratingGaugeMetrics)[number]["rankKey"]>;

type RatingBounds = Record<
  RatingGaugeMetricKey,
  {
    min: number;
    max: number;
  } | null
>;

export type RadarBounds = Record<
  RadarMetricKey,
  {
    min: number;
    max: number;
  } | null
>;

export function createRatingBounds(teams: Team[]): RatingBounds {
  return ratingGaugeMetrics.reduce<RatingBounds>((acc, metric) => {
    const values = teams
      .map((team) => team.predictiveMetrics[metric.key])
      .filter((value): value is number => typeof value === "number" && Number.isFinite(value));

    if (values.length === 0) {
      acc[metric.key] = null;
      return acc;
    }

    acc[metric.key] = {
      min: Math.min(...values),
      max: Math.max(...values),
    };
    return acc;
  }, {} as RatingBounds);
}

export function createRadarBounds(teams: Team[]): RadarBounds {
  const radarMetrics: Array<{
    key: RadarMetricKey;
    label: string;
    higherIsBetter: boolean;
  }> = [];

  for (const group of radarMetricGroups) {
    for (const metric of group.metrics) {
      radarMetrics.push(metric);
    }
  }

  return radarMetrics.reduce<RadarBounds>((acc, metric) => {
    const values = teams
      .map((team) => team.predictiveMetrics[metric.key])
      .filter((value): value is number => typeof value === "number" && Number.isFinite(value));

    if (values.length === 0) {
      acc[metric.key] = null;
      return acc;
    }

    acc[metric.key] = {
      min: Math.min(...values),
      max: Math.max(...values),
    };
    return acc;
  }, {} as RadarBounds);
}

export function normalizeRatingToPercent(
  value: number | null | undefined,
  bounds: { min: number; max: number } | null | undefined,
) {
  if (value === null || value === undefined || !bounds) {
    return null;
  }

  if (bounds.max <= bounds.min) {
    return 50;
  }

  const ratio = (value - bounds.min) / (bounds.max - bounds.min);
  return Math.max(0, Math.min(100, ratio * 100));
}

export function normalizeRadarToPercent(
  value: number | null | undefined,
  bounds: { min: number; max: number } | null | undefined,
  higherIsBetter: boolean,
) {
  if (value === null || value === undefined || !bounds) {
    return null;
  }

  if (bounds.max <= bounds.min) {
    return 50;
  }

  const ratio = higherIsBetter
    ? (value - bounds.min) / (bounds.max - bounds.min)
    : (bounds.max - value) / (bounds.max - bounds.min);

  return Math.max(0, Math.min(100, ratio * 100));
}

export function metricWinnerClass(
  value: number | null | undefined,
  opponentValue: number | null | undefined,
) {
  if (value === null || value === undefined || opponentValue === null || opponentValue === undefined) {
    return "";
  }

  if (value === opponentValue) {
    return "";
  }

  return value > opponentValue ? "text-emerald-600 font-semibold" : "";
}

export function ratingScaleColor(normalizedPercent: number | null | undefined) {
  if (normalizedPercent === null || normalizedPercent === undefined) {
    return "hsl(220 9% 46%)";
  }

  // 0 -> red, 50 -> yellow, 100 -> green
  const hue = Math.max(0, Math.min(120, (normalizedPercent / 100) * 120));
  return `hsl(${hue} 78% 46%)`;
}

export function rankDisplay(
  team: Team,
  metric: { rankKey: RankMetricKey | null },
) {
  if (!metric.rankKey) {
    return null;
  }

  const value = team.predictiveMetrics[metric.rankKey];
  return typeof value === "number" && Number.isFinite(value) ? `#${Math.trunc(value)}` : null;
}
