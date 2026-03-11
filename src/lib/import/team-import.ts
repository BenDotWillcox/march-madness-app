import { type TeamInput } from "@/lib/schema/team";
import { parseTeamTagsFromEditor } from "@/lib/tags";

type TeamColumnMap = {
  id: string[];
  name: string[];
  conference: string[];
  wins: string[];
  losses: string[];
  netRanking: string[];
  kenpomAdjEm: string[];
  evanMiyaRank: string[];
  bartTorvikRank: string[];
  offenseAdj: string[];
  defenseAdj: string[];
  offRank: string[];
  defRank: string[];
  tempoRank: string[];
  overallRating: string[];
  offenseRating: string[];
  defenseRating: string[];
  tempoRating: string[];
  twoFgPct: string[];
  threeFgPct: string[];
  ftPct: string[];
  eFgPct: string[];
  ftRate: string[];
  threePRate: string[];
  ftRateD: string[];
  threePRateD: string[];
  eFgPctD: string[];
  twoFgPctD: string[];
  threeFgPctD: string[];
  aRateD: string[];
  orPct: string[];
  drPct: string[];
  toPct: string[];
  toPctD: string[];
  aRate: string[];
  q1Wins: string[];
  q1Losses: string[];
  q2Wins: string[];
  q2Losses: string[];
  q3Wins: string[];
  q3Losses: string[];
  q4Wins: string[];
  q4Losses: string[];
  wab: string[];
  kpi: string[];
  seed: string[];
  tags: string[];
};

export const teamColumnMap: TeamColumnMap = {
  id: ["id", "team_id", "slug"],
  name: ["team", "team_name", "teamname", "name"],
  conference: ["conference", "conf"],
  wins: ["wins", "w", "wl"],
  losses: ["losses", "l", "wl"],
  netRanking: ["net", "net_rank", "net_ranking", "netRanking"],
  kenpomAdjEm: ["kenpom", "kenpom_adjem", "kenpomAdjEm", "adjem"],
  evanMiyaRank: ["evanmiya", "evan_miya", "evanmiya_rank", "evanMiyaRank"],
  bartTorvikRank: ["t-rank", "t_rank", "bart_torvik_rank", "bartTorvikRank", "torvik"],
  offenseAdj: ["off_t-rank", "off_t_rank", "offense_adj", "offenseAdj", "adj_o", "offrank", "off_rank"],
  defenseAdj: ["def_t-rank", "def_t_rank", "defense_adj", "defenseAdj", "adj_d", "defrank", "def_rank"],
  offRank: ["offrank", "off_rank", "offense_rank", "off_ranking"],
  defRank: ["defrank", "def_rank", "defense_rank", "def_ranking"],
  tempoRank: ["temporank", "tempo_rank", "tempo_ranking"],
  overallRating: ["overallrating", "overall_rating", "overall", "relativerating", "relative_rating"],
  offenseRating: ["offenserating", "offense_rating", "off_rating", "offrating", "off_rating_value"],
  defenseRating: ["defenserating", "defense_rating", "def_rating", "defrating", "def_rating_value"],
  tempoRating: ["temporating", "tempo_rating"],
  twoFgPct: ["2fg%", "2fg_pct", "2fgpct", "twofg%", "twofg_pct", "2pt_fg%"],
  threeFgPct: ["3fg%", "3fg_pct", "3fgpct", "threefg%", "threefg_pct", "3pt_fg%"],
  ftPct: ["ft%", "ft_pct", "ftpct", "free_throw%", "free_throw_pct"],
  eFgPct: ["efg%", "efg_pct", "efgpct", "effective_fg%", "effective_fg_pct"],
  ftRate: ["ftrate", "ft_rate", "ft/fg", "fta_fga"],
  threePRate: ["3prate", "3p_rate", "3pa_rate", "3pa/fga", "3pa_fga"],
  ftRateD: ["ftrated", "ftrated%", "ft_rate_d", "ftrate_d", "ftrate%_d", "ftrate_d%"],
  threePRateD: ["3prated", "3prated%", "3p_rate_d", "3prate_d", "3prate%_d", "3prate_d%"],
  eFgPctD: ["efg%d", "efg%_d", "efg_pct_d", "efgpctd", "effective_fg%_d", "effective_fg_pct_d"],
  twoFgPctD: ["2fg%d", "2fg%_d", "2fg_pct_d", "2fgpctd", "2pt_fg%_d"],
  threeFgPctD: ["3fg%d", "3fg%_d", "3fg_pct_d", "3fgpctd", "3pt_fg%_d"],
  aRateD: ["arated", "a_rate_d", "arate_d", "assist_rate_d", "assist%_d"],
  orPct: ["or%", "or_pct", "orpct", "off_reb%", "off_reb_pct", "offensive_rebound%"],
  drPct: ["dr%", "dr_pct", "drpct", "def_reb%", "def_reb_pct", "defensive_rebound%"],
  toPct: ["to%", "to_pct", "topct", "turnover%", "turnover_pct"],
  toPctD: ["to%d", "to%_d", "to_pct_d", "topctd", "turnover%_d", "turnover_pct_d"],
  aRate: ["arate", "a_rate", "assist_rate", "assist%", "assist_pct"],
  q1Wins: ["q1_wins", "q1Wins"],
  q1Losses: ["q1_losses", "q1Losses"],
  q2Wins: ["q2_wins", "q2Wins"],
  q2Losses: ["q2_losses", "q2Losses"],
  q3Wins: ["q3_wins", "q3Wins"],
  q3Losses: ["q3_losses", "q3Losses"],
  q4Wins: ["q4_wins", "q4Wins"],
  q4Losses: ["q4_losses", "q4Losses"],
  wab: ["wab", "wins_above_bubble", "winsAboveBubble"],
  kpi: ["kpi"],
  seed: ["seed"],
  tags: ["tags", "labels"],
};

export function normalizeHeader(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, "_");
}

export function findColumnKey(normalizedHeaders: string[], aliases: string[]): string | null {
  const found = aliases
    .map((alias) => normalizeHeader(alias))
    .find((alias) => normalizedHeaders.includes(alias));

  return found ?? null;
}

function toStringValue(value: unknown) {
  if (value === null || value === undefined) {
    return undefined;
  }

  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  return undefined;
}

function toNumber(value: string | undefined) {
  if (!value) {
    return null;
  }

  const parsed = Number(value.trim());
  return Number.isFinite(parsed) ? parsed : null;
}

function toInt(value: string | undefined, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : fallback;
}

function parseRecord(value: string | undefined) {
  if (!value) {
    return null;
  }

  const match = value.trim().match(/^(\d+)\s*-\s*(\d+)$/);
  if (!match) {
    return null;
  }

  return {
    wins: Number(match[1]),
    losses: Number(match[2]),
  };
}

type TabularRow = Record<string, unknown>;

function valueByAliases(row: TabularRow, aliases: string[]) {
  const normalizedKeys = Object.keys(row).reduce<Record<string, string>>((acc, key) => {
    acc[normalizeHeader(key)] = key;
    return acc;
  }, {});

  const normalizedAlias = aliases
    .map((alias) => normalizeHeader(alias))
    .find((alias) => alias in normalizedKeys);

  if (!normalizedAlias) {
    return undefined;
  }

  const originalKey = normalizedKeys[normalizedAlias];
  return toStringValue(row[originalKey]);
}

export function makeTeamId(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

export function parseTeamRows(rows: TabularRow[]): TeamInput[] {
  if (rows.length === 0) {
    throw new Error("Spreadsheet has no rows.");
  }

  const normalizedHeaders = Object.keys(rows[0] ?? {}).map((header) => normalizeHeader(header));
  const requiredColumns = ["name"] as const;

  for (const required of requiredColumns) {
    const exists = Boolean(findColumnKey(normalizedHeaders, teamColumnMap[required]));
    if (!exists) {
      throw new Error(
        `Missing required column aliases for '${required}'. Expected one of: ${teamColumnMap[
          required
        ].join(", ")}`,
      );
    }
  }

  const parsedTeams: Array<TeamInput | null> = rows.map((row) => {
      const name = valueByAliases(row, teamColumnMap.name)?.trim() ?? "";
      if (!name) {
        return null;
      }

      const idFromFile = valueByAliases(row, teamColumnMap.id)?.trim();
      const seed = toNumber(valueByAliases(row, teamColumnMap.seed));
      const overallRecord = parseRecord(valueByAliases(row, teamColumnMap.wins));
      const q1Record = parseRecord(valueByAliases(row, ["q1", ...teamColumnMap.q1Wins]));
      const q2Record = parseRecord(valueByAliases(row, ["q2", ...teamColumnMap.q2Wins]));
      const q3Record = parseRecord(valueByAliases(row, ["q3", ...teamColumnMap.q3Wins]));
      const q4Record = parseRecord(valueByAliases(row, ["q4", ...teamColumnMap.q4Wins]));

      return {
        id: idFromFile || makeTeamId(name),
        name,
        conference: valueByAliases(row, teamColumnMap.conference)?.trim() || "Unknown",
        record: {
          wins: toInt(valueByAliases(row, teamColumnMap.wins), overallRecord?.wins ?? 0),
          losses: toInt(valueByAliases(row, teamColumnMap.losses), overallRecord?.losses ?? 0),
        },
        predictiveMetrics: {
          netRanking: toNumber(valueByAliases(row, teamColumnMap.netRanking)),
          kenpomAdjEm: toNumber(valueByAliases(row, teamColumnMap.kenpomAdjEm)),
          evanMiyaRank: toNumber(valueByAliases(row, teamColumnMap.evanMiyaRank)),
          bartTorvikRank: toNumber(valueByAliases(row, teamColumnMap.bartTorvikRank)),
          offenseAdj: toNumber(valueByAliases(row, teamColumnMap.offenseAdj)),
          defenseAdj: toNumber(valueByAliases(row, teamColumnMap.defenseAdj)),
          offRank: toNumber(valueByAliases(row, teamColumnMap.offRank)),
          defRank: toNumber(valueByAliases(row, teamColumnMap.defRank)),
          tempoRank: toNumber(valueByAliases(row, teamColumnMap.tempoRank)),
          overallRating: toNumber(valueByAliases(row, teamColumnMap.overallRating)),
          offenseRating: toNumber(valueByAliases(row, teamColumnMap.offenseRating)),
          defenseRating: toNumber(valueByAliases(row, teamColumnMap.defenseRating)),
          tempoRating: toNumber(valueByAliases(row, teamColumnMap.tempoRating)),
          twoFgPct: toNumber(valueByAliases(row, teamColumnMap.twoFgPct)),
          threeFgPct: toNumber(valueByAliases(row, teamColumnMap.threeFgPct)),
          ftPct: toNumber(valueByAliases(row, teamColumnMap.ftPct)),
          eFgPct: toNumber(valueByAliases(row, teamColumnMap.eFgPct)),
          ftRate: toNumber(valueByAliases(row, teamColumnMap.ftRate)),
          threePRate: toNumber(valueByAliases(row, teamColumnMap.threePRate)),
          ftRateD: toNumber(valueByAliases(row, teamColumnMap.ftRateD)),
          threePRateD: toNumber(valueByAliases(row, teamColumnMap.threePRateD)),
          eFgPctD: toNumber(valueByAliases(row, teamColumnMap.eFgPctD)),
          twoFgPctD: toNumber(valueByAliases(row, teamColumnMap.twoFgPctD)),
          threeFgPctD: toNumber(valueByAliases(row, teamColumnMap.threeFgPctD)),
          aRateD: toNumber(valueByAliases(row, teamColumnMap.aRateD)),
          orPct: toNumber(valueByAliases(row, teamColumnMap.orPct)),
          drPct: toNumber(valueByAliases(row, teamColumnMap.drPct)),
          toPct: toNumber(valueByAliases(row, teamColumnMap.toPct)),
          toPctD: toNumber(valueByAliases(row, teamColumnMap.toPctD)),
          aRate: toNumber(valueByAliases(row, teamColumnMap.aRate)),
        },
        resumeMetrics: {
          q1Wins: toInt(valueByAliases(row, teamColumnMap.q1Wins), q1Record?.wins ?? 0),
          q1Losses: toInt(valueByAliases(row, teamColumnMap.q1Losses), q1Record?.losses ?? 0),
          q2Wins: toInt(valueByAliases(row, teamColumnMap.q2Wins), q2Record?.wins ?? 0),
          q2Losses: toInt(valueByAliases(row, teamColumnMap.q2Losses), q2Record?.losses ?? 0),
          q3Wins: toInt(valueByAliases(row, teamColumnMap.q3Wins), q3Record?.wins ?? 0),
          q3Losses: toInt(valueByAliases(row, teamColumnMap.q3Losses), q3Record?.losses ?? 0),
          q4Wins: toInt(valueByAliases(row, teamColumnMap.q4Wins), q4Record?.wins ?? 0),
          q4Losses: toInt(valueByAliases(row, teamColumnMap.q4Losses), q4Record?.losses ?? 0),
          wab: toNumber(valueByAliases(row, teamColumnMap.wab)),
          kpi: toNumber(valueByAliases(row, teamColumnMap.kpi)),
        },
        tags: parseTeamTagsFromEditor((valueByAliases(row, teamColumnMap.tags) || "").replace(/;/g, ",")),
        seed: seed == null ? undefined : Math.trunc(seed),
        teamColor: null,
      } satisfies TeamInput;
    });

  return parsedTeams.filter((team): team is TeamInput => team !== null);
}

export function rowsToTeamInputs(rows: TabularRow[]): TeamInput[] {
  return parseTeamRows(rows);
}
