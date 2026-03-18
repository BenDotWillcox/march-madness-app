import type { BracketGame, BracketRound, BracketState } from "@/lib/schema/bracket";
import { LOCATION_COORDS_BY_LABEL, type Coordinates } from "@/lib/travel/location-coordinates";

const roundOrder: Record<BracketRound, number> = {
  first_four: 0,
  round_of_64: 1,
  round_of_32: 2,
  sweet_16: 3,
  elite_8: 4,
  final_4: 5,
  championship: 6,
};

const EARTH_RADIUS_MI = 3958.8;

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

export function haversineMiles(a: Coordinates, b: Coordinates) {
  const latDelta = toRadians(b.lat - a.lat);
  const lngDelta = toRadians(b.lng - a.lng);
  const sinLat = Math.sin(latDelta / 2);
  const sinLng = Math.sin(lngDelta / 2);
  const aValue =
    sinLat * sinLat +
    Math.cos(toRadians(a.lat)) * Math.cos(toRadians(b.lat)) * sinLng * sinLng;

  return 2 * EARTH_RADIUS_MI * Math.asin(Math.sqrt(aValue));
}

export type TeamHomeBase = {
  label: string | null;
  lat: number | null;
  lng: number | null;
};

export type TeamTravelStop = {
  id: string;
  kind: "origin" | "game";
  label: string;
  locationLabel: string | null;
  coord: Coordinates | null;
  gameId: string | null;
  round: BracketRound | null;
  opponentLabel: string | null;
};

export type TeamTravelLeg = {
  fromStopId: string;
  toStopId: string;
  miles: number | null;
};

export type TeamTravelProjection = {
  teamId: string;
  startGameId: string | null;
  stops: TeamTravelStop[];
  legs: TeamTravelLeg[];
  knownMilesTotal: number;
  totalMiles: number | null;
  firstLegMiles: number | null;
  missingCoordinates: string[];
};

type TeamNameById = Record<string, string>;

function gameHasTeam(game: BracketGame, teamId: string) {
  return game.home.teamId === teamId || game.away.teamId === teamId;
}

function pickStartingGame(bracketState: BracketState, teamId: string) {
  const candidates = bracketState.games.filter((game) => gameHasTeam(game, teamId));
  if (candidates.length === 0) {
    return null;
  }

  const sorted = [...candidates].sort((a, b) => {
    const roundDelta = roundOrder[a.round] - roundOrder[b.round];
    if (roundDelta !== 0) {
      return roundDelta;
    }
    return a.id.localeCompare(b.id);
  });

  return sorted[0];
}

function projectedWinningPath(bracketState: BracketState, startGameId: string) {
  const byId = new Map(bracketState.games.map((game) => [game.id, game]));
  const visited = new Set<string>();
  const path: BracketGame[] = [];

  let current: BracketGame | undefined = byId.get(startGameId);
  while (current && !visited.has(current.id)) {
    visited.add(current.id);
    path.push(current);
    current = current.nextGameId ? byId.get(current.nextGameId) : undefined;
  }

  return path;
}

function slotLabel(slot: BracketGame["home"], teamNamesById?: TeamNameById) {
  if (slot.teamId) {
    return teamNamesById?.[slot.teamId] ?? `Team ${slot.teamId}`;
  }
  if (slot.sourceLabel) {
    return slot.sourceLabel;
  }
  if (typeof slot.seed === "number") {
    return `Seed ${slot.seed}`;
  }
  return "TBD";
}

export function collectMissingBracketLocationLabels(
  bracketState: BracketState,
  coordinatesByLabel: Record<string, Coordinates> = LOCATION_COORDS_BY_LABEL,
) {
  const missing = new Set<string>();

  for (const game of bracketState.games) {
    const location = game.gameInfo?.location?.trim();
    if (!location) {
      continue;
    }
    if (!coordinatesByLabel[location]) {
      missing.add(location);
    }
  }

  return [...missing].sort((a, b) => a.localeCompare(b));
}

export function buildTeamTravelProjection(
  bracketState: BracketState,
  teamId: string,
  homeBase: TeamHomeBase,
  coordinatesByLabel: Record<string, Coordinates> = LOCATION_COORDS_BY_LABEL,
  teamNamesById?: TeamNameById,
): TeamTravelProjection {
  const startingGame = pickStartingGame(bracketState, teamId);
  if (!startingGame) {
    return {
      teamId,
      startGameId: null,
      stops: [],
      legs: [],
      knownMilesTotal: 0,
      totalMiles: null,
      firstLegMiles: null,
      missingCoordinates: [],
    };
  }

  const missingCoordinates = new Set<string>();
  const gamePath = projectedWinningPath(bracketState, startingGame.id);
  const stops: TeamTravelStop[] = [];

  const originCoord =
    homeBase.lat !== null &&
    homeBase.lng !== null &&
    Number.isFinite(homeBase.lat) &&
    Number.isFinite(homeBase.lng)
      ? { lat: homeBase.lat, lng: homeBase.lng }
      : null;

  stops.push({
    id: "origin",
    kind: "origin",
    label: homeBase.label ?? "Team Origin",
    locationLabel: homeBase.label,
    coord: originCoord,
    gameId: null,
    round: null,
    opponentLabel: null,
  });

  let assumedSlot: "home" | "away" | null = null;
  for (const game of gamePath) {
    const teamSlot =
      game.home.teamId === teamId
        ? "home"
        : game.away.teamId === teamId
          ? "away"
          : assumedSlot;
    const opponentSlot = teamSlot === "home" ? game.away : teamSlot === "away" ? game.home : null;
    const locationLabel = game.gameInfo?.location?.trim() ?? null;
    const coord = locationLabel ? coordinatesByLabel[locationLabel] ?? null : null;

    if (locationLabel && !coord) {
      missingCoordinates.add(locationLabel);
    }

    stops.push({
      id: game.id,
      kind: "game",
      label: locationLabel ?? `${game.round} site TBD`,
      locationLabel,
      coord,
      gameId: game.id,
      round: game.round,
      opponentLabel: opponentSlot ? slotLabel(opponentSlot, teamNamesById) : null,
    });

    assumedSlot = game.nextSlot;
  }

  const legs: TeamTravelLeg[] = [];
  let knownMilesTotal = 0;
  let hasUnknownLeg = false;

  for (let index = 1; index < stops.length; index += 1) {
    const from = stops[index - 1];
    const to = stops[index];
    if (!from.coord || !to.coord) {
      hasUnknownLeg = true;
      legs.push({
        fromStopId: from.id,
        toStopId: to.id,
        miles: null,
      });
      continue;
    }

    const miles = haversineMiles(from.coord, to.coord);
    knownMilesTotal += miles;
    legs.push({
      fromStopId: from.id,
      toStopId: to.id,
      miles,
    });
  }

  return {
    teamId,
    startGameId: startingGame.id,
    stops,
    legs,
    knownMilesTotal: Math.round(knownMilesTotal),
    totalMiles: hasUnknownLeg ? null : Math.round(knownMilesTotal),
    firstLegMiles: legs[0]?.miles ? Math.round(legs[0].miles) : null,
    missingCoordinates: [...missingCoordinates].sort((a, b) => a.localeCompare(b)),
  };
}
