"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { XIcon } from "lucide-react";
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

export function CompareView({ teams, initialTeamAId, initialTeamBId }: CompareViewProps) {
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
