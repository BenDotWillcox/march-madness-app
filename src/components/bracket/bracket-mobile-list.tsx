"use client";

import { CheckIcon } from "lucide-react";
import { TeamNameWithLogo } from "@/components/teams/team-name-with-logo";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { BracketGame, BracketRound, BracketSlot } from "@/lib/schema/bracket";
import type { Team } from "@/lib/schema/team";
import type { BracketSlotKey } from "@/lib/bracket/engine";

const roundDisplayOrder: Array<{ round: BracketRound; label: string }> = [
  { round: "championship", label: "Championship" },
  { round: "final_4", label: "Final Four" },
  { round: "elite_8", label: "Elite 8" },
  { round: "sweet_16", label: "Sweet 16" },
  { round: "round_of_32", label: "Round of 32" },
  { round: "round_of_64", label: "Round of 64" },
  { round: "first_four", label: "First Four" },
];

const regionLabels: Record<string, string> = {
  east: "East",
  west: "West",
  south: "South",
  midwest: "Midwest",
  national: "",
};

const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });

type BracketMobileListProps = {
  games: BracketGame[];
  teamsById: Map<string, Team>;
  onPickWinner: (gameId: string, slot: BracketSlotKey) => void;
  onCompare: (gameId: string) => void;
};

function isWinningSlot(game: BracketGame, slot: BracketSlot) {
  if (game.winnerTeamId) return slot.teamId === game.winnerTeamId;
  if (game.winnerSourceLabel) return (slot.sourceLabel ?? null) === game.winnerSourceLabel;
  return false;
}

function formatTipoff(tipoff: string | null | undefined) {
  if (!tipoff || !tipoff.trim()) return "TBD";
  const trimmed = tipoff.trim();

  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (dateOnly) {
    const d = new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]));
    if (!Number.isNaN(d.getTime())) {
      return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(d);
    }
  }

  const parsed = new Date(trimmed);
  if (!Number.isNaN(parsed.getTime())) {
    return new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(parsed);
  }

  return trimmed;
}

function SlotButton({
  game,
  slot,
  slotKey,
  teamsById,
  onPick,
}: {
  game: BracketGame;
  slot: BracketSlot;
  slotKey: BracketSlotKey;
  teamsById: Map<string, Team>;
  onPick: () => void;
}) {
  const winning = isWinningSlot(game, slot);
  const team = slot.teamId ? teamsById.get(slot.teamId) : undefined;
  const showSeed = slot.seed && !(slot.sourceLabel ?? "").trim().startsWith(`(${slot.seed})`);

  return (
    <button
      type="button"
      className={cn(
        "flex min-w-0 flex-1 items-center gap-1.5 rounded-md border px-2 py-1.5 text-left text-xs transition-colors hover:bg-muted",
        winning && "border-emerald-500/70 bg-emerald-500/10",
      )}
      onClick={(e) => {
        e.stopPropagation();
        onPick();
      }}
    >
      <span className="min-w-0 flex-1 truncate leading-tight">
        {showSeed ? <span className="mr-1 font-semibold">({slot.seed})</span> : null}
        {team ? <TeamNameWithLogo teamName={team.name} /> : (slot.sourceLabel ?? "TBD")}
      </span>
      {winning && <CheckIcon className="size-3.5 shrink-0 text-emerald-600" />}
    </button>
  );
}

function MobileGameCard({
  game,
  teamsById,
  onPickWinner,
  onCompare,
}: {
  game: BracketGame;
  teamsById: Map<string, Team>;
  onPickWinner: (gameId: string, slot: BracketSlotKey) => void;
  onCompare: (gameId: string) => void;
}) {
  const canCompare = Boolean(game.home.teamId && game.away.teamId);
  const region = regionLabels[game.region] ?? "";
  const location = game.gameInfo?.location?.trim() || "TBD";
  const tipoff = formatTipoff(game.gameInfo?.tipoff);

  return (
    <Card
      className={cn("w-full", canCompare && "cursor-pointer hover:border-primary/50")}
      onClick={() => canCompare && onCompare(game.id)}
      role={canCompare ? "button" : undefined}
      tabIndex={canCompare ? 0 : -1}
      onKeyDown={(e) => {
        if (canCompare && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onCompare(game.id);
        }
      }}
    >
      <CardContent className="space-y-1.5 px-3 py-2">
        <div className="flex items-center justify-between gap-2">
          {region ? (
            <span className="text-[0.65rem] font-semibold uppercase tracking-wider text-muted-foreground">
              {region}
            </span>
          ) : (
            <span />
          )}
          <span className="text-[0.6rem] text-muted-foreground">{tipoff}</span>
        </div>

        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-1.5">
          <SlotButton
            game={game}
            slot={game.home}
            slotKey="home"
            teamsById={teamsById}
            onPick={() => onPickWinner(game.id, "home")}
          />
          <span className="text-[0.6rem] font-medium text-muted-foreground">vs</span>
          <SlotButton
            game={game}
            slot={game.away}
            slotKey="away"
            teamsById={teamsById}
            onPick={() => onPickWinner(game.id, "away")}
          />
        </div>

        <div className="truncate text-[0.6rem] leading-tight text-muted-foreground" title={location}>
          {location}
        </div>
      </CardContent>
    </Card>
  );
}

export function BracketMobileList({ games, teamsById, onPickWinner, onCompare }: BracketMobileListProps) {
  const gamesByRound = new Map<BracketRound, BracketGame[]>();
  for (const game of games) {
    const list = gamesByRound.get(game.round);
    if (list) {
      list.push(game);
    } else {
      gamesByRound.set(game.round, [game]);
    }
  }

  for (const list of gamesByRound.values()) {
    list.sort((a, b) => collator.compare(a.id, b.id));
  }

  return (
    <div className="space-y-5 rounded-xl bg-muted/20 p-3">
      {roundDisplayOrder.map(({ round, label }) => {
        const roundGames = gamesByRound.get(round);
        if (!roundGames?.length) return null;
        return (
          <section key={round} className="space-y-2">
            <h4 className="sticky top-0 z-10 bg-background/90 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground backdrop-blur-sm">
              {label}
              <span className="ml-2 font-normal">({roundGames.length})</span>
            </h4>
            <div className="space-y-2">
              {roundGames.map((game) => (
                <MobileGameCard
                  key={game.id}
                  game={game}
                  teamsById={teamsById}
                  onPickWinner={onPickWinner}
                  onCompare={onCompare}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
