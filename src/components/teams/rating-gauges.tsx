"use client";

import type { Team } from "@/lib/schema/team";
import { ChartContainer, type ChartConfig } from "@/components/ui/chart";
import { normalizeTeamColor } from "@/lib/team-color";
import { cn } from "@/lib/utils";
import {
  createRatingBounds,
  createRadarBounds,
  metricWinnerClass,
  normalizeRadarToPercent,
  normalizeRatingToPercent,
  radarMetricGroups,
  ratingScaleColor,
  rankDisplay,
  ratingGaugeMetrics,
} from "@/lib/metrics/rating-normalization";
import {
  Label,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  RadialBar,
  RadialBarChart,
} from "recharts";

type RatingGaugesProps = {
  team: Team;
  teams: Team[];
  opponent?: Team | null;
  className?: string;
};

function formatRatingValue(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "-";
  }

  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

export function RatingGauges({ team, teams, opponent = null, className }: RatingGaugesProps) {
  const bounds = createRatingBounds(teams);
  const radarBounds = createRadarBounds(teams);
  const radarColor = normalizeTeamColor(team.teamColor) ?? "hsl(var(--chart-1))";

  return (
    <div className={cn("w-full rounded-md border p-3", className)}>
      <p className="mb-2 text-sm font-semibold">Ratings</p>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {ratingGaugeMetrics.map((metric) => {
          const value = team.predictiveMetrics[metric.key];
          const opponentValue = opponent?.predictiveMetrics[metric.key];
          const normalizedPercent = normalizeRatingToPercent(value, bounds[metric.key]);
          const normalizedValue = normalizedPercent ?? 0;
          const percentLabel = normalizedPercent == null ? "--" : `${Math.round(normalizedPercent)}%`;
          const rank = rankDisplay(team, metric);
          const chartData = [
            {
              name: metric.label,
              value: normalizedValue,
              fill: ratingScaleColor(normalizedPercent),
            },
          ];
          const chartConfig = {
            metric: {
              label: metric.label,
              color: ratingScaleColor(normalizedPercent),
            },
          } satisfies ChartConfig;

          return (
            <div key={metric.key} className="rounded-md border p-2">
              <div className="mb-1.5 flex items-center justify-between gap-2 text-[11px]">
                <p className="font-medium text-muted-foreground">{metric.label}</p>
                {rank ? (
                  <span className="rounded-sm border px-1 py-0.5 text-[10px] text-muted-foreground">
                    {rank}
                  </span>
                ) : null}
              </div>

              <div className="flex items-center gap-2">
                <ChartContainer config={chartConfig} className="size-16">
                  <RadialBarChart
                    data={chartData}
                    width={64}
                    height={64}
                    cx={32}
                    cy={32}
                    startAngle={90}
                    endAngle={-270}
                    innerRadius={20}
                    outerRadius={30}
                  >
                    <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
                    <PolarRadiusAxis tick={false} tickLine={false} axisLine={false} domain={[0, 100]}>
                      <Label
                        content={({ viewBox }) => {
                          if (!viewBox || !("cx" in viewBox) || !("cy" in viewBox)) {
                            return null;
                          }
                          return (
                            <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
                              <tspan x={viewBox.cx} y={viewBox.cy} className="fill-foreground text-[10px] font-semibold">
                                {percentLabel}
                              </tspan>
                            </text>
                          );
                        }}
                      />
                    </PolarRadiusAxis>
                    <RadialBar
                      dataKey="value"
                      background={{ fill: "hsl(var(--muted))" }}
                      cornerRadius={6}
                    />
                  </RadialBarChart>
                </ChartContainer>

                <div className="min-w-0">
                  <p className={cn("text-sm font-semibold", metricWinnerClass(value, opponentValue))}>
                    {formatRatingValue(value)}
                  </p>
                  <p className="text-[10px] text-muted-foreground">raw rating</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-3 grid gap-2.5 md:grid-cols-3">
        {radarMetricGroups.map((group) => {
          const radarData = group.metrics.map((metric) => {
            const rawValue = team.predictiveMetrics[metric.key];
            const normalized = normalizeRadarToPercent(
              rawValue,
              radarBounds[metric.key],
              metric.higherIsBetter,
            );
            return {
              stat: metric.label,
              score: normalized ?? 0,
              rawValue,
            };
          });

          const radarConfig = {
            radar: {
              label: group.label,
              color: radarColor,
            },
          } satisfies ChartConfig;

          return (
            <div key={group.key} className="rounded-md border p-2">
              <p className="mb-1.5 text-[11px] font-medium text-muted-foreground">{group.label}</p>
              <ChartContainer config={radarConfig} className="h-44 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData} outerRadius="72%">
                    <PolarGrid stroke="hsl(0 0% 100% / 0.8)" />
                    <PolarAngleAxis dataKey="stat" tick={{ fontSize: 10 }} />
                    <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                    <Tooltip
                      cursor={{ stroke: "hsl(0 0% 100% / 0.8)", strokeWidth: 1 }}
                      content={({ active, payload, label }) => {
                        if (!active || !payload?.length) {
                          return null;
                        }

                        const point = payload[0]?.payload as
                          | { rawValue: number | null; score: number }
                          | undefined;
                        const rawValue =
                          point?.rawValue == null || Number.isNaN(point.rawValue)
                            ? "-"
                            : Number.isInteger(point.rawValue)
                              ? String(point.rawValue)
                              : point.rawValue.toFixed(1);
                        const normalized = point?.score == null ? "-" : `${Math.round(point.score)}%`;

                        return (
                          <div className="rounded-md border bg-background/95 px-2 py-1.5 text-xs shadow-sm">
                            <p className="font-medium">{label}</p>
                            <p className="text-muted-foreground">Raw: {rawValue}</p>
                            <p className="text-muted-foreground">Normalized: {normalized}</p>
                          </div>
                        );
                      }}
                    />
                    <Radar
                      dataKey="score"
                      stroke={radarColor}
                      fill={radarColor}
                      fillOpacity={0.5}
                      dot={{
                        r: 3,
                        fill: "hsl(0 0% 100%)",
                        stroke: radarColor,
                        strokeWidth: 1,
                      }}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </ChartContainer>
            </div>
          );
        })}
      </div>
    </div>
  );
}
