"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TeamNameWithLogo } from "@/components/teams/team-name-with-logo";
import { formatRecord } from "@/lib/format";
import type { Team } from "@/lib/schema/team";

type SortKey =
  | "name"
  | "conference"
  | "record"
  | "net"
  | "kenpom"
  | "evanMiya"
  | "torvik"
  | "offense"
  | "defense"
  | "wab"
  | "kpi";
type SortDirection = "asc" | "desc";

function formatQuadRecord(wins?: number, losses?: number) {
  if (wins === undefined || losses === undefined) {
    return "-";
  }

  return `${wins}-${losses}`;
}

export function TeamsTable({ teams }: { teams: Team[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("net");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  function handleSort(nextKey: SortKey) {
    if (sortKey === nextKey) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }

    setSortKey(nextKey);
    setSortDirection("asc");
  }

  function renderSortableLabel(label: string, key: SortKey) {
    const indicator = sortKey === key ? (sortDirection === "asc" ? "↑" : "↓") : " ";

    return (
      <>
        {label}
        <span aria-hidden="true" className="inline-block w-2.5 text-center">
          {indicator}
        </span>
      </>
    );
  }

  const filteredTeams = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    const nextTeams = teams.filter((team) => {
      if (!normalizedQuery) {
        return true;
      }

      return (
        team.name.toLowerCase().includes(normalizedQuery) ||
        team.conference.toLowerCase().includes(normalizedQuery)
      );
    });

    const sorted = [...nextTeams].sort((a, b) => {
      const numericSort = (aValue?: number | null, bValue?: number | null) => {
        const aNumeric = aValue ?? Number.MAX_SAFE_INTEGER;
        const bNumeric = bValue ?? Number.MAX_SAFE_INTEGER;
        return aNumeric - bNumeric || a.name.localeCompare(b.name);
      };

      if (sortKey === "conference") {
        return a.conference.localeCompare(b.conference) || a.name.localeCompare(b.name);
      }

      if (sortKey === "record") {
        const aWinPct =
          a.record.wins + a.record.losses === 0
            ? -1
            : a.record.wins / (a.record.wins + a.record.losses);
        const bWinPct =
          b.record.wins + b.record.losses === 0
            ? -1
            : b.record.wins / (b.record.wins + b.record.losses);

        return bWinPct - aWinPct || b.record.wins - a.record.wins || a.name.localeCompare(b.name);
      }

      if (sortKey === "net") {
        return numericSort(a.predictiveMetrics.netRanking, b.predictiveMetrics.netRanking);
      }

      if (sortKey === "kenpom") {
        return numericSort(a.predictiveMetrics.kenpomAdjEm, b.predictiveMetrics.kenpomAdjEm);
      }

      if (sortKey === "evanMiya") {
        return numericSort(a.predictiveMetrics.evanMiyaRank, b.predictiveMetrics.evanMiyaRank);
      }

      if (sortKey === "torvik") {
        return numericSort(a.predictiveMetrics.bartTorvikRank, b.predictiveMetrics.bartTorvikRank);
      }

      if (sortKey === "offense") {
        return numericSort(a.predictiveMetrics.offenseAdj, b.predictiveMetrics.offenseAdj);
      }

      if (sortKey === "defense") {
        return numericSort(a.predictiveMetrics.defenseAdj, b.predictiveMetrics.defenseAdj);
      }

      if (sortKey === "wab") {
        return numericSort(a.resumeMetrics.wab, b.resumeMetrics.wab);
      }

      if (sortKey === "kpi") {
        return numericSort(a.resumeMetrics.kpi, b.resumeMetrics.kpi);
      }

      return a.name.localeCompare(b.name);
    });

    if (sortDirection === "desc") {
      sorted.reverse();
    }

    return sorted;
  }, [query, sortDirection, sortKey, teams]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search teams, conferences..."
          className="max-w-sm"
        />

        <p className="text-sm text-muted-foreground">Click column headers to sort.</p>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <Table className="text-[11px] lg:text-xs [&_td]:px-1.5 [&_th]:px-1.5">
          <TableHeader>
            <TableRow>
              <TableHead className="text-left">
                <button
                  type="button"
                  onClick={() => handleSort("name")}
                  className="cursor-pointer rounded px-0.5 py-0.5 font-medium transition-colors hover:bg-muted hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {renderSortableLabel("Team", "name")}
                </button>
              </TableHead>
              <TableHead className="text-center">
                <button
                  type="button"
                  onClick={() => handleSort("conference")}
                  className="cursor-pointer rounded px-0.5 py-0.5 font-medium transition-colors hover:bg-muted hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {renderSortableLabel("Conference", "conference")}
                </button>
              </TableHead>
              <TableHead className="text-center">
                <button
                  type="button"
                  onClick={() => handleSort("record")}
                  className="cursor-pointer rounded px-0.5 py-0.5 font-medium transition-colors hover:bg-muted hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {renderSortableLabel("Record", "record")}
                </button>
              </TableHead>
              <TableHead className="text-center">
                <button
                  type="button"
                  onClick={() => handleSort("net")}
                  className="cursor-pointer rounded px-0.5 py-0.5 font-medium transition-colors hover:bg-muted hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {renderSortableLabel("NET", "net")}
                </button>
              </TableHead>
              <TableHead className="text-center">
                <button
                  type="button"
                  onClick={() => handleSort("kenpom")}
                  className="cursor-pointer rounded px-0.5 py-0.5 font-medium transition-colors hover:bg-muted hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {renderSortableLabel("KenPom", "kenpom")}
                </button>
              </TableHead>
              <TableHead className="text-center">
                <button
                  type="button"
                  onClick={() => handleSort("evanMiya")}
                  className="cursor-pointer rounded px-0.5 py-0.5 font-medium transition-colors hover:bg-muted hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {renderSortableLabel("EvanMiya", "evanMiya")}
                </button>
              </TableHead>
              <TableHead className="text-center">
                <button
                  type="button"
                  onClick={() => handleSort("torvik")}
                  className="cursor-pointer rounded px-0.5 py-0.5 font-medium transition-colors hover:bg-muted hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {renderSortableLabel("Torvik", "torvik")}
                </button>
              </TableHead>
              <TableHead className="text-center">
                <button
                  type="button"
                  onClick={() => handleSort("offense")}
                  className="cursor-pointer rounded px-0.5 py-0.5 font-medium transition-colors hover:bg-muted hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {renderSortableLabel("Adj Off", "offense")}
                </button>
              </TableHead>
              <TableHead className="text-center">
                <button
                  type="button"
                  onClick={() => handleSort("defense")}
                  className="cursor-pointer rounded px-0.5 py-0.5 font-medium transition-colors hover:bg-muted hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {renderSortableLabel("Adj Def", "defense")}
                </button>
              </TableHead>
              <TableHead className="text-center">
                <button
                  type="button"
                  onClick={() => handleSort("wab")}
                  className="cursor-pointer rounded px-0.5 py-0.5 font-medium transition-colors hover:bg-muted hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {renderSortableLabel("WAB", "wab")}
                </button>
              </TableHead>
              <TableHead className="text-center">
                <button
                  type="button"
                  onClick={() => handleSort("kpi")}
                  className="cursor-pointer rounded px-0.5 py-0.5 font-medium transition-colors hover:bg-muted hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {renderSortableLabel("KPI", "kpi")}
                </button>
              </TableHead>
              <TableHead className="text-center">Q1</TableHead>
              <TableHead className="text-center">Q2</TableHead>
              <TableHead className="text-center">Q3</TableHead>
              <TableHead className="text-center">Q4</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredTeams.map((team) => (
              <TableRow
                key={team.id}
                tabIndex={0}
                role="link"
                aria-label={`Open ${team.name} team sheet`}
                className="cursor-pointer transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onClick={() => router.push(`/teams/${team.id}`)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    router.push(`/teams/${team.id}`);
                  }
                }}
              >
                <TableCell className="text-left">
                  <span className="inline-flex font-medium">
                    <TeamNameWithLogo teamName={team.name} />
                  </span>
                </TableCell>
                <TableCell className="text-center">{team.conference}</TableCell>
                <TableCell className="text-center">{formatRecord(team.record.wins, team.record.losses)}</TableCell>
                <TableCell className="text-center">{team.predictiveMetrics.netRanking ?? "-"}</TableCell>
                <TableCell className="text-center">{team.predictiveMetrics.kenpomAdjEm ?? "-"}</TableCell>
                <TableCell className="text-center">{team.predictiveMetrics.evanMiyaRank ?? "-"}</TableCell>
                <TableCell className="text-center">{team.predictiveMetrics.bartTorvikRank ?? "-"}</TableCell>
                <TableCell className="text-center">{team.predictiveMetrics.offenseAdj ?? "-"}</TableCell>
                <TableCell className="text-center">{team.predictiveMetrics.defenseAdj ?? "-"}</TableCell>
                <TableCell className="text-center">{team.resumeMetrics.wab ?? "-"}</TableCell>
                <TableCell className="text-center">{team.resumeMetrics.kpi ?? "-"}</TableCell>
                <TableCell className="text-center">
                  {formatQuadRecord(team.resumeMetrics.q1Wins, team.resumeMetrics.q1Losses)}
                </TableCell>
                <TableCell className="text-center">
                  {formatQuadRecord(team.resumeMetrics.q2Wins, team.resumeMetrics.q2Losses)}
                </TableCell>
                <TableCell className="text-center">
                  {formatQuadRecord(team.resumeMetrics.q3Wins, team.resumeMetrics.q3Losses)}
                </TableCell>
                <TableCell className="text-center">
                  {formatQuadRecord(team.resumeMetrics.q4Wins, team.resumeMetrics.q4Losses)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
