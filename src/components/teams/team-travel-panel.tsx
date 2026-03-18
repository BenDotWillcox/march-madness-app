"use client";

import dynamic from "next/dynamic";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { BracketRound, BracketState } from "@/lib/schema/bracket";
import type { Team } from "@/lib/schema/team";
import {
  buildTeamTravelProjection,
  collectMissingBracketLocationLabels,
} from "@/lib/travel/team-travel";

const TeamTravelRouteMap = dynamic(
  () => import("@/components/teams/team-travel-route-map").then((mod) => mod.TeamTravelRouteMap),
  { ssr: false },
);

type TeamTravelPanelProps = {
  team: Team;
  bracketState: BracketState;
  allTeams?: Team[];
};

const roundLabels: Record<BracketRound, string> = {
  first_four: "First Four",
  round_of_64: "Round of 64",
  round_of_32: "Round of 32",
  sweet_16: "Sweet 16",
  elite_8: "Elite 8",
  final_4: "Final Four",
  championship: "Championship",
};

function milesLabel(value: number | null) {
  if (value === null) {
    return "-";
  }
  return `${value.toLocaleString()} mi`;
}

export function TeamTravelPanel({ team, bracketState, allTeams = [] }: TeamTravelPanelProps) {
  const [open, setOpen] = useState(false);
  const [activeStopIndex, setActiveStopIndex] = useState(0);
  const teamNameById = useMemo(
    () =>
      Object.fromEntries(
        allTeams.map((candidate) => [candidate.id, candidate.name]),
      ),
    [allTeams],
  );
  const projection = useMemo(
    () =>
      buildTeamTravelProjection(bracketState, team.id, {
        label: team.homeCityState ?? null,
        lat: team.homeLat ?? null,
        lng: team.homeLng ?? null,
      }, undefined, teamNameById),
    [bracketState, team.homeCityState, team.homeLat, team.homeLng, team.id, teamNameById],
  );
  const missingBracketLocations = useMemo(
    () => collectMissingBracketLocationLabels(bracketState),
    [bracketState],
  );
  const hasHomeCoordinates = team.homeLat !== null && team.homeLat !== undefined && team.homeLng !== null && team.homeLng !== undefined;
  const maxStopIndex = Math.max(0, projection.stops.length - 1);
  const clampedActiveStopIndex = Math.max(0, Math.min(activeStopIndex, maxStopIndex));
  const activeStop = projection.stops[clampedActiveStopIndex] ?? null;
  const activeLeg = clampedActiveStopIndex > 0 ? projection.legs[clampedActiveStopIndex - 1] ?? null : null;
  const knownMilesThroughActiveStop = projection.legs
    .slice(0, clampedActiveStopIndex)
    .reduce((sum, leg) => (leg.miles !== null ? sum + leg.miles : sum), 0);
  const travelTimeline = useMemo(() => {
    if (projection.stops.length === 0) {
      return {
        points: [] as Array<{ id: string; stopIndexes: number[]; positionPercent: number; label: string }>,
        segments: [] as Array<{
          id: string;
          miles: number | null;
          widthPercent: number;
          centerPercent: number;
          label: string;
        }>,
      };
    }

    function coordKeyForIndex(stopIndex: number) {
      const stop = projection.stops[stopIndex];
      if (!stop?.coord) {
        return null;
      }
      return `${stop.coord.lat.toFixed(5)},${stop.coord.lng.toFixed(5)}`;
    }

    const collapsedPoints: Array<{ id: string; stopIndexes: number[]; label: string }> = [
      { id: projection.stops[0].id, stopIndexes: [0], label: projection.stops[0].label },
    ];
    const collapsedSegments: Array<{ id: string; miles: number | null; label: string }> = [];

    for (let stopIndex = 1; stopIndex < projection.stops.length; stopIndex += 1) {
      const stop = projection.stops[stopIndex];
      const previousStopIndex = stopIndex - 1;
      const sameAsPreviousLocation =
        coordKeyForIndex(previousStopIndex) !== null &&
        coordKeyForIndex(previousStopIndex) === coordKeyForIndex(stopIndex);

      if (sameAsPreviousLocation) {
        collapsedPoints[collapsedPoints.length - 1].stopIndexes.push(stopIndex);
        collapsedPoints[collapsedPoints.length - 1].label = stop.label;
        continue;
      }

      collapsedPoints.push({
        id: stop.id,
        stopIndexes: [stopIndex],
        label: stop.label,
      });
      const leg = projection.legs[previousStopIndex] ?? null;
      collapsedSegments.push({
        id: `${projection.stops[previousStopIndex].id}-${stop.id}`,
        miles: leg?.miles ?? null,
        label: stop.kind === "game" && stop.round ? roundLabels[stop.round] : `Leg ${collapsedSegments.length + 1}`,
      });
    }

    const knownMiles = collapsedSegments
      .map((segment) => segment.miles)
      .filter((miles): miles is number => miles !== null && miles > 0);
    const knownTotal = knownMiles.reduce((sum, miles) => sum + miles, 0);
    const fallbackMiles = knownMiles.length > 0 ? knownTotal / knownMiles.length : 1;
    const weightedSegments = collapsedSegments.map((segment) => ({
      ...segment,
      widthWeight: segment.miles !== null && segment.miles > 0 ? segment.miles : fallbackMiles,
    }));
    const totalWeight = weightedSegments.reduce((sum, segment) => sum + segment.widthWeight, 0);

    let cumulativeWeight = 0;
    const points = collapsedPoints.map((point, pointIndex) => {
      const positionPercent =
        pointIndex === 0 || totalWeight <= 0 ? 0 : Math.min(100, (cumulativeWeight / totalWeight) * 100);
      if (pointIndex < weightedSegments.length) {
        cumulativeWeight += weightedSegments[pointIndex].widthWeight;
      }
      return {
        ...point,
        positionPercent,
      };
    });
    let cumulativePercent = 0;
    const segments = weightedSegments.map((segment) => {
      const widthPercent = totalWeight > 0 ? (segment.widthWeight / totalWeight) * 100 : 0;
      const startPercent = cumulativePercent;
      cumulativePercent += widthPercent;
      return {
        id: segment.id,
        miles: segment.miles !== null ? Math.round(segment.miles) : null,
        label: segment.label,
        widthPercent,
        startPercent,
        centerPercent: startPercent + widthPercent / 2,
      };
    });

    return { points, segments };
  }, [projection.legs, projection.stops]);

  useEffect(() => {
    if (!open) {
      return;
    }
    setActiveStopIndex(0);
  }, [open, team.id]);

  if (!projection.startGameId) {
    return (
      <div className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
        Travel Path unavailable because {team.name} is not currently slotted in the bracket.
      </div>
    );
  }

  return (
    <section className="space-y-3 rounded-md border p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-base font-semibold">Tournament Travel Projection</h3>
          <p className="text-xs text-muted-foreground">
            Path assumes {team.name} wins each game through the championship.
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
          View Travel Path
        </Button>
      </div>

      <div className="space-y-2 rounded-md border p-2">
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <div className="relative h-9">
              <div className="absolute inset-x-0 top-0 h-4">
                {travelTimeline.segments.map((segment) =>
                  segment.widthPercent >= 9 ? (
                    <span
                      key={`distance-${segment.id}`}
                      className="absolute -translate-x-1/2 whitespace-nowrap text-[10px] font-medium text-muted-foreground"
                      style={{ left: `${segment.centerPercent}%` }}
                    >
                      {milesLabel(segment.miles)}
                    </span>
                  ) : null,
                )}
              </div>
              <div className="absolute left-0 right-0 top-5 flex h-2 -translate-y-1/2 overflow-hidden rounded-full border bg-muted/30">
                {travelTimeline.segments.length === 0 ? (
                  <div className="h-2 w-full bg-muted" />
                ) : (
                  travelTimeline.segments.map((segment, index) => (
                    <div
                      key={segment.id}
                      className={
                        segment.miles === null
                          ? "h-2 border-r border-background/60 bg-slate-400/50"
                          : index % 2 === 0
                            ? "h-2 border-r border-background/60 bg-blue-500/80"
                            : "h-2 border-r border-background/60 bg-orange-500/80"
                      }
                      style={{ width: `${segment.widthPercent}%` }}
                      title={`${segment.label}: ${milesLabel(segment.miles)}`}
                    />
                  ))
                )}
              </div>
              {travelTimeline.points.map((point) => (
                <span
                  key={`dot-${point.id}-${point.stopIndexes[0]}`}
                  className="absolute top-5 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-background bg-foreground"
                  style={{ left: `${point.positionPercent}%` }}
                  title={point.stopIndexes
                    .map((stopIndex) => {
                      const stop = projection.stops[stopIndex];
                      const stopRoundLabel =
                        stop.kind === "game" && stop.round ? ` (${roundLabels[stop.round]})` : "";
                      return `${stopIndex + 1}. ${stop.label}${stopRoundLabel}`;
                    })
                    .join(" | ")}
                />
              ))}
            </div>
            <div className="mt-1 flex justify-between text-[11px] text-muted-foreground">
              <span>{projection.stops[0]?.label ?? "Home"}</span>
              <span>{projection.stops[projection.stops.length - 1]?.label ?? "Final site"}</span>
            </div>
          </div>
          <p className="whitespace-nowrap text-xs font-semibold">
            {milesLabel(projection.totalMiles ?? projection.knownMilesTotal)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-[11px] text-muted-foreground">
          {travelTimeline.segments.map((segment) => (
            <span key={`${segment.id}-label`} className="rounded border px-1.5 py-0.5">
              {segment.label}: {milesLabel(segment.miles)}
            </span>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-2 text-xs">
        <Badge variant="outline">Total: {milesLabel(projection.totalMiles ?? projection.knownMilesTotal)}</Badge>
        <Badge variant="outline">Home to first site: {milesLabel(projection.firstLegMiles)}</Badge>
        {!hasHomeCoordinates ? <Badge variant="destructive">Missing team home coordinates</Badge> : null}
        {projection.totalMiles === null ? <Badge variant="secondary">Partial distance (some legs unknown)</Badge> : null}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="h-[92vh] max-w-4xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{team.name} Travel Path</DialogTitle>
            <DialogDescription>
              Starts at home, then reveal one game trip at a time.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <TeamTravelRouteMap stops={projection.stops} activeStopIndex={clampedActiveStopIndex} />
            <div className="flex items-center justify-between gap-2 rounded-md border p-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setActiveStopIndex((current) => Math.max(0, current - 1))}
                disabled={clampedActiveStopIndex <= 0}
              >
                <ChevronLeft className="size-4" />
                Prev
              </Button>
              <p className="text-xs text-muted-foreground">
                Stop {clampedActiveStopIndex + 1} of {projection.stops.length}
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setActiveStopIndex((current) => Math.min(maxStopIndex, current + 1))}
                disabled={clampedActiveStopIndex >= maxStopIndex}
              >
                Next
                <ChevronRight className="size-4" />
              </Button>
            </div>
            {activeStop ? (
              <div className="rounded-md border p-3 text-sm">
                <p className="font-medium">{activeStop.label}</p>
                <p className="text-xs text-muted-foreground">
                  {activeStop.kind === "origin"
                    ? "Home base"
                    : activeStop.round
                      ? roundLabels[activeStop.round]
                      : "Game site"}
                </p>
                {activeStop.kind === "game" ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Opponent: {activeStop.opponentLabel ?? "TBD"}
                  </p>
                ) : null}
                {activeLeg ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Leg distance: {milesLabel(activeLeg.miles ? Math.round(activeLeg.miles) : null)}
                  </p>
                ) : null}
                <p className="mt-1 text-xs text-muted-foreground">
                  Known miles through this stop: {milesLabel(Math.round(knownMilesThroughActiveStop))}
                </p>
              </div>
            ) : null}
            <div className="space-y-2">
              {projection.stops.map((stop, index) => (
                <div
                  key={stop.id}
                  className="rounded-md border p-2 text-sm"
                  style={index === clampedActiveStopIndex ? { borderColor: "#f97316" } : undefined}
                >
                  <p className="font-medium">
                    {index + 1}. {stop.label}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {stop.kind === "origin"
                      ? "Origin"
                      : stop.round
                        ? roundLabels[stop.round]
                        : "Game site"}
                  </p>
                </div>
              ))}
            </div>

            {(projection.missingCoordinates.length > 0 || missingBracketLocations.length > 0) && (
              <div className="rounded-md border border-amber-500/50 bg-amber-500/10 p-3 text-xs">
                <p className="font-semibold text-amber-700 dark:text-amber-300">
                  Missing location coordinates
                </p>
                {projection.missingCoordinates.length > 0 ? (
                  <p className="mt-1">
                    Missing for this team path: {projection.missingCoordinates.join(", ")}
                  </p>
                ) : null}
                {missingBracketLocations.length > 0 ? (
                  <p className="mt-1">
                    Missing anywhere in bracket: {missingBracketLocations.join(", ")}
                  </p>
                ) : null}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
