"use client";

import { BracketGameCard } from "@/components/bracket/bracket-game-card";
import type { BracketSlotKey } from "@/lib/bracket/engine";
import type { BracketGame, BracketRound } from "@/lib/schema/bracket";
import type { Team } from "@/lib/schema/team";
import { cn } from "@/lib/utils";

type RegionRound = {
  round: BracketRound;
  label: string;
  games: BracketGame[];
};

type BracketRegionColumnProps = {
  regionLabel: string;
  rounds: RegionRound[];
  teamsById: Map<string, Team>;
  side: "left" | "right";
  onPickWinner: (gameId: string, slot: BracketSlotKey) => void;
  onCompare: (gameId: string) => void;
};

function chunkGames(games: BracketGame[]) {
  const pods: BracketGame[][] = [];
  for (let index = 0; index < games.length; index += 2) {
    pods.push(games.slice(index, index + 2));
  }
  return pods;
}

function podGapClass(gamesInRound: number) {
  if (gamesInRound >= 8) {
    return "space-y-[4px]";
  }

  if (gamesInRound === 4) {
    return "space-y-[8px]";
  }

  if (gamesInRound === 2) {
    return "space-y-[16px]";
  }

  return "space-y-[4px]";
}

function podGapPx(gamesInRound: number) {
  if (gamesInRound >= 8) {
    return 16;
  }

  if (gamesInRound === 4) {
    return 164;
  }

  if (gamesInRound === 2) {
    return 392;
  }

  return 8;
}

function connectorRunPx(gamesInRound: number) {
  if (gamesInRound >= 8) {
    return 16;
  }

  if (gamesInRound === 4) {
    return 16;
  }

  if (gamesInRound === 2) {
    return 16;
  }

  return 14;
}

export function BracketRegionColumn({
  regionLabel,
  rounds,
  teamsById,
  side,
  onPickWinner,
  onCompare,
}: BracketRegionColumnProps) {
  const orderedRounds = side === "right" ? [...rounds].reverse() : rounds;

  return (
    <section
      className={cn("w-max space-y-3", side === "right" ? "justify-self-end" : "justify-self-start")}
      data-testid="renderRegion"
      data-side={side}
    >
      <h3
        className={cn(
          "w-[8.75rem] text-sm font-bold uppercase tracking-[0.12em] text-muted-foreground",
          side === "right" ? "ml-auto pl-1 text-left" : "pl-1 text-left",
        )}
      >
        {regionLabel}
      </h3>
      <div className={cn("flex items-stretch gap-6")}>
        {orderedRounds.map((round, roundIndex) => {
          const pods = chunkGames(round.games);
          const laneHeight = round.round === "round_of_64" ? "h-[58rem]" : "h-[58rem]";
          const hasNextRound = roundIndex < orderedRounds.length - 1;
          const currentPodGapClass = podGapClass(round.games.length);
          const currentPodGapPx = podGapPx(round.games.length);
          const currentConnectorRunPx = connectorRunPx(round.games.length);

          return (
            <div
              key={round.round}
              className={cn("region-round min-w-[8.75rem] space-y-1.5", hasNextRound ? "region-round-with-next" : "")}
              data-testid="regionRound"
              data-round-index={roundIndex}
              data-round={round.round}
            >
              <p className="px-1 text-[0.65rem] font-semibold uppercase tracking-wider text-muted-foreground">
                {round.label}
              </p>
              <div className={cn("chunked-matchups flex flex-col justify-around gap-4", laneHeight)}>
                {pods.map((pod, podIndex) => (
                  <div
                    key={`${round.round}-${podIndex}`}
                    className={cn(
                      "region-pod flex flex-col",
                      currentPodGapClass,
                      pod.length === 2 ? "region-pod-two" : "",
                    )}
                    style={{
                      rowGap: `${currentPodGapPx}px`,
                      ["--bracket-connector-run" as string]: `${currentConnectorRunPx}px`,
                    }}
                  >
                    {pod.map((game) => (
                      <BracketGameCard
                        key={game.id}
                        game={game}
                        teamsById={teamsById}
                        direction={side}
                        compact
                        onPickWinner={(slot) => onPickWinner(game.id, slot)}
                        onCompare={() => onCompare(game.id)}
                        className={cn(
                          roundIndex > 0 ? "shadow-sm" : "",
                          round.round === "elite_8" ? "ring-1 ring-border" : "",
                        )}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
