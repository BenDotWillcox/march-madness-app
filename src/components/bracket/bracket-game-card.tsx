"use client";

import { CheckIcon, ChevronLeftIcon, ChevronRightIcon, CircleHelpIcon } from "lucide-react";
import { TeamNameWithLogo } from "@/components/teams/team-name-with-logo";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { BracketGame, BracketSlot } from "@/lib/schema/bracket";
import type { Team } from "@/lib/schema/team";
import type { BracketSlotKey } from "@/lib/bracket/engine";

type BracketGameCardProps = {
  game: BracketGame;
  teamsById: Map<string, Team>;
  className?: string;
  compact?: boolean;
  direction?: "left" | "right" | "center";
  onPickWinner: (slot: BracketSlotKey) => void;
  onCompare: () => void;
};

function isWinningSlot(game: BracketGame, slot: BracketSlot) {
  if (game.winnerTeamId) {
    return slot.teamId === game.winnerTeamId;
  }

  if (game.winnerSourceLabel) {
    return (slot.sourceLabel ?? null) === game.winnerSourceLabel;
  }

  return false;
}

function slotDisplayLabel(slot: BracketSlot, teamsById: Map<string, Team>) {
  if (slot.teamId) {
    const team = teamsById.get(slot.teamId);
    if (team) {
      return <TeamNameWithLogo teamName={team.name} />;
    }
  }

  return <span className="inline-flex min-h-6 items-center">{slot.sourceLabel ?? "TBD"}</span>;
}

function shouldRenderSeedPrefix(slot: BracketSlot) {
  if (!slot.seed) {
    return false;
  }

  const source = (slot.sourceLabel ?? "").trim();
  return !source.startsWith(`(${slot.seed})`);
}

function gameInfoValue(value: string | null | undefined, fallback: string) {
  return value && value.trim().length > 0 ? value : fallback;
}

function formatDateOnlyValue(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    return null;
  }

  const [, year, month, day] = match;
  const parsed = new Date(Number(year), Number(month) - 1, Number(day));
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
  }).format(parsed);
}

function formatTipoff(tipoff: string | null | undefined) {
  const value = gameInfoValue(tipoff, "TBD");
  if (value === "TBD") {
    return value;
  }

  const trimmedValue = value.trim();
  const dateOnly = formatDateOnlyValue(trimmedValue);
  if (dateOnly) {
    return `${dateOnly} (TBD)`;
  }

  const parsed = new Date(trimmedValue);
  if (Number.isNaN(parsed.getTime())) {
    return trimmedValue;
  }

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(parsed);
}

function buildGameTooltip(game: BracketGame) {
  const lines = [
    `Spread: ${gameInfoValue(game.gameInfo?.spread, "-")}`,
    `Total: ${gameInfoValue(game.gameInfo?.total, "-")}`,
  ];

  return lines.join("\n");
}

export function BracketGameCard({
  game,
  teamsById,
  className,
  compact = false,
  direction = "center",
  onPickWinner,
  onCompare,
}: BracketGameCardProps) {
  const canCompare = Boolean(game.home.teamId && game.away.teamId);
  const WinnerChevron = direction === "left" ? ChevronLeftIcon : ChevronRightIcon;
  const tooltip = buildGameTooltip(game);
  const location = gameInfoValue(game.gameInfo?.location, "TBD");
  const tipoff = formatTipoff(game.gameInfo?.tipoff);

  function handleCompareOpen() {
    if (!canCompare) {
      return;
    }
    onCompare();
  }

  return (
    <Card
      className={cn(
        "BracketMatchup w-[8.5rem] min-w-[8.5rem] max-w-[8.5rem] rounded-md",
        compact ? "py-0 shadow-sm" : "",
        canCompare ? "cursor-pointer hover:border-primary/50" : "",
        className,
      )}
      data-testid="bracketMatchup"
      onClick={handleCompareOpen}
      role="button"
      tabIndex={canCompare ? 0 : -1}
      onKeyDown={(event) => {
        if (!canCompare) {
          return;
        }
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onCompare();
        }
      }}
    >
      <CardContent className={cn(compact ? "space-y-0.5 px-0 pb-0.5 pt-0" : "space-y-3 p-3")}>
        <button
          type="button"
          data-testid="bracketCompetitorHome"
          className={cn(
            "flex w-full items-center justify-between gap-2 rounded-md border px-3 py-2 text-left transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:outline-none",
            compact ? "px-1.5 py-1" : "",
            isWinningSlot(game, game.home) ? "border-emerald-500/70 bg-emerald-500/10" : "",
          )}
          onClick={(event) => {
            event.stopPropagation();
            onPickWinner("home");
          }}
        >
          <span className={cn("min-w-0 flex-1 truncate", compact ? "text-[0.68rem] leading-tight" : "text-sm")}>
            {shouldRenderSeedPrefix(game.home) ? (
              <span className="mr-1 font-semibold">({game.home.seed})</span>
            ) : null}
            {slotDisplayLabel(game.home, teamsById)}
          </span>
          {isWinningSlot(game, game.home) ? (
            <span className="inline-flex items-center gap-1 text-emerald-600">
              <CheckIcon className="size-3.5" />
              <WinnerChevron className="size-3.5" />
            </span>
          ) : null}
        </button>

        <button
          type="button"
          data-testid="bracketCompetitorAway"
          className={cn(
            "flex w-full items-center justify-between gap-2 rounded-md border px-3 py-2 text-left transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:outline-none",
            compact ? "px-1.5 py-1" : "",
            isWinningSlot(game, game.away) ? "border-emerald-500/70 bg-emerald-500/10" : "",
          )}
          onClick={(event) => {
            event.stopPropagation();
            onPickWinner("away");
          }}
        >
          <span className={cn("min-w-0 flex-1 truncate", compact ? "text-[0.68rem] leading-tight" : "text-sm")}>
            {shouldRenderSeedPrefix(game.away) ? (
              <span className="mr-1 font-semibold">({game.away.seed})</span>
            ) : null}
            {slotDisplayLabel(game.away, teamsById)}
          </span>
          {isWinningSlot(game, game.away) ? (
            <span className="inline-flex items-center gap-1 text-emerald-600">
              <CheckIcon className="size-3.5" />
              <WinnerChevron className="size-3.5" />
            </span>
          ) : null}
        </button>

        <div className="flex items-start justify-between gap-1 pt-0">
          <div className={cn("min-w-0 text-muted-foreground", compact ? "text-[0.6rem] leading-tight" : "text-[0.68rem] leading-tight")}>
            <div className="truncate" title={location}>
              {location}
            </div>
            <div>{tipoff}</div>
          </div>
          <span
            title={tooltip}
            className="inline-flex items-center text-muted-foreground/80 transition-colors hover:text-foreground cursor-help"
            aria-label="View game information"
          >
            <CircleHelpIcon className="size-3.5" />
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
