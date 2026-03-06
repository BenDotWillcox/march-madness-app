"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PencilIcon } from "lucide-react";
import { TeamNameWithLogo } from "@/components/teams/team-name-with-logo";
import { TeamNotes } from "@/components/teams/team-notes";
import { RatingGauges } from "@/components/teams/rating-gauges";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { normalizeTeamColor } from "@/lib/team-color";
import type { TeamNote } from "@/lib/schema/note";
import type { Team } from "@/lib/schema/team";

type TeamSheetEditorProps = {
  team: Team;
  notes: TeamNote[];
  allTeams: Team[];
};

function numberOrNull(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

function intOrUndefined(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }

  const parsed = Number(trimmed);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : undefined;
}

function seedOrUndefined(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }

  const parsed = Number(trimmed);
  return Number.isInteger(parsed) && parsed >= 1 && parsed <= 16 ? parsed : undefined;
}

function displayValue(value: number | null | undefined) {
  return value ?? "-";
}

export function TeamSheetEditor({ team, notes, allTeams }: TeamSheetEditorProps) {
  const router = useRouter();

  const [editing, setEditing] = useState(false);
  const [conference, setConference] = useState(team.conference);
  const [wins, setWins] = useState(String(team.record.wins));
  const [losses, setLosses] = useState(String(team.record.losses));
  const [seed, setSeed] = useState(team.seed ? String(team.seed) : "");
  const [teamColor, setTeamColor] = useState(team.teamColor ?? "");
  const [net, setNet] = useState(team.predictiveMetrics.netRanking?.toString() ?? "");
  const [kenpom, setKenpom] = useState(team.predictiveMetrics.kenpomAdjEm?.toString() ?? "");
  const [evanMiya, setEvanMiya] = useState(team.predictiveMetrics.evanMiyaRank?.toString() ?? "");
  const [torvik, setTorvik] = useState(team.predictiveMetrics.bartTorvikRank?.toString() ?? "");
  const [offense, setOffense] = useState(team.predictiveMetrics.offenseAdj?.toString() ?? "");
  const [defense, setDefense] = useState(team.predictiveMetrics.defenseAdj?.toString() ?? "");
  const [q1Wins, setQ1Wins] = useState(String(team.resumeMetrics.q1Wins));
  const [q1Losses, setQ1Losses] = useState(String(team.resumeMetrics.q1Losses));
  const [q2Wins, setQ2Wins] = useState(team.resumeMetrics.q2Wins?.toString() ?? "");
  const [q2Losses, setQ2Losses] = useState(team.resumeMetrics.q2Losses?.toString() ?? "");
  const [q3Wins, setQ3Wins] = useState(team.resumeMetrics.q3Wins?.toString() ?? "");
  const [q3Losses, setQ3Losses] = useState(team.resumeMetrics.q3Losses?.toString() ?? "");
  const [q4Wins, setQ4Wins] = useState(team.resumeMetrics.q4Wins?.toString() ?? "");
  const [q4Losses, setQ4Losses] = useState(team.resumeMetrics.q4Losses?.toString() ?? "");
  const [wab, setWab] = useState(team.resumeMetrics.wab?.toString() ?? "");
  const [kpi, setKpi] = useState(team.resumeMetrics.kpi?.toString() ?? "");
  const [tags, setTags] = useState(team.tags.join(", "));
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);
  const accentColor = normalizeTeamColor(teamColor) ?? normalizeTeamColor(team.teamColor ?? "");

  const payload = useMemo(() => {
    return {
      ...team,
      conference,
      record: {
        wins: Number(wins) || 0,
        losses: Number(losses) || 0,
      },
      predictiveMetrics: {
        ...team.predictiveMetrics,
        netRanking: numberOrNull(net),
        kenpomAdjEm: numberOrNull(kenpom),
        evanMiyaRank: numberOrNull(evanMiya),
        bartTorvikRank: numberOrNull(torvik),
        offenseAdj: numberOrNull(offense),
        defenseAdj: numberOrNull(defense),
      },
      resumeMetrics: {
        ...team.resumeMetrics,
        q1Wins: Number(q1Wins) || 0,
        q1Losses: Number(q1Losses) || 0,
        q2Wins: intOrUndefined(q2Wins),
        q2Losses: intOrUndefined(q2Losses),
        q3Wins: intOrUndefined(q3Wins),
        q3Losses: intOrUndefined(q3Losses),
        q4Wins: intOrUndefined(q4Wins),
        q4Losses: intOrUndefined(q4Losses),
        wab: numberOrNull(wab),
        kpi: numberOrNull(kpi),
      },
      tags: tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
      seed: seedOrUndefined(seed),
      teamColor: normalizeTeamColor(teamColor),
    };
  }, [
    conference,
    defense,
    evanMiya,
    kenpom,
    kpi,
    losses,
    net,
    offense,
    q1Losses,
    q1Wins,
    q2Losses,
    q2Wins,
    q3Losses,
    q3Wins,
    q4Losses,
    q4Wins,
    seed,
    teamColor,
    tags,
    team.id,
    team.name,
    team.predictiveMetrics.defRank,
    team.predictiveMetrics.defenseRating,
    team.predictiveMetrics.offRank,
    team.predictiveMetrics.offenseRating,
    team.predictiveMetrics.overallRating,
    team.predictiveMetrics.tempoRank,
    team.predictiveMetrics.tempoRating,
    torvik,
    wab,
    wins,
  ]);

  function resetForm() {
    setConference(team.conference);
    setWins(String(team.record.wins));
    setLosses(String(team.record.losses));
    setSeed(team.seed ? String(team.seed) : "");
    setTeamColor(team.teamColor ?? "");
    setNet(team.predictiveMetrics.netRanking?.toString() ?? "");
    setKenpom(team.predictiveMetrics.kenpomAdjEm?.toString() ?? "");
    setEvanMiya(team.predictiveMetrics.evanMiyaRank?.toString() ?? "");
    setTorvik(team.predictiveMetrics.bartTorvikRank?.toString() ?? "");
    setOffense(team.predictiveMetrics.offenseAdj?.toString() ?? "");
    setDefense(team.predictiveMetrics.defenseAdj?.toString() ?? "");
    setQ1Wins(String(team.resumeMetrics.q1Wins));
    setQ1Losses(String(team.resumeMetrics.q1Losses));
    setQ2Wins(team.resumeMetrics.q2Wins?.toString() ?? "");
    setQ2Losses(team.resumeMetrics.q2Losses?.toString() ?? "");
    setQ3Wins(team.resumeMetrics.q3Wins?.toString() ?? "");
    setQ3Losses(team.resumeMetrics.q3Losses?.toString() ?? "");
    setQ4Wins(team.resumeMetrics.q4Wins?.toString() ?? "");
    setQ4Losses(team.resumeMetrics.q4Losses?.toString() ?? "");
    setWab(team.resumeMetrics.wab?.toString() ?? "");
    setKpi(team.resumeMetrics.kpi?.toString() ?? "");
    setTags(team.tags.join(", "));
    setStatus("");
  }

  function formatQuadRecord(winsValue: string, lossesValue: string) {
    const winsNumber = intOrUndefined(winsValue);
    const lossesNumber = intOrUndefined(lossesValue);
    if (winsNumber === undefined || lossesNumber === undefined) {
      return "-";
    }
    return `${winsNumber}-${lossesNumber}`;
  }

  async function saveTeam() {
    const hasSeedInput = seed.trim().length > 0;
    const parsedSeed = seedOrUndefined(seed);
    if (hasSeedInput && parsedSeed === undefined) {
      setStatus("Seed must be an integer from 1 to 16");
      return;
    }
    if (teamColor.trim().length > 0 && !normalizeTeamColor(teamColor)) {
      setStatus("Team color must be a 6-digit hex code like #1D4ED8");
      return;
    }

    setSaving(true);
    setStatus("Saving...");

    try {
      const response = await fetch(`/api/teams/${team.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        setStatus("Save failed");
        return;
      }

      setStatus("Saved");
      setEditing(false);
      router.refresh();
    } catch {
      setStatus("Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="space-y-6 rounded-lg border p-4"
      style={accentColor ? { borderColor: `${accentColor}99` } : undefined}
    >
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            {seed.trim() ? <Badge variant="secondary">Seed {seed.trim()}</Badge> : null}
            <h2 className="text-4xl font-bold tracking-tight md:text-5xl">
              <TeamNameWithLogo teamName={team.name} logoSize={42} />
            </h2>
            <h4 className="text-lg font-medium text-muted-foreground md:text-xl">
              <span className="font-bold">{conference}</span> • <span className="font-bold">{wins}-{losses}</span>
            </h4>
          </div>
          <div className="flex flex-wrap gap-2">
            {tags
              .split(",")
              .map((tag) => tag.trim())
              .filter(Boolean)
              .map((tag) => (
                <Badge key={tag} variant="secondary" className="max-w-full break-all">
                  {tag}
                </Badge>
              ))}
          </div>

            {editing ? (
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="conference">Conference</Label>
                  <Input
                    id="conference"
                    value={conference}
                    onChange={(event) => setConference(event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="seed">Seed</Label>
                  <Input id="seed" value={seed} onChange={(event) => setSeed(event.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="teamColor">Team Color</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="teamColorPicker"
                      type="color"
                      value={normalizeTeamColor(teamColor) ?? "#888888"}
                      onChange={(event) => setTeamColor(event.target.value.toUpperCase())}
                      className="h-10 w-14 p-1"
                    />
                    <Input
                      id="teamColor"
                      value={teamColor}
                      onChange={(event) => setTeamColor(event.target.value)}
                      placeholder="#1D4ED8"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="wins">Wins</Label>
                  <Input id="wins" value={wins} onChange={(event) => setWins(event.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="losses">Losses</Label>
                  <Input id="losses" value={losses} onChange={(event) => setLosses(event.target.value)} />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="tags">Tags (comma separated)</Label>
                  <Input
                    id="tags"
                    value={tags}
                    onChange={(event) => setTags(event.target.value)}
                    placeholder="defense, transition offense, depth"
                  />
                </div>
              </div>
            ) : null}
          </div>

          <Button
            type="button"
            variant={editing ? "secondary" : "outline"}
            size="icon"
            onClick={() => {
              if (editing) {
                resetForm();
                setEditing(false);
              } else {
                setStatus("");
                setEditing(true);
              }
            }}
            aria-label={editing ? "Exit edit mode" : "Open edit mode"}
          >
            <PencilIcon />
          </Button>
        </div>

        <RatingGauges team={team} teams={allTeams} />
      </div>

      <div className="space-y-3">
        <h3 className="text-xl font-semibold">Core Metrics</h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-12">
          <div className="rounded-md border p-3 lg:col-span-5">
            <p className="text-center text-sm font-semibold">Predictive</p>
            <div className="mt-2 grid grid-cols-2 gap-2 lg:grid-cols-4">
              <div className="space-y-1 text-center">
                <p className="text-xs text-muted-foreground">NET</p>
                {editing ? (
                  <Input id="net" value={net} onChange={(event) => setNet(event.target.value)} />
                ) : (
                  <p className="text-base font-semibold">{displayValue(numberOrNull(net))}</p>
                )}
              </div>
              <div className="space-y-1 text-center">
                <p className="text-xs text-muted-foreground">KenPom</p>
                {editing ? (
                  <Input id="kenpom" value={kenpom} onChange={(event) => setKenpom(event.target.value)} />
                ) : (
                  <p className="text-base font-semibold">{displayValue(numberOrNull(kenpom))}</p>
                )}
              </div>
              <div className="space-y-1 text-center">
                <p className="text-xs text-muted-foreground">EvanMiya</p>
                {editing ? (
                  <Input
                    id="evanMiya"
                    value={evanMiya}
                    onChange={(event) => setEvanMiya(event.target.value)}
                  />
                ) : (
                  <p className="text-base font-semibold">{displayValue(numberOrNull(evanMiya))}</p>
                )}
              </div>
              <div className="space-y-1 text-center">
                <p className="text-xs text-muted-foreground">Torvik</p>
                {editing ? (
                  <Input id="torvik" value={torvik} onChange={(event) => setTorvik(event.target.value)} />
                ) : (
                  <p className="text-base font-semibold">{displayValue(numberOrNull(torvik))}</p>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-md border p-3 lg:col-span-3">
            <p className="text-center text-sm font-semibold">Resume</p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <div className="space-y-1 text-center">
                <p className="text-xs text-muted-foreground">WAB</p>
                {editing ? (
                  <Input id="wab" value={wab} onChange={(event) => setWab(event.target.value)} />
                ) : (
                  <p className="text-base font-semibold">{displayValue(numberOrNull(wab))}</p>
                )}
              </div>
              <div className="space-y-1 text-center">
                <p className="text-xs text-muted-foreground">KPI</p>
                {editing ? (
                  <Input id="kpi" value={kpi} onChange={(event) => setKpi(event.target.value)} />
                ) : (
                  <p className="text-base font-semibold">{displayValue(numberOrNull(kpi))}</p>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-md border p-3 lg:col-span-2">
            <p className="text-center text-sm font-semibold">Offense</p>
            <div className="mt-2 space-y-1 text-center">
              <p className="text-xs text-muted-foreground">Adjusted Offense</p>
              {editing ? (
                <Input id="offense" value={offense} onChange={(event) => setOffense(event.target.value)} />
              ) : (
                <p className="text-base font-semibold">{displayValue(numberOrNull(offense))}</p>
              )}
            </div>
          </div>

          <div className="rounded-md border p-3 lg:col-span-2">
            <p className="text-center text-sm font-semibold">Defense</p>
            <div className="mt-2 space-y-1 text-center">
              <p className="text-xs text-muted-foreground">Adjusted Defense</p>
              {editing ? (
                <Input id="defense" value={defense} onChange={(event) => setDefense(event.target.value)} />
              ) : (
                <p className="text-base font-semibold">{displayValue(numberOrNull(defense))}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="text-lg font-semibold">Quad Records</h3>
        <div className="grid gap-3 md:grid-cols-4">
          <div className="rounded-md border p-3">
            <p className="text-xs text-muted-foreground">Q1</p>
            {editing ? (
              <div className="mt-2 grid grid-cols-2 gap-2">
                <Input value={q1Wins} onChange={(event) => setQ1Wins(event.target.value)} placeholder="W" />
                <Input
                  value={q1Losses}
                  onChange={(event) => setQ1Losses(event.target.value)}
                  placeholder="L"
                />
              </div>
            ) : (
              <p className="mt-1 text-lg font-semibold">{formatQuadRecord(q1Wins, q1Losses)}</p>
            )}
          </div>
          <div className="rounded-md border p-3">
            <p className="text-xs text-muted-foreground">Q2</p>
            {editing ? (
              <div className="mt-2 grid grid-cols-2 gap-2">
                <Input value={q2Wins} onChange={(event) => setQ2Wins(event.target.value)} placeholder="W" />
                <Input
                  value={q2Losses}
                  onChange={(event) => setQ2Losses(event.target.value)}
                  placeholder="L"
                />
              </div>
            ) : (
              <p className="mt-1 text-lg font-semibold">{formatQuadRecord(q2Wins, q2Losses)}</p>
            )}
          </div>
          <div className="rounded-md border p-3">
            <p className="text-xs text-muted-foreground">Q3</p>
            {editing ? (
              <div className="mt-2 grid grid-cols-2 gap-2">
                <Input value={q3Wins} onChange={(event) => setQ3Wins(event.target.value)} placeholder="W" />
                <Input
                  value={q3Losses}
                  onChange={(event) => setQ3Losses(event.target.value)}
                  placeholder="L"
                />
              </div>
            ) : (
              <p className="mt-1 text-lg font-semibold">{formatQuadRecord(q3Wins, q3Losses)}</p>
            )}
          </div>
          <div className="rounded-md border p-3">
            <p className="text-xs text-muted-foreground">Q4</p>
            {editing ? (
              <div className="mt-2 grid grid-cols-2 gap-2">
                <Input value={q4Wins} onChange={(event) => setQ4Wins(event.target.value)} placeholder="W" />
                <Input
                  value={q4Losses}
                  onChange={(event) => setQ4Losses(event.target.value)}
                  placeholder="L"
                />
              </div>
            ) : (
              <p className="mt-1 text-lg font-semibold">{formatQuadRecord(q4Wins, q4Losses)}</p>
            )}
          </div>
        </div>
      </div>

      {editing ? (
        <div className="flex items-center gap-3">
          <Button type="button" onClick={saveTeam} disabled={saving}>
            {saving ? "Saving..." : "Save Team Sheet"}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={saving}
            onClick={() => {
              resetForm();
              setEditing(false);
            }}
          >
            Cancel
          </Button>
          {status ? <p className="text-sm text-muted-foreground">{status}</p> : null}
        </div>
      ) : null}

      <TeamNotes teamId={team.id} initialNotes={notes} editable={editing} />
    </div>
  );
}
