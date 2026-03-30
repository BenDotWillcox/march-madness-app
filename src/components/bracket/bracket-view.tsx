"use client";

import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { BracketCompareOverlay } from "@/components/bracket/bracket-compare-overlay";
import { BracketGameCard } from "@/components/bracket/bracket-game-card";
import { BracketMobileList } from "@/components/bracket/bracket-mobile-list";
import { BracketRegionColumn } from "@/components/bracket/bracket-region-column";
import { TeamNameWithLogo } from "@/components/teams/team-name-with-logo";
import { applyWinnerSelection, type BracketSlotKey } from "@/lib/bracket/engine";
import type { BracketGame, BracketRound, BracketState } from "@/lib/schema/bracket";
import type { Team } from "@/lib/schema/team";

type BracketViewProps = {
  initialState: BracketState;
  teams: Team[];
};

type BracketViewState = {
  bracket: BracketState;
  compareGameId: string | null;
};

type BracketViewAction =
  | { type: "pick-winner"; gameId: string; slot: BracketSlotKey }
  | { type: "open-compare"; gameId: string }
  | { type: "close-compare" };

function bracketViewReducer(state: BracketViewState, action: BracketViewAction): BracketViewState {
  if (action.type === "pick-winner") {
    return {
      ...state,
      bracket: applyWinnerSelection(state.bracket, action.gameId, action.slot),
    };
  }

  if (action.type === "open-compare") {
    return {
      ...state,
      compareGameId: action.gameId,
    };
  }

  return {
    ...state,
    compareGameId: null,
  };
}

const regionRounds: Array<{ round: BracketRound; label: string }> = [
  { round: "round_of_64", label: "Round of 64" },
  { round: "round_of_32", label: "Round of 32" },
  { round: "sweet_16", label: "Sweet 16" },
  { round: "elite_8", label: "Elite 8" },
];

const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });

export function BracketView({ initialState, teams }: BracketViewProps) {
  const [state, dispatch] = useReducer(bracketViewReducer, {
    bracket: initialState,
    compareGameId: null,
  });

  const teamsById = useMemo(() => new Map(teams.map((team) => [team.id, team])), [teams]);
  const gamesById = useMemo(
    () => new Map(state.bracket.games.map((game) => [game.id, game])),
    [state.bracket.games],
  );

  const firstFourGames = useMemo(
    () =>
      state.bracket.games
        .filter((game) => game.round === "first_four")
        .sort((a, b) => collator.compare(a.id, b.id)),
    [state.bracket.games],
  );

  const groupedRegionRoundGames = useMemo(() => {
    const groups = new Map<string, BracketGame[]>();

    for (const game of state.bracket.games) {
      const groupKey = `${game.region}:${game.round}`;
      const existing = groups.get(groupKey);
      if (existing) {
        existing.push(game);
      } else {
        groups.set(groupKey, [game]);
      }
    }

    for (const group of groups.values()) {
      group.sort((a, b) => collator.compare(a.id, b.id));
    }

    return groups;
  }, [state.bracket.games]);

  const westRounds = useMemo(
    () =>
      regionRounds.map((round) => ({
        ...round,
        games: groupedRegionRoundGames.get(`west:${round.round}`) ?? [],
      })),
    [groupedRegionRoundGames],
  );
  const eastRounds = useMemo(
    () =>
      regionRounds.map((round) => ({
        ...round,
        games: groupedRegionRoundGames.get(`east:${round.round}`) ?? [],
      })),
    [groupedRegionRoundGames],
  );
  const southRounds = useMemo(
    () =>
      regionRounds.map((round) => ({
        ...round,
        games: groupedRegionRoundGames.get(`south:${round.round}`) ?? [],
      })),
    [groupedRegionRoundGames],
  );
  const midwestRounds = useMemo(
    () =>
      regionRounds.map((round) => ({
        ...round,
        games: groupedRegionRoundGames.get(`midwest:${round.round}`) ?? [],
      })),
    [groupedRegionRoundGames],
  );

  const finalFourOne = gamesById.get("final-four-1");
  const finalFourTwo = gamesById.get("final-four-2");
  const championship = gamesById.get("championship-1");
  const compareGame = state.compareGameId ? gamesById.get(state.compareGameId) : undefined;
  const championTeam = championship?.winnerTeamId ? teamsById.get(championship.winnerTeamId) : null;
  const championLabel = championTeam?.name ?? championship?.winnerSourceLabel ?? "TBD";

  const wrapperRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(Infinity);
  const isMobile = containerWidth < 768;

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width;
      if (width !== undefined) setContainerWidth(width);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const [bracketScale, setBracketScale] = useState(1);
  const [scaledHeight, setScaledHeight] = useState<number | undefined>();

  const recomputeScale = useCallback(() => {
    const content = contentRef.current;
    if (!content || isMobile) return;
    const naturalWidth = content.scrollWidth;
    const naturalHeight = content.scrollHeight;
    const s = Math.min(1, containerWidth / naturalWidth);
    setBracketScale(s);
    setScaledHeight(s < 1 ? Math.ceil(naturalHeight * s) : undefined);
  }, [containerWidth, isMobile]);

  useEffect(() => {
    recomputeScale();
  }, [recomputeScale]);

  useEffect(() => {
    if (isMobile) return;
    const content = contentRef.current;
    if (!content) return;
    const ro = new ResizeObserver(() => recomputeScale());
    ro.observe(content);
    return () => ro.disconnect();
  }, [isMobile, recomputeScale]);

  const handlePickWinner = useCallback(
    (gameId: string, slot: BracketSlotKey) => dispatch({ type: "pick-winner", gameId, slot }),
    [],
  );
  const handleOpenCompare = useCallback(
    (gameId: string) => dispatch({ type: "open-compare", gameId }),
    [],
  );

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h3 className="text-lg font-semibold">Tournament Bracket</h3>
        <p className="text-sm text-muted-foreground">
          {isMobile
            ? "Tap a team to advance. Tap the card to compare when both teams are set."
            : "Click a team to advance (or click again to clear). Compare opens over bracket when both teams are set."}
        </p>
      </div>

      <div ref={wrapperRef} className="pb-2">
        {isMobile ? (
          <BracketMobileList
            games={state.bracket.games}
            teamsById={teamsById}
            onPickWinner={handlePickWinner}
            onCompare={handleOpenCompare}
          />
        ) : (
          <div
            className="overflow-hidden"
            style={{ height: scaledHeight !== undefined ? `${scaledHeight}px` : "auto" }}
          >
            <div
              ref={contentRef}
              className="w-max space-y-8 rounded-xl bg-muted/20 p-3"
              style={{
                transform: bracketScale < 1 ? `scale(${bracketScale})` : undefined,
                transformOrigin: "top left",
              }}
            >
              <div className="grid grid-cols-2 gap-8" data-testid="fourRegionChunk">
                <BracketRegionColumn
                  regionLabel="East"
                  rounds={eastRounds}
                  teamsById={teamsById}
                  side="left"
                  onPickWinner={(gameId, slot) => dispatch({ type: "pick-winner", gameId, slot })}
                  onCompare={(gameId) => dispatch({ type: "open-compare", gameId })}
                />
                <BracketRegionColumn
                  regionLabel="West"
                  rounds={westRounds}
                  teamsById={teamsById}
                  side="right"
                  onPickWinner={(gameId, slot) => dispatch({ type: "pick-winner", gameId, slot })}
                  onCompare={(gameId) => dispatch({ type: "open-compare", gameId })}
                />
              </div>

              <section className="space-y-3">
                <p className="text-center text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  Final Four / Championship
                </p>
                <div className="mx-auto grid w-fit grid-cols-3 items-start gap-3">
                  {finalFourOne ? (
                    <div className="flex justify-center">
                      <BracketGameCard
                        game={finalFourOne}
                        teamsById={teamsById}
                        direction="left"
                        compact
                        onPickWinner={(slot) =>
                          dispatch({ type: "pick-winner", gameId: finalFourOne.id, slot })
                        }
                        onCompare={() => dispatch({ type: "open-compare", gameId: finalFourOne.id })}
                      />
                    </div>
                  ) : (
                    <div />
                  )}
                  {championship ? (
                    <div className="flex justify-center">
                      <BracketGameCard
                        game={championship}
                        teamsById={teamsById}
                        className="border-2"
                        compact
                        direction="center"
                        onPickWinner={(slot) =>
                          dispatch({ type: "pick-winner", gameId: championship.id, slot })
                        }
                        onCompare={() => dispatch({ type: "open-compare", gameId: championship.id })}
                      />
                    </div>
                  ) : (
                    <div />
                  )}
                  {finalFourTwo ? (
                    <div className="flex justify-center">
                      <BracketGameCard
                        game={finalFourTwo}
                        teamsById={teamsById}
                        direction="right"
                        compact
                        onPickWinner={(slot) =>
                          dispatch({ type: "pick-winner", gameId: finalFourTwo.id, slot })
                        }
                        onCompare={() => dispatch({ type: "open-compare", gameId: finalFourTwo.id })}
                      />
                    </div>
                  ) : (
                    <div />
                  )}
                </div>
                <div className="mx-auto w-[14rem] rounded-md border bg-card px-2 py-1.5 text-center shadow-sm">
                  <p className="text-[0.62rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    Champion
                  </p>
                  <div className="mt-0.5 text-xs font-semibold">
                    {championTeam ? <TeamNameWithLogo teamName={championTeam.name} /> : championLabel}
                  </div>
                </div>
              </section>

              <div className="grid grid-cols-2 gap-8" data-testid="fourRegionChunk">
                <BracketRegionColumn
                  regionLabel="South"
                  rounds={southRounds}
                  teamsById={teamsById}
                  side="left"
                  onPickWinner={(gameId, slot) => dispatch({ type: "pick-winner", gameId, slot })}
                  onCompare={(gameId) => dispatch({ type: "open-compare", gameId })}
                />
                <BracketRegionColumn
                  regionLabel="Midwest"
                  rounds={midwestRounds}
                  teamsById={teamsById}
                  side="right"
                  onPickWinner={(gameId, slot) => dispatch({ type: "pick-winner", gameId, slot })}
                  onCompare={(gameId) => dispatch({ type: "open-compare", gameId })}
                />
              </div>

              <section className="space-y-2">
                <p className="text-center text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  First Four
                </p>
                <p className="text-center text-[0.7rem] text-muted-foreground">
                  Winners auto-feed into 16-seed and 11-seed lines in Round of 64.
                </p>
                <div className="mx-auto grid w-fit grid-cols-4 gap-3">
                  {firstFourGames.map((game) => (
                    <div key={game.id} className="flex justify-center">
                      <BracketGameCard
                        game={game}
                        teamsById={teamsById}
                        compact
                        direction="center"
                        onPickWinner={(slot) => dispatch({ type: "pick-winner", gameId: game.id, slot })}
                        onCompare={() => dispatch({ type: "open-compare", gameId: game.id })}
                      />
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </div>
        )}
      </div>

      <BracketCompareOverlay
        open={Boolean(compareGame)}
        onOpenChange={(open) => {
          if (!open) {
            dispatch({ type: "close-compare" });
          }
        }}
        teams={teams}
        teamAId={compareGame?.home.teamId ?? undefined}
        teamBId={compareGame?.away.teamId ?? undefined}
        bracketGameId={compareGame?.id}
        season={state.bracket.year}
        bracketState={state.bracket}
        title={compareGame ? `Compare: ${compareGame.id}` : "Compare Matchup"}
      />
    </div>
  );
}
