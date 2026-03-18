"use client";

import { useMemo, useState } from "react";
import { XIcon } from "lucide-react";
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  createRadarBounds,
  normalizeRadarToPercent,
  radarMetricGroups,
  type RadarMetricKey,
} from "@/lib/metrics/rating-normalization";
import type { Team } from "@/lib/schema/team";
import { normalizeTeamColor } from "@/lib/team-color";
import { cn } from "@/lib/utils";

type DirectCompareRadarDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teams: Team[];
  teamA: Team;
  teamB: Team;
};

type CompareMode = "like-for-like" | "counterpart";

type RadarMetricMeta = {
  label: string;
  higherIsBetter: boolean;
};

const counterpartPairs: Array<{
  offenseKey: RadarMetricKey;
  offenseLabel: string;
  defenseKey: RadarMetricKey;
  defenseLabel: string;
}> = [
  { offenseKey: "twoFgPct", offenseLabel: "2FG%", defenseKey: "twoFgPctD", defenseLabel: "2FG%D" },
  { offenseKey: "threeFgPct", offenseLabel: "3FG%", defenseKey: "threeFgPctD", defenseLabel: "3FG%D" },
  { offenseKey: "ftRate", offenseLabel: "FTRate", defenseKey: "ftRateD", defenseLabel: "FTRateD" },
  { offenseKey: "threePRate", offenseLabel: "3PRate", defenseKey: "threePRateD", defenseLabel: "3PRateD" },
  { offenseKey: "eFgPct", offenseLabel: "eFG%", defenseKey: "eFgPctD", defenseLabel: "eFG%D" },
  { offenseKey: "aRate", offenseLabel: "ARate", defenseKey: "aRateD", defenseLabel: "ARateD" },
  { offenseKey: "toPct", offenseLabel: "TO%", defenseKey: "toPctD", defenseLabel: "TO%D" },
  { offenseKey: "orPct", offenseLabel: "OR%", defenseKey: "drPct", defenseLabel: "DR%" },
];

type RadarCompareDatum = {
  axis: string;
  teamAScore: number;
  teamBScore: number;
  teamARaw: number | null;
  teamBRaw: number | null;
  teamAStatLabel: string;
  teamBStatLabel: string;
  teamAKey: RadarMetricKey;
  teamBKey: RadarMetricKey;
};

function formatRaw(value: number | null) {
  if (value === null || Number.isNaN(value)) {
    return "-";
  }

  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function formatNormalized(value: number) {
  return `${Math.round(value)}%`;
}

export function DirectCompareRadarDialog({ open, onOpenChange, teams, teamA, teamB }: DirectCompareRadarDialogProps) {
  const [mode, setMode] = useState<CompareMode>("like-for-like");
  const radarBounds = useMemo(() => createRadarBounds(teams), [teams]);
  const teamAColor = normalizeTeamColor(teamA.teamColor) ?? "hsl(var(--chart-1))";
  const teamBColor = normalizeTeamColor(teamB.teamColor) ?? "hsl(var(--chart-2))";

  const metricMetaByKey = useMemo(() => {
    const map = new Map<RadarMetricKey, RadarMetricMeta>();

    for (const group of radarMetricGroups) {
      for (const metric of group.metrics) {
        map.set(metric.key, { label: metric.label, higherIsBetter: metric.higherIsBetter });
      }
    }

    return map;
  }, []);

  const likeForLikeData = useMemo<RadarCompareDatum[]>(() => {
    const flattenedMetrics: Array<{
      key: RadarMetricKey;
      label: string;
      higherIsBetter: boolean;
    }> = [];

    for (const group of radarMetricGroups) {
      for (const metric of group.metrics) {
        flattenedMetrics.push(metric);
      }
    }

    return flattenedMetrics.map((metric) => {
      const teamARaw = teamA.predictiveMetrics[metric.key];
      const teamBRaw = teamB.predictiveMetrics[metric.key];
      const teamANormalized =
        normalizeRadarToPercent(teamARaw, radarBounds[metric.key], metric.higherIsBetter) ?? 0;
      const teamBNormalized =
        normalizeRadarToPercent(teamBRaw, radarBounds[metric.key], metric.higherIsBetter) ?? 0;

      return {
        axis: metric.label,
        teamAScore: teamANormalized,
        teamBScore: teamBNormalized,
        teamARaw: typeof teamARaw === "number" ? teamARaw : null,
        teamBRaw: typeof teamBRaw === "number" ? teamBRaw : null,
        teamAStatLabel: metric.label,
        teamBStatLabel: metric.label,
        teamAKey: metric.key,
        teamBKey: metric.key,
      };
    });
  }, [teamA, teamB, radarBounds]);

  const counterpartData = useMemo<RadarCompareDatum[]>(() => {
    const forward = counterpartPairs.map((pair) => {
      const offenseMeta = metricMetaByKey.get(pair.offenseKey);
      const defenseMeta = metricMetaByKey.get(pair.defenseKey);
      const teamARaw = teamA.predictiveMetrics[pair.offenseKey];
      const teamBRaw = teamB.predictiveMetrics[pair.defenseKey];
      const teamANormalized =
        normalizeRadarToPercent(teamARaw, radarBounds[pair.offenseKey], offenseMeta?.higherIsBetter ?? true) ?? 0;
      const teamBNormalized =
        normalizeRadarToPercent(teamBRaw, radarBounds[pair.defenseKey], defenseMeta?.higherIsBetter ?? true) ?? 0;

      return {
        axis: `${pair.offenseLabel} vs ${pair.defenseLabel}`,
        teamAScore: teamANormalized,
        teamBScore: teamBNormalized,
        teamARaw: typeof teamARaw === "number" ? teamARaw : null,
        teamBRaw: typeof teamBRaw === "number" ? teamBRaw : null,
        teamAStatLabel: pair.offenseLabel,
        teamBStatLabel: pair.defenseLabel,
        teamAKey: pair.offenseKey,
        teamBKey: pair.defenseKey,
      };
    });

    const reverse = counterpartPairs.map((pair) => {
      const offenseMeta = metricMetaByKey.get(pair.offenseKey);
      const defenseMeta = metricMetaByKey.get(pair.defenseKey);
      const teamARaw = teamA.predictiveMetrics[pair.defenseKey];
      const teamBRaw = teamB.predictiveMetrics[pair.offenseKey];
      const teamANormalized =
        normalizeRadarToPercent(teamARaw, radarBounds[pair.defenseKey], defenseMeta?.higherIsBetter ?? true) ?? 0;
      const teamBNormalized =
        normalizeRadarToPercent(teamBRaw, radarBounds[pair.offenseKey], offenseMeta?.higherIsBetter ?? true) ?? 0;

      return {
        axis: `${pair.defenseLabel} vs ${pair.offenseLabel}`,
        teamAScore: teamANormalized,
        teamBScore: teamBNormalized,
        teamARaw: typeof teamARaw === "number" ? teamARaw : null,
        teamBRaw: typeof teamBRaw === "number" ? teamBRaw : null,
        teamAStatLabel: pair.defenseLabel,
        teamBStatLabel: pair.offenseLabel,
        teamAKey: pair.defenseKey,
        teamBKey: pair.offenseKey,
      };
    });

    return [...forward, ...reverse];
  }, [metricMetaByKey, radarBounds, teamA, teamB]);

  const chartData = mode === "counterpart" ? counterpartData : likeForLikeData;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="!top-0 !left-0 !translate-x-0 !translate-y-0 h-screen w-screen !max-w-none rounded-none border-0 overflow-y-auto p-4 sm:p-6"
        showCloseButton={false}
      >
        <DialogHeader className="space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <DialogTitle>Direct Team Radar Compare</DialogTitle>
              <DialogDescription>
                Overlay both teams on one radar to compare shape and matchup edges immediately.
              </DialogDescription>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="shrink-0"
              onClick={() => onOpenChange(false)}
              aria-label="Close direct compare"
            >
              <XIcon className="size-4" />
            </Button>
          </div>

          <div className="space-y-2">
            <div className="inline-flex rounded-md border p-1">
              <Button
                type="button"
                size="sm"
                variant={mode === "like-for-like" ? "default" : "ghost"}
                onClick={() => setMode("like-for-like")}
              >
                Like-for-like
              </Button>
              <Button
                type="button"
                size="sm"
                variant={mode === "counterpart" ? "default" : "ghost"}
                onClick={() => setMode("counterpart")}
              >
                Offense vs Opponent Defense
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              {mode === "counterpart"
                ? `Each pair is shown in both directions: ${teamA.name} offense vs ${teamB.name} defense, and the mirrored reverse axis on the opposite side.`
                : "Both teams are plotted against identical metric axes."}
            </p>
          </div>
        </DialogHeader>

        <div className="space-y-4 rounded-md border p-3">
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <span className="inline-flex items-center gap-2 rounded-md border px-2 py-1">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: teamAColor }} aria-hidden="true" />
              <span className="font-medium">{teamA.name}</span>
            </span>
            <span className="inline-flex items-center gap-2 rounded-md border px-2 py-1">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: teamBColor }} aria-hidden="true" />
              <span className="font-medium">{teamB.name}</span>
            </span>
          </div>

          <div className="h-[80vh] min-h-[560px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={chartData} outerRadius="70%">
                <PolarGrid stroke="hsl(0 0% 100% / 0.8)" />
                <PolarAngleAxis dataKey="axis" tick={{ fontSize: 11 }} />
                <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                <Tooltip
                  cursor={{ stroke: "hsl(var(--foreground) / 0.6)", strokeWidth: 1 }}
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) {
                      return null;
                    }

                    const datum = payload[0]?.payload as RadarCompareDatum | undefined;
                    if (!datum) {
                      return null;
                    }

                    return (
                      <div className="space-y-1 rounded-md border bg-background/95 px-2 py-1.5 text-xs shadow-sm">
                        <p className="font-medium">{label}</p>
                        <p className="text-muted-foreground">
                          {teamA.name} {datum.teamAStatLabel}: {formatRaw(datum.teamARaw)} ({formatNormalized(datum.teamAScore)})
                        </p>
                        <p className="text-muted-foreground">
                          {teamB.name} {datum.teamBStatLabel}: {formatRaw(datum.teamBRaw)} ({formatNormalized(datum.teamBScore)})
                        </p>
                      </div>
                    );
                  }}
                />
                <Radar
                  name={teamA.name}
                  dataKey="teamAScore"
                  stroke={teamAColor}
                  fill={teamAColor}
                  fillOpacity={0.33}
                  dot={{ r: 2.5, fill: teamAColor, stroke: "hsl(var(--background))", strokeWidth: 1 }}
                />
                <Radar
                  name={teamB.name}
                  dataKey="teamBScore"
                  stroke={teamBColor}
                  fill={teamBColor}
                  fillOpacity={0.3}
                  dot={{ r: 2.5, fill: teamBColor, stroke: "hsl(var(--background))", strokeWidth: 1 }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <p className={cn("text-xs text-muted-foreground")}>
          Scores are normalized across all teams from 0-100 to make radar overlays comparable across stats.
        </p>
      </DialogContent>
    </Dialog>
  );
}
