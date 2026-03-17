"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Minus, TrendingDown, TrendingUp, XIcon } from "lucide-react";
import { TeamNotes } from "@/components/teams/team-notes";
import { TeamNameWithLogo } from "@/components/teams/team-name-with-logo";
import { RatingGauges } from "@/components/teams/rating-gauges";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { formatRecord } from "@/lib/format";
import { getTeamLogoPath, getTeamLogoPlaceholderPath } from "@/lib/team-logo";
import type { Game } from "@/lib/schema/game";
import { normalizeTeamColor } from "@/lib/team-color";
import { teamTagBadgeClass } from "@/lib/tags";
import type { TeamNote } from "@/lib/schema/note";
import { cn } from "@/lib/utils";
import { type Team } from "@/lib/schema/team";

function metricValue(team: Team, key: string) {
  if (key in team.predictiveMetrics) {
    return team.predictiveMetrics[key as keyof Team["predictiveMetrics"]];
  }

  return team.resumeMetrics[key as keyof Team["resumeMetrics"]];
}

function winnerClass(a: number | null, b: number | null, lowerIsBetter: boolean) {
  if (a === null || b === null || a === b) {
    return "";
  }

  const aWins = lowerIsBetter ? a < b : a > b;
  return aWins ? "font-semibold text-emerald-600" : "";
}

function valueToNumber(value: unknown) {
  return typeof value === "number" ? value : null;
}

function metricDisplayValue(value: unknown) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "-";
  }

  if (Number.isInteger(value)) {
    return String(value);
  }

  return value.toFixed(1);
}

function formatQuadRecord(wins: number | undefined, losses: number | undefined) {
  if (wins === undefined || losses === undefined) {
    return "-";
  }

  return `${wins}-${losses}`;
}

type PickerSlot = "left" | "right";

type CompareViewProps = {
  teams: Team[];
  initialTeamAId?: string;
  initialTeamBId?: string;
  bracketGameId?: string;
  season?: number;
};

const predictiveCompareMetrics = [
  { key: "netRanking", label: "NET", lowerIsBetter: true },
  { key: "kenpomAdjEm", label: "KenPom", lowerIsBetter: true },
  { key: "evanMiyaRank", label: "EvanMiya", lowerIsBetter: true },
  { key: "bartTorvikRank", label: "Torvik", lowerIsBetter: true },
] as const;

const resumeCompareMetrics = [
  { key: "wab", label: "WAB", lowerIsBetter: true },
  { key: "kpi", label: "KPI", lowerIsBetter: true },
] as const;
const sideCompareMetrics = [
  { key: "offenseAdj", label: "Adj Offense", lowerIsBetter: true },
  { key: "defenseAdj", label: "Adj Defense", lowerIsBetter: true },
] as const;

type CompareMetricKey =
  | (typeof predictiveCompareMetrics)[number]["key"]
  | (typeof resumeCompareMetrics)[number]["key"]
  | (typeof sideCompareMetrics)[number]["key"];

function formatDecimal(value: number | null) {
  if (value === null || Number.isNaN(value)) {
    return "-";
  }

  if (Number.isInteger(value)) {
    return String(value);
  }

  return value.toFixed(1);
}

function formatWinProb(value: number | null) {
  if (value === null || Number.isNaN(value)) {
    return "-";
  }

  const normalized = value > 1 ? value : value * 100;
  return `${normalized.toFixed(1)}%`;
}

function normalizeWinProbPercent(value: number | null) {
  if (value === null || Number.isNaN(value)) {
    return null;
  }

  const normalized = value > 1 ? value : value * 100;
  return Math.min(100, Math.max(0, normalized));
}

function signedNumber(value: number | null) {
  if (value === null || Number.isNaN(value)) {
    return "-";
  }

  return `${value > 0 ? "+" : ""}${value.toFixed(1)}`;
}

function formatSpreadValue(value: number | null) {
  if (value === null || Number.isNaN(value)) {
    return "-";
  }

  if (value === 0) {
    return "PK";
  }

  return `${value > 0 ? "+" : ""}${value.toFixed(1)}`;
}

function favoriteTeamFromLine(line: number | null, homeTeam: string, awayTeam: string) {
  if (line === null || Number.isNaN(line) || line === 0) {
    return null;
  }

  return line < 0 ? homeTeam : awayTeam;
}

function resolveWinProbSplit(homeValue: number | null, awayValue: number | null) {
  const home = normalizeWinProbPercent(homeValue);
  const away = normalizeWinProbPercent(awayValue);

  if (home === null && away === null) {
    return null;
  }

  if (home !== null && away === null) {
    return { home, away: Math.max(0, 100 - home) };
  }

  if (home === null && away !== null) {
    return { home: Math.max(0, 100 - away), away };
  }

  const safeHome = home ?? 50;
  const safeAway = away ?? 50;
  const total = safeHome + safeAway;
  if (total <= 0) {
    return { home: 50, away: 50 };
  }

  return {
    home: (safeHome / total) * 100,
    away: (safeAway / total) * 100,
  };
}

function teamForGameSide(teamName: string, teams: Team[]) {
  const target = teamName.trim().toLowerCase();
  const matched = teams.find((team) => team.name.trim().toLowerCase() === target);
  if (!matched) {
    return null;
  }

  return {
    team: matched,
    color: normalizeTeamColor(matched.teamColor) ?? "#6B7280",
  };
}

type BettingPanelProps = {
  game: Game;
  teams: Team[];
  loading: boolean;
  error: string | null;
};

function BettingPanel({ game, teams, loading, error }: BettingPanelProps) {
  const [activeWinSlice, setActiveWinSlice] = useState<"home" | "away" | null>(null);
  const loadingText = loading ? "Loading betting lines..." : null;
  const errorText = !loading && error ? error : null;
  const home = teamForGameSide(game.home, teams);
  const away = teamForGameSide(game.away, teams);
  const homeColor = home?.color ?? "#60A5FA";
  const awayColor = away?.color ?? "#F87171";
  const winProbSplit = resolveWinProbSplit(game.homeWinProb, game.awayWinProb);
  const homeWinProb = winProbSplit?.home ?? 50;
  const awayWinProb = winProbSplit?.away ?? 50;
  const leadingSide = (() => {
    if (!winProbSplit) {
      return null;
    }
    if (homeWinProb >= awayWinProb) {
      return "home";
    }
    return "away";
  })();
  const leadingTeamName = leadingSide === "away" ? game.away : game.home;
  const spreadDifference =
    game.line === null || game.vegasLine === null || Number.isNaN(game.line) || Number.isNaN(game.vegasLine)
      ? null
      : game.line - game.vegasLine;
  const spreadAbsDifference = Math.abs(spreadDifference ?? 0);
  const spreadHasEdge = spreadDifference !== null && spreadAbsDifference >= 0.5;
  const spreadEdgeDirection =
    spreadDifference === null ? "neutral" : spreadDifference > 0 ? "over" : spreadDifference < 0 ? "under" : "neutral";
  const spreadBarWidth = Math.min((spreadAbsDifference || 0) * 6, 50);
  const spreadBarLeft = spreadEdgeDirection === "under" ? 50 - spreadBarWidth : 50;
  const spreadDirectionArrowCount =
    spreadEdgeDirection === "neutral" ? 0 : spreadBarWidth >= 26 ? 3 : spreadBarWidth >= 14 ? 2 : spreadBarWidth >= 7 ? 1 : 0;
  const spreadFavoriteTeam =
    favoriteTeamFromLine(game.vegasLine, game.home, game.away) ??
    favoriteTeamFromLine(game.line, game.home, game.away);
  const spreadUnderdogTeam =
    spreadFavoriteTeam === null ? null : spreadFavoriteTeam === game.home ? game.away : game.home;
  const spreadLeanTeam =
    spreadDifference === null || spreadDifference === 0
      ? null
      : spreadDifference < 0
        ? spreadFavoriteTeam
        : spreadUnderdogTeam;
  const spreadLeanColor =
    spreadLeanTeam === game.home ? homeColor : spreadLeanTeam === game.away ? awayColor : null;
  const spreadBarColor =
    spreadEdgeDirection === "neutral"
      ? "hsl(var(--muted-foreground))"
      : spreadLeanColor ?? (spreadEdgeDirection === "under" ? "#10B981" : "#F43F5E");
  const spreadDiffBadgeStyle =
    spreadHasEdge && spreadLeanColor
      ? {
          color: spreadLeanColor,
          borderColor: `${spreadLeanColor}66`,
          backgroundColor: `${spreadLeanColor}1A`,
        }
      : undefined;

  const totalDifference =
    game.ou === null || game.vegasOu === null || Number.isNaN(game.ou) || Number.isNaN(game.vegasOu)
      ? null
      : game.ou - game.vegasOu;
  const totalAbsDifference = Math.abs(totalDifference ?? 0);
  const totalHasEdge = totalDifference !== null && totalAbsDifference >= 1;
  const totalEdgeDirection =
    totalDifference === null ? "neutral" : totalDifference > 0 ? "over" : totalDifference < 0 ? "under" : "neutral";
  const totalIndicator = totalDifference === null ? 50 : 50 + Math.max(-45, Math.min(45, totalDifference * 2));
  const totalBarWidth = Math.min(totalAbsDifference * 2, 45);
  const totalBarLeft = totalEdgeDirection === "under" ? 50 - totalBarWidth : 50;
  const totalPercentDiff =
    totalDifference === null || game.vegasOu === null || game.vegasOu === 0
      ? null
      : ((totalDifference / game.vegasOu) * 100).toFixed(1);
  const donutSize = 224;
  const donutStroke = 32;
  const donutRadius = (donutSize - donutStroke) / 2;
  const donutCircumference = 2 * Math.PI * donutRadius;
  const homeArcLength = (homeWinProb / 100) * donutCircumference;
  const awayArcLength = donutCircumference - homeArcLength;
  const hoveredTeamLabel =
    activeWinSlice === "home"
      ? `${game.home}: ${homeWinProb.toFixed(1)}%`
      : activeWinSlice === "away"
        ? `${game.away}: ${awayWinProb.toFixed(1)}%`
        : null;

  return (
    <section className="space-y-2 rounded-lg border p-4">
      <div>
        <h4 className="text-base font-semibold">Betting Context</h4>
        <p className="text-sm text-muted-foreground">Model projection vs market line for this bracket game.</p>
      </div>
      {loadingText ? <p className="text-sm text-muted-foreground">{loadingText}</p> : null}
      {errorText ? <p className="text-sm text-destructive">{errorText}</p> : null}
      {!loading && !error ? (
        <div className="grid gap-4 lg:grid-cols-4">
          <div className="flex h-full flex-col rounded-md border p-4 lg:col-span-1">
            <p className="text-xs text-muted-foreground">Win Probability</p>
            <div className="mt-3 flex flex-1 flex-col items-center justify-between gap-3">
              <div className="relative h-56 w-56">
                <svg width={donutSize} height={donutSize} viewBox={`0 0 ${donutSize} ${donutSize}`} className="-rotate-90">
                  <circle
                    cx={donutSize / 2}
                    cy={donutSize / 2}
                    r={donutRadius}
                    fill="none"
                    stroke="hsl(var(--muted))"
                    strokeWidth={donutStroke}
                  />
                  <circle
                    cx={donutSize / 2}
                    cy={donutSize / 2}
                    r={donutRadius}
                    fill="none"
                    stroke={homeColor}
                    strokeWidth={activeWinSlice === "home" ? donutStroke + 8 : donutStroke}
                    strokeDasharray={`${homeArcLength} ${donutCircumference - homeArcLength}`}
                    style={{
                      pointerEvents: "stroke",
                      cursor: "pointer",
                      filter: activeWinSlice === "home" ? "drop-shadow(0 4px 12px rgba(0,0,0,0.35))" : undefined,
                      transition: "all 0.2s ease-out",
                    }}
                    onMouseEnter={() => setActiveWinSlice("home")}
                    onMouseLeave={() => setActiveWinSlice(null)}
                  >
                    <title>{`${game.home}: ${homeWinProb.toFixed(1)}%`}</title>
                  </circle>
                  <circle
                    cx={donutSize / 2}
                    cy={donutSize / 2}
                    r={donutRadius}
                    fill="none"
                    stroke={awayColor}
                    strokeWidth={activeWinSlice === "away" ? donutStroke + 8 : donutStroke}
                    strokeDasharray={`${awayArcLength} ${donutCircumference - awayArcLength}`}
                    strokeDashoffset={-homeArcLength}
                    style={{
                      pointerEvents: "stroke",
                      cursor: "pointer",
                      filter: activeWinSlice === "away" ? "drop-shadow(0 4px 12px rgba(0,0,0,0.35))" : undefined,
                      transition: "all 0.2s ease-out",
                    }}
                    onMouseEnter={() => setActiveWinSlice("away")}
                    onMouseLeave={() => setActiveWinSlice(null)}
                  >
                    <title>{`${game.away}: ${awayWinProb.toFixed(1)}%`}</title>
                  </circle>
                </svg>
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <img
                    src={getTeamLogoPath(leadingTeamName)}
                    alt={`${leadingTeamName} logo`}
                    width={88}
                    height={88}
                    className="object-contain"
                    loading="lazy"
                    onError={(event) => {
                      const image = event.currentTarget;
                      image.onerror = null;
                      image.src = getTeamLogoPlaceholderPath();
                    }}
                  />
                </div>
              </div>
              <div className="min-h-5 text-center text-xs font-semibold">
                {hoveredTeamLabel ? <span>{hoveredTeamLabel}</span> : null}
              </div>
              <div className="grid w-full grid-cols-2 gap-2 text-[11px] font-medium">
                <span className="flex items-center gap-2 rounded border border-white/20 px-2 py-1 text-white">
                  <span className="h-2.5 w-2.5 flex-shrink-0 rounded-full" style={{ backgroundColor: awayColor }} aria-hidden="true" />
                  <span className="min-w-0 truncate">
                    {game.away}: {awayWinProb.toFixed(1)}%
                  </span>
                </span>
                <span className="flex items-center gap-2 rounded border border-white/20 px-2 py-1 text-white">
                  <span className="h-2.5 w-2.5 flex-shrink-0 rounded-full" style={{ backgroundColor: homeColor }} aria-hidden="true" />
                  <span className="min-w-0 truncate">
                    {game.home}: {homeWinProb.toFixed(1)}%
                  </span>
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-3 lg:col-span-2">
            <div className="rounded-md border p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Spread</span>
                <Badge
                  variant={spreadLeanColor ? "outline" : "secondary"}
                  className="text-[10px] uppercase tracking-wide"
                  style={
                    spreadLeanColor
                      ? {
                          color: spreadLeanColor,
                          borderColor: `${spreadLeanColor}66`,
                          backgroundColor: `${spreadLeanColor}1A`,
                        }
                      : undefined
                  }
                >
                  {spreadLeanTeam ? `Model Lean: ${spreadLeanTeam}` : "Model Lean: None"}
                </Badge>
              </div>

              <div className="flex items-end justify-between gap-4">
                <div className="flex flex-col">
                  <span className="mb-1 text-xs text-muted-foreground">Vegas</span>
                  <span className="font-mono text-2xl font-semibold text-foreground">
                    {formatSpreadValue(game.vegasLine)}
                  </span>
                </div>

                <div className="flex flex-col items-center">
                  <div
                    className={cn(
                      "flex items-center gap-1 rounded-full border px-3 py-1",
                      spreadHasEdge && spreadLeanColor && "bg-background/50",
                      (!spreadHasEdge || !spreadLeanColor || spreadDifference === null) && "border-transparent bg-muted text-muted-foreground",
                    )}
                    style={spreadDiffBadgeStyle}
                  >
                    {spreadEdgeDirection === "under" && <ChevronLeft className="h-3.5 w-3.5" />}
                    {spreadEdgeDirection === "over" && <ChevronRight className="h-3.5 w-3.5" />}
                    {spreadEdgeDirection === "neutral" && <Minus className="h-3.5 w-3.5" />}
                    <span className="font-mono text-sm font-medium">{spreadDifference === null ? "-" : spreadAbsDifference.toFixed(1)}</span>
                  </div>
                  <span className="mt-1 text-xs text-muted-foreground">Diff</span>
                </div>

                <div className="flex flex-col items-end">
                  <span className="mb-1 text-xs text-muted-foreground">Model</span>
                  <span
                    className={cn(
                      "font-mono text-2xl font-semibold",
                      spreadHasEdge && spreadEdgeDirection === "under" && "text-emerald-700",
                      spreadHasEdge && spreadEdgeDirection === "over" && "text-rose-700",
                      (!spreadHasEdge || spreadDifference === null) && "text-foreground",
                    )}
                  >
                    {formatSpreadValue(game.line)}
                  </span>
                </div>
              </div>

              <div className="mt-4">
                <div className="relative h-3 w-full overflow-hidden rounded-full bg-muted">
                  <div className="absolute left-1/2 top-0 h-full w-0.5 bg-border" aria-hidden="true" />
                  <div
                    className={cn(
                      "absolute top-0 flex h-full items-center overflow-hidden rounded-full transition-all duration-300",
                    )}
                    style={{
                      left: `${spreadBarLeft}%`,
                      width: `${spreadBarWidth}%`,
                      backgroundColor: spreadBarColor,
                    }}
                  >
                    {spreadDirectionArrowCount > 0 ? (
                      <div
                        className={cn(
                          "flex w-full items-center px-1 text-white/90",
                          spreadEdgeDirection === "under" ? "justify-start" : "justify-end",
                        )}
                      >
                        {Array.from({ length: spreadDirectionArrowCount }).map((_, index) =>
                          spreadEdgeDirection === "under" ? (
                            <ChevronLeft key={`spread-dir-left-${index}`} className="h-2.5 w-2.5 drop-shadow-sm" aria-hidden="true" />
                          ) : (
                            <ChevronRight
                              key={`spread-dir-right-${index}`}
                              className="h-2.5 w-2.5 drop-shadow-sm"
                              aria-hidden="true"
                            />
                          ),
                        )}
                      </div>
                    ) : null}
                  </div>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <img
                    src={getTeamLogoPath(spreadFavoriteTeam ?? game.home)}
                    alt={`${spreadFavoriteTeam ?? game.home} logo`}
                    width={18}
                    height={18}
                    className="object-contain"
                    loading="lazy"
                    onError={(event) => {
                      const image = event.currentTarget;
                      image.onerror = null;
                      image.src = getTeamLogoPlaceholderPath();
                    }}
                  />
                  <img
                    src={getTeamLogoPath(spreadUnderdogTeam ?? game.away)}
                    alt={`${spreadUnderdogTeam ?? game.away} logo`}
                    width={18}
                    height={18}
                    className="object-contain"
                    loading="lazy"
                    onError={(event) => {
                      const image = event.currentTarget;
                      image.onerror = null;
                      image.src = getTeamLogoPlaceholderPath();
                    }}
                  />
                </div>
              </div>
            </div>

            <div className="rounded-md border p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Total</span>
                <div
                  className={cn(
                    "flex items-center gap-1.5 rounded-full px-2.5 py-1",
                    totalHasEdge && totalEdgeDirection === "over" && "bg-emerald-500/15",
                    totalHasEdge && totalEdgeDirection === "under" && "bg-rose-500/15",
                    (!totalHasEdge || totalDifference === null) && "bg-muted",
                  )}
                >
                  {totalEdgeDirection === "over" && (
                    <TrendingUp className={cn("h-3.5 w-3.5", totalHasEdge ? "text-emerald-700" : "text-muted-foreground")} />
                  )}
                  {totalEdgeDirection === "under" && (
                    <TrendingDown className={cn("h-3.5 w-3.5", totalHasEdge ? "text-red-700" : "text-muted-foreground")} />
                  )}
                  {totalEdgeDirection === "neutral" && <Minus className="h-3.5 w-3.5 text-muted-foreground" />}
                  <span
                    className={cn(
                      "text-xs font-semibold uppercase",
                      totalHasEdge && totalEdgeDirection === "over" && "text-emerald-700",
                      totalHasEdge && totalEdgeDirection === "under" && "text-red-700",
                      (!totalHasEdge || totalDifference === null) && "text-muted-foreground",
                    )}
                  >
                    {totalEdgeDirection === "over" ? "Over" : totalEdgeDirection === "under" ? "Under" : "Push"}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between gap-6">
                <div className="flex flex-col">
                  <span className="mb-1 text-xs text-muted-foreground">Vegas</span>
                  <span className="font-mono text-3xl font-semibold text-foreground">
                    {game.vegasOu === null || Number.isNaN(game.vegasOu) ? "-" : game.vegasOu.toFixed(1)}
                  </span>
                </div>

                <div className="flex flex-col items-center">
                  <div className="flex items-baseline gap-1">
                    <span
                      className={cn(
                        "font-mono text-xl font-bold",
                        totalHasEdge && totalEdgeDirection === "over" && "text-emerald-700",
                        totalHasEdge && totalEdgeDirection === "under" && "text-rose-700",
                        (!totalHasEdge || totalDifference === null) && "text-muted-foreground",
                      )}
                    >
                      {signedNumber(totalDifference)}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {totalPercentDiff === null ? "-" : `(${totalDifference && totalDifference > 0 ? "+" : ""}${totalPercentDiff}%)`}
                  </span>
                </div>

                <div className="flex flex-col items-end">
                  <span className="mb-1 text-xs text-muted-foreground">Model</span>
                  <span
                    className={cn(
                      "font-mono text-3xl font-semibold",
                      totalHasEdge && totalEdgeDirection === "over" && "text-emerald-700",
                      totalHasEdge && totalEdgeDirection === "under" && "text-rose-700",
                      (!totalHasEdge || totalDifference === null) && "text-foreground",
                    )}
                  >
                    {game.ou === null || Number.isNaN(game.ou) ? "-" : game.ou.toFixed(1)}
                  </span>
                </div>
              </div>

              <div className="mt-4">
                <div className="relative h-3 w-full overflow-hidden rounded-full bg-muted">
                  <div className="absolute left-1/2 top-0 z-10 h-full w-1 -translate-x-1/2 bg-orange-500/80" aria-hidden="true" />
                  <div
                    className={cn(
                      "absolute top-1/2 h-2 w-2 -translate-y-1/2 rounded-full border-2 border-background transition-all duration-300",
                      totalHasEdge && totalEdgeDirection === "over" && "bg-emerald-500",
                      totalHasEdge && totalEdgeDirection === "under" && "bg-rose-500",
                      (!totalHasEdge || totalDifference === null) && "bg-muted-foreground",
                    )}
                    style={{ left: `${totalIndicator}%` }}
                  />
                  <div
                    className={cn(
                      "absolute top-0 h-full transition-all duration-300",
                      totalHasEdge && totalEdgeDirection === "over" && "bg-emerald-500/30",
                      totalHasEdge && totalEdgeDirection === "under" && "bg-rose-500/30",
                      (!totalHasEdge || totalDifference === null) && "bg-muted-foreground/30",
                    )}
                    style={{
                      left: `${totalBarLeft}%`,
                      width: `${totalBarWidth}%`,
                    }}
                  />
                </div>
                <div className="mt-1.5 flex justify-between text-xs text-muted-foreground">
                  <span>Under</span>
                  <span>Over</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex h-full flex-col rounded-md border px-2 py-2 lg:col-span-1">
            <p className="text-xs text-muted-foreground">Predicted Score</p>
            <div className="mt-2 flex flex-1 items-center rounded-md border px-3 py-3">
              <div className="grid w-full grid-cols-[minmax(0,1fr)_2rem_minmax(0,1fr)] items-center gap-2">
                <div className="min-w-0 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <img
                      src={getTeamLogoPath(game.home)}
                      alt={`${game.home} logo`}
                      width={52}
                      height={52}
                      className="shrink-0 object-contain"
                      loading="lazy"
                      onError={(event) => {
                        const image = event.currentTarget;
                        image.onerror = null;
                        image.src = getTeamLogoPlaceholderPath();
                      }}
                    />
                    <span className="w-full truncate text-sm font-semibold">{game.home}</span>
                  </div>
                  <p className="mt-3 text-5xl font-bold leading-none">{formatDecimal(game.homeScore)}</p>
                </div>

                <div className="text-center text-xl font-semibold text-muted-foreground">-</div>

                <div className="min-w-0 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <img
                      src={getTeamLogoPath(game.away)}
                      alt={`${game.away} logo`}
                      width={52}
                      height={52}
                      className="shrink-0 object-contain"
                      loading="lazy"
                      onError={(event) => {
                        const image = event.currentTarget;
                        image.onerror = null;
                        image.src = getTeamLogoPlaceholderPath();
                      }}
                    />
                    <span className="w-full truncate text-sm font-semibold">{game.away}</span>
                  </div>
                  <p className="mt-3 text-5xl font-bold leading-none">{formatDecimal(game.awayScore)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

export function CompareView({
  teams,
  initialTeamAId,
  initialTeamBId,
  bracketGameId,
  season,
}: CompareViewProps) {
  const validInitialTeamAId =
    initialTeamAId && teams.some((team) => team.id === initialTeamAId) ? initialTeamAId : null;
  const validInitialTeamBId =
    initialTeamBId && teams.some((team) => team.id === initialTeamBId) ? initialTeamBId : null;

  const [leftTeamId, setLeftTeamId] = useState<string | null>(() => {
    if (validInitialTeamAId) {
      return validInitialTeamAId;
    }

    if (validInitialTeamBId) {
      return validInitialTeamBId;
    }

    return null;
  });
  const [rightTeamId, setRightTeamId] = useState<string | null>(() => {
    if (!validInitialTeamBId || validInitialTeamBId === validInitialTeamAId) {
      return null;
    }

    return validInitialTeamBId;
  });
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [pickerSlot, setPickerSlot] = useState<PickerSlot>("left");
  const [searchQuery, setSearchQuery] = useState("");
  const [notesByTeamId, setNotesByTeamId] = useState<Record<string, TeamNote[]>>({});
  const [loadingNotesByTeamId, setLoadingNotesByTeamId] = useState<Record<string, boolean>>({});
  const [bettingGame, setBettingGame] = useState<Game | null>(null);
  const [bettingError, setBettingError] = useState<string | null>(null);
  const [isBettingLoading, setIsBettingLoading] = useState(false);
  const requestedNotesRef = useRef<Record<string, true>>({});

  const teamA = useMemo(
    () => teams.find((team) => team.id === leftTeamId) ?? null,
    [leftTeamId, teams],
  );
  const teamB = useMemo(
    () => teams.find((team) => team.id === rightTeamId) ?? null,
    [rightTeamId, teams],
  );

  const metricMap = useMemo(
    () =>
      new Map(
        [...predictiveCompareMetrics, ...resumeCompareMetrics, ...sideCompareMetrics].map(
          (metric) => [metric.key, metric],
        ),
      ),
    [],
  );

  const filteredTeams = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return teams.filter((team) => {
      const isTakenInOtherSlot =
        pickerSlot === "left" ? team.id === rightTeamId : team.id === leftTeamId;
      if (isTakenInOtherSlot) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      return (
        team.name.toLowerCase().includes(normalizedQuery) ||
        team.conference.toLowerCase().includes(normalizedQuery) ||
        team.tags.some((tag) => tag.label.toLowerCase().includes(normalizedQuery))
      );
    });
  }, [leftTeamId, pickerSlot, rightTeamId, searchQuery, teams]);

  useEffect(() => {
    async function loadTeamNotes(teamId: string) {
      setLoadingNotesByTeamId((current) => ({ ...current, [teamId]: true }));

      try {
        const response = await fetch(`/api/notes?teamId=${encodeURIComponent(teamId)}`);
        if (!response.ok) {
          return;
        }

        const json = (await response.json()) as { notes?: TeamNote[] };
        setNotesByTeamId((current) => ({ ...current, [teamId]: json.notes ?? [] }));
      } finally {
        setLoadingNotesByTeamId((current) => ({ ...current, [teamId]: false }));
      }
    }

    const selectedTeamIds = [leftTeamId, rightTeamId].filter((teamId): teamId is string =>
      Boolean(teamId),
    );

    for (const teamId of selectedTeamIds) {
      if (requestedNotesRef.current[teamId]) {
        continue;
      }

      requestedNotesRef.current[teamId] = true;
      void loadTeamNotes(teamId);
    }
  }, [leftTeamId, rightTeamId]);

  useEffect(() => {
    if (!bracketGameId || !season) {
      setBettingGame(null);
      setBettingError(null);
      setIsBettingLoading(false);
      return;
    }

    const resolvedBracketGameId = bracketGameId;
    const resolvedSeason = season;
    let isCancelled = false;
    async function loadBettingGame() {
      setIsBettingLoading(true);
      setBettingError(null);

      try {
        const response = await fetch(
          `/api/games?bracketGameId=${encodeURIComponent(resolvedBracketGameId)}&season=${resolvedSeason}`,
        );
        if (!response.ok) {
          if (!isCancelled) {
            setBettingGame(null);
            setBettingError("Unable to load betting context.");
          }
          return;
        }

        const json = (await response.json()) as { game?: Game | null };
        if (!isCancelled) {
          setBettingGame(json.game ?? null);
          setBettingError(null);
        }
      } catch {
        if (!isCancelled) {
          setBettingGame(null);
          setBettingError("Unable to load betting context.");
        }
      } finally {
        if (!isCancelled) {
          setIsBettingLoading(false);
        }
      }
    }

    void loadBettingGame();

    return () => {
      isCancelled = true;
    };
  }, [bracketGameId, season]);

  function openPicker(slot: PickerSlot) {
    setPickerSlot(slot);
    setSearchQuery("");
    setIsPickerOpen(true);
  }

  function selectTeam(teamId: string) {
    if (pickerSlot === "left") {
      setLeftTeamId(teamId);
    } else {
      setRightTeamId(teamId);
    }

    setSearchQuery("");
    setIsPickerOpen(false);
  }

  function removeTeam(slot: PickerSlot) {
    if (slot === "left") {
      if (rightTeamId) {
        setLeftTeamId(rightTeamId);
        setRightTeamId(null);
        return;
      }

      setLeftTeamId(null);
      return;
    }

    setRightTeamId(null);
  }

  function metricClass(team: Team, opponent: Team | null, key: CompareMetricKey) {
    const metricDefinition = metricMap.get(key);
    if (!metricDefinition || !opponent) {
      return "";
    }

    const teamMetric = valueToNumber(metricValue(team, key));
    const opponentMetric = valueToNumber(metricValue(opponent, key));
    return winnerClass(teamMetric, opponentMetric, metricDefinition.lowerIsBetter);
  }

  function teamSheet(team: Team, opponent: Team | null, side: PickerSlot) {
    const accentColor = normalizeTeamColor(team.teamColor);

    return (
      <div
        className="h-full space-y-4 rounded-lg border p-4"
        style={accentColor ? { borderColor: `${accentColor}99` } : undefined}
      >
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              {team.seed ? <Badge variant="secondary">Seed {team.seed}</Badge> : null}
              <h3 className="text-2xl font-bold tracking-tight">
                <TeamNameWithLogo teamName={team.name} logoSize={34} />
              </h3>
            </div>
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">{team.conference}</span>
              {" • "}
              <span className="font-semibold text-foreground">
                {formatRecord(team.record.wins, team.record.losses)}
              </span>
            </p>
            {team.tags.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {team.tags.map((tag) => (
                  <Badge
                    key={`${tag.type}:${tag.label}`}
                    variant="outline"
                    className={teamTagBadgeClass(tag)}
                  >
                    {tag.label}
                  </Badge>
                ))}
              </div>
            ) : null}
            </div>

            <div className="flex flex-col items-end gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => openPicker(side)}>
                Change Team
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-muted-foreground"
                onClick={() => removeTeam(side)}
              >
                <XIcon className="size-4" />
                Remove
              </Button>
            </div>
          </div>

          <RatingGauges team={team} teams={teams} opponent={opponent} />
        </div>

        <div className="space-y-3">
          <h4 className="text-base font-semibold">Core Metrics</h4>
          <div className="rounded-md border p-3">
              <p className="text-center text-sm font-semibold">Predictive</p>
              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {predictiveCompareMetrics.map((metric) => {
                  const value = metricValue(team, metric.key);
                  return (
                    <div key={metric.key} className="space-y-1 text-center">
                      <p className="text-xs text-muted-foreground">{metric.label}</p>
                      <p className={cn("text-base font-medium", metricClass(team, opponent, metric.key))}>
                        {metricDisplayValue(value)}
                      </p>
                    </div>
                  );
                })}
              </div>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-md border p-3">
              <p className="text-center text-sm font-semibold">Resume</p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {resumeCompareMetrics.map((metric) => {
                  const value = metricValue(team, metric.key);
                  return (
                    <div key={metric.key} className="space-y-1 text-center">
                      <p className="text-xs text-muted-foreground">{metric.label}</p>
                      <p className={cn("text-base font-medium", metricClass(team, opponent, metric.key))}>
                        {metricDisplayValue(value)}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-md border p-3">
              <p className="text-center text-sm font-semibold">Offense</p>
              <div className="mt-2 space-y-1 text-center">
                <p className="text-xs text-muted-foreground">{sideCompareMetrics[0].label}</p>
                <p
                  className={cn(
                    "text-base font-medium",
                    metricClass(team, opponent, sideCompareMetrics[0].key),
                  )}
                >
                  {metricDisplayValue(metricValue(team, sideCompareMetrics[0].key))}
                </p>
              </div>
            </div>

            <div className="rounded-md border p-3">
              <p className="text-center text-sm font-semibold">Defense</p>
              <div className="mt-2 space-y-1 text-center">
                <p className="text-xs text-muted-foreground">{sideCompareMetrics[1].label}</p>
                <p
                  className={cn(
                    "text-base font-medium",
                    metricClass(team, opponent, sideCompareMetrics[1].key),
                  )}
                >
                  {metricDisplayValue(metricValue(team, sideCompareMetrics[1].key))}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <h4 className="text-base font-semibold">Quad Records</h4>
          <div className="grid gap-2 sm:grid-cols-4">
            <div className="rounded-md border p-3 text-center">
              <p className="text-xs text-muted-foreground">Q1</p>
              <p className="text-lg font-semibold">
                {formatQuadRecord(team.resumeMetrics.q1Wins, team.resumeMetrics.q1Losses)}
              </p>
            </div>
            <div className="rounded-md border p-3 text-center">
              <p className="text-xs text-muted-foreground">Q2</p>
              <p className="text-lg font-semibold">
                {formatQuadRecord(team.resumeMetrics.q2Wins, team.resumeMetrics.q2Losses)}
              </p>
            </div>
            <div className="rounded-md border p-3 text-center">
              <p className="text-xs text-muted-foreground">Q3</p>
              <p className="text-lg font-semibold">
                {formatQuadRecord(team.resumeMetrics.q3Wins, team.resumeMetrics.q3Losses)}
              </p>
            </div>
            <div className="rounded-md border p-3 text-center">
              <p className="text-xs text-muted-foreground">Q4</p>
              <p className="text-lg font-semibold">
                {formatQuadRecord(team.resumeMetrics.q4Wins, team.resumeMetrics.q4Losses)}
              </p>
            </div>
          </div>
        </div>

        <div>
          {loadingNotesByTeamId[team.id] ? (
            <div className="rounded-lg border p-4 text-sm text-muted-foreground">Loading notes...</div>
          ) : (
            <TeamNotes
              teamId={team.id}
              initialNotes={notesByTeamId[team.id] ?? []}
              editable={false}
              notesListClassName="max-h-72 space-y-3 overflow-y-auto pr-1"
            />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">
        How to use: click the <span className="font-semibold">+</span> button, search for a team as
        you type, and add up to two team sheets for side-by-side comparison.
      </p>
      {bracketGameId && season ? (
        bettingGame ? (
          <BettingPanel game={bettingGame} teams={teams} loading={isBettingLoading} error={bettingError} />
        ) : (
          <section className="rounded-lg border p-4">
            <h4 className="text-base font-semibold">Betting Context</h4>
            {isBettingLoading ? (
              <p className="mt-1 text-sm text-muted-foreground">Loading betting lines...</p>
            ) : (
              <p className="mt-1 text-sm text-muted-foreground">
                {bettingError ?? "No betting row found for this matchup yet."}
              </p>
            )}
          </section>
        )
      ) : null}

      {!teamA ? (
        <div className="flex min-h-[60vh] items-center justify-center rounded-lg border border-dashed">
          <Button
            type="button"
            variant="outline"
            className="h-44 w-44 text-7xl font-light"
            onClick={() => openPicker("left")}
            aria-label="Add first team"
          >
            +
          </Button>
        </div>
      ) : teamB ? (
        <div className="grid gap-4 md:grid-cols-2">
          {teamSheet(teamA, teamB, "left")}
          {teamSheet(teamB, teamA, "right")}
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_7rem]">
          {teamSheet(teamA, null, "left")}
          <div className="flex items-center justify-center rounded-lg border border-dashed">
            <Button
              type="button"
              variant="outline"
              className="h-24 w-24 text-5xl font-light"
              onClick={() => openPicker("right")}
              aria-label="Add second team"
            >
              +
            </Button>
          </div>
        </div>
      )}

      <Dialog open={isPickerOpen} onOpenChange={setIsPickerOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{pickerSlot === "left" ? "Add Team" : "Add Opponent Team"}</DialogTitle>
            <DialogDescription>
              Search by team name, conference, or tags and pick one team.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <Input
              autoFocus
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search teams..."
            />

            <div className="max-h-80 overflow-y-auto rounded-md border">
              {filteredTeams.length === 0 ? (
                <p className="p-4 text-sm text-muted-foreground">No teams found.</p>
              ) : (
                <div className="divide-y">
                  {filteredTeams.map((team) => (
                    <button
                      key={team.id}
                      type="button"
                      className="flex w-full items-center justify-between gap-2 px-3 py-3 text-left transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:outline-none"
                      onClick={() => selectTeam(team.id)}
                    >
                      <span className="font-medium">
                        <TeamNameWithLogo teamName={team.name} />
                      </span>
                      <span className="text-xs text-muted-foreground">{team.conference}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
