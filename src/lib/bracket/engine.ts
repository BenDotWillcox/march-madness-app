import type { BracketGame, BracketSlot, BracketState } from "@/lib/schema/bracket";

export type BracketSlotKey = "home" | "away";

function cloneSlot(slot: BracketSlot): BracketSlot {
  return {
    seed: slot.seed,
    teamId: slot.teamId,
    sourceLabel: slot.sourceLabel ?? null,
  };
}

function cloneGame(game: BracketGame): BracketGame {
  return {
    ...game,
    home: cloneSlot(game.home),
    away: cloneSlot(game.away),
    gameInfo: game.gameInfo
      ? {
          tipoff: game.gameInfo.tipoff,
          location: game.gameInfo.location,
          spread: game.gameInfo.spread,
          total: game.gameInfo.total,
        }
      : undefined,
  };
}

function slotsEqual(a: BracketSlot, b: BracketSlot) {
  return a.seed === b.seed && a.teamId === b.teamId && (a.sourceLabel ?? null) === (b.sourceLabel ?? null);
}

function hasWinner(game: BracketGame) {
  return Boolean(game.winnerTeamId || game.winnerSourceLabel);
}

function winnerMatchesSlot(game: BracketGame, slot: BracketSlot) {
  if (!hasWinner(game)) {
    return false;
  }

  if (game.winnerTeamId) {
    return slot.teamId === game.winnerTeamId;
  }

  return (slot.sourceLabel ?? null) === (game.winnerSourceLabel ?? null);
}

function currentWinnerSlot(game: BracketGame): BracketSlot {
  if (winnerMatchesSlot(game, game.home)) {
    return cloneSlot(game.home);
  }

  if (winnerMatchesSlot(game, game.away)) {
    return cloneSlot(game.away);
  }

  return {
    seed: null,
    teamId: game.winnerTeamId,
    sourceLabel: game.winnerSourceLabel ?? null,
  };
}

function placeholderWinnerSlot(game: BracketGame): BracketSlot {
  return {
    seed: null,
    teamId: null,
    sourceLabel: `Winner of ${game.id}`,
  };
}

function clearWinner(game: BracketGame) {
  game.winnerTeamId = null;
  game.winnerSourceLabel = null;
}

function winnerIsValid(game: BracketGame) {
  if (!hasWinner(game)) {
    return true;
  }

  return winnerMatchesSlot(game, game.home) || winnerMatchesSlot(game, game.away);
}

function syncWinnerToNext(game: BracketGame, gamesById: Map<string, BracketGame>) {
  if (!game.nextGameId || !game.nextSlot) {
    return null;
  }

  const nextGame = gamesById.get(game.nextGameId);
  if (!nextGame) {
    return null;
  }

  const nextSlotValue = hasWinner(game) ? currentWinnerSlot(game) : placeholderWinnerSlot(game);
  const previousSlotValue = cloneSlot(nextGame[game.nextSlot]);
  nextGame[game.nextSlot] = nextSlotValue;

  return {
    nextGame,
    changed: !slotsEqual(previousSlotValue, nextSlotValue),
  };
}

function clearInvalidWinnersDownstream(
  gameId: string,
  gamesById: Map<string, BracketGame>,
  visited = new Set<string>(),
) {
  if (visited.has(gameId)) {
    return;
  }

  visited.add(gameId);

  const game = gamesById.get(gameId);
  if (!game) {
    return;
  }

  if (!winnerIsValid(game)) {
    clearWinner(game);
    const syncResult = syncWinnerToNext(game, gamesById);
    if (syncResult?.nextGame) {
      clearInvalidWinnersDownstream(syncResult.nextGame.id, gamesById, visited);
    }
    return;
  }

  if (game.nextGameId) {
    clearInvalidWinnersDownstream(game.nextGameId, gamesById, visited);
  }
}

export function validateBracketLinks(state: BracketState): string[] {
  const gameIds = new Set(state.games.map((game) => game.id));
  const errors: string[] = [];

  for (const game of state.games) {
    if (game.nextGameId && !gameIds.has(game.nextGameId)) {
      errors.push(`${game.id} references missing next game '${game.nextGameId}'.`);
    }

    if (game.nextGameId && !game.nextSlot) {
      errors.push(`${game.id} has nextGameId but no nextSlot.`);
    }

    if (!game.nextGameId && game.nextSlot) {
      errors.push(`${game.id} has nextSlot but no nextGameId.`);
    }
  }

  return errors;
}

export function applyWinnerSelection(
  state: BracketState,
  gameId: string,
  slot: BracketSlotKey,
): BracketState {
  const games = state.games.map(cloneGame);
  const gamesById = new Map(games.map((game) => [game.id, game]));
  const game = gamesById.get(gameId);

  if (!game) {
    return state;
  }

  const selected = cloneSlot(game[slot]);
  const alreadySelectedWinner = winnerMatchesSlot(game, selected);

  if (alreadySelectedWinner) {
    clearWinner(game);
  } else {
    game.winnerTeamId = selected.teamId;
    game.winnerSourceLabel = selected.sourceLabel ?? null;
  }

  const syncResult = syncWinnerToNext(game, gamesById);
  if (syncResult?.changed) {
    clearInvalidWinnersDownstream(syncResult.nextGame.id, gamesById);
  }

  return {
    ...state,
    games,
    updatedAt: new Date().toISOString(),
  };
}
