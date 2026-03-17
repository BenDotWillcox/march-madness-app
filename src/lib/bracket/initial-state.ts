import type { BracketGame, BracketSlot, BracketState } from "@/lib/schema/bracket";

type Region = "east" | "west" | "south" | "midwest";

const regionalSeedMatchups: Array<[number, number]> = [
  [1, 16],
  [8, 9],
  [5, 12],
  [4, 13],
  [6, 11],
  [3, 14],
  [7, 10],
  [2, 15],
];

function emptyGameInfo() {
  return {
    tipoff: null,
    location: null,
    spread: null,
    total: null,
  };
}

function createSlot(seed: number | null, sourceLabel: string): BracketSlot {
  return {
    seed,
    teamId: null,
    sourceLabel,
  };
}

function createRegionalGames(region: Region): BracketGame[] {
  const games: BracketGame[] = [];

  for (let index = 0; index < regionalSeedMatchups.length; index += 1) {
    const [homeSeed, awaySeed] = regionalSeedMatchups[index];
    const gameNumber = index + 1;
    games.push({
      id: `${region}-r64-${gameNumber}`,
      round: "round_of_64",
      region,
      home: createSlot(homeSeed, `(${homeSeed}) ${region.toUpperCase()} TBD`),
      away: createSlot(awaySeed, `(${awaySeed}) ${region.toUpperCase()} TBD`),
      winnerTeamId: null,
      winnerSourceLabel: null,
      nextGameId: `${region}-r32-${Math.floor(index / 2) + 1}`,
      nextSlot: index % 2 === 0 ? "home" : "away",
      gameInfo: emptyGameInfo(),
    });
  }

  for (let index = 0; index < 4; index += 1) {
    const gameNumber = index + 1;
    games.push({
      id: `${region}-r32-${gameNumber}`,
      round: "round_of_32",
      region,
      home: createSlot(null, `Winner of ${region}-r64-${index * 2 + 1}`),
      away: createSlot(null, `Winner of ${region}-r64-${index * 2 + 2}`),
      winnerTeamId: null,
      winnerSourceLabel: null,
      nextGameId: `${region}-s16-${Math.floor(index / 2) + 1}`,
      nextSlot: index % 2 === 0 ? "home" : "away",
      gameInfo: emptyGameInfo(),
    });
  }

  for (let index = 0; index < 2; index += 1) {
    const gameNumber = index + 1;
    games.push({
      id: `${region}-s16-${gameNumber}`,
      round: "sweet_16",
      region,
      home: createSlot(null, `Winner of ${region}-r32-${index * 2 + 1}`),
      away: createSlot(null, `Winner of ${region}-r32-${index * 2 + 2}`),
      winnerTeamId: null,
      winnerSourceLabel: null,
      nextGameId: `${region}-e8-1`,
      nextSlot: index % 2 === 0 ? "home" : "away",
      gameInfo: emptyGameInfo(),
    });
  }

  games.push({
    id: `${region}-e8-1`,
    round: "elite_8",
    region,
    home: createSlot(null, `Winner of ${region}-s16-1`),
    away: createSlot(null, `Winner of ${region}-s16-2`),
    winnerTeamId: null,
    winnerSourceLabel: null,
    nextGameId:
      region === "east" || region === "south"
        ? "final-four-1"
        : "final-four-2",
    nextSlot: region === "east" || region === "midwest" ? "home" : "away",
    gameInfo: emptyGameInfo(),
  });

  return games;
}

function createFirstFourGames(): BracketGame[] {
  return [
    {
      id: "first-four-1",
      round: "first_four",
      region: "national",
      home: createSlot(16, "(16) First Four Team A"),
      away: createSlot(16, "(16) First Four Team B"),
      winnerTeamId: null,
      winnerSourceLabel: null,
      nextGameId: "midwest-r64-1",
      nextSlot: "away",
      gameInfo: emptyGameInfo(),
    },
    {
      id: "first-four-2",
      round: "first_four",
      region: "national",
      home: createSlot(11, "(11) First Four Team C"),
      away: createSlot(11, "(11) First Four Team D"),
      winnerTeamId: null,
      winnerSourceLabel: null,
      nextGameId: "west-r64-5",
      nextSlot: "away",
      gameInfo: emptyGameInfo(),
    },
    {
      id: "first-four-3",
      round: "first_four",
      region: "national",
      home: createSlot(16, "(16) First Four Team E"),
      away: createSlot(16, "(16) First Four Team F"),
      winnerTeamId: null,
      winnerSourceLabel: null,
      nextGameId: "south-r64-1",
      nextSlot: "away",
      gameInfo: emptyGameInfo(),
    },
    {
      id: "first-four-4",
      round: "first_four",
      region: "national",
      home: createSlot(11, "(11) First Four Team G"),
      away: createSlot(11, "(11) First Four Team H"),
      winnerTeamId: null,
      winnerSourceLabel: null,
      nextGameId: "midwest-r64-5",
      nextSlot: "away",
      gameInfo: emptyGameInfo(),
    },
  ];
}

function createNationalGames(): BracketGame[] {
  return [
    {
      id: "final-four-1",
      round: "final_4",
      region: "national",
      home: createSlot(null, "Winner of east-e8-1"),
      away: createSlot(null, "Winner of south-e8-1"),
      winnerTeamId: null,
      winnerSourceLabel: null,
      nextGameId: "championship-1",
      nextSlot: "home",
      gameInfo: emptyGameInfo(),
    },
    {
      id: "final-four-2",
      round: "final_4",
      region: "national",
      home: createSlot(null, "Winner of midwest-e8-1"),
      away: createSlot(null, "Winner of west-e8-1"),
      winnerTeamId: null,
      winnerSourceLabel: null,
      nextGameId: "championship-1",
      nextSlot: "away",
      gameInfo: emptyGameInfo(),
    },
    {
      id: "championship-1",
      round: "championship",
      region: "national",
      home: createSlot(null, "Winner of final-four-1"),
      away: createSlot(null, "Winner of final-four-2"),
      winnerTeamId: null,
      winnerSourceLabel: null,
      nextGameId: null,
      nextSlot: null,
      gameInfo: emptyGameInfo(),
    },
  ];
}

export function createInitialBracketState(year = new Date().getFullYear()): BracketState {
  const games: BracketGame[] = [
    ...createFirstFourGames(),
    ...createRegionalGames("east"),
    ...createRegionalGames("west"),
    ...createRegionalGames("south"),
    ...createRegionalGames("midwest"),
    ...createNationalGames(),
  ];

  return {
    year,
    games,
    updatedAt: new Date().toISOString(),
  };
}
