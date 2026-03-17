import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { gameSchema, type Game } from "@/lib/schema/game";

type GameRow = {
  game_id: number;
  season: number;
  bracket_game_id: string;
  home: string;
  away: string;
  home_score: number | string | null;
  away_score: number | string | null;
  line: number | string | null;
  vegas_line: number | string | null;
  ou: number | string | null;
  vegas_ou: number | string | null;
  home_win_prob: number | string | null;
  away_win_prob: number | string | null;
};

function getSupabaseServerClient(): SupabaseClient {
  const url = process.env.SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.SUPABASE_SECRET_KEY;

  if (!url || !key) {
    throw new Error("Missing SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SECRET_KEY.");
  }

  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function rowToGame(row: GameRow): Game {
  return gameSchema.parse({
    gameId: row.game_id,
    season: row.season,
    bracketGameId: row.bracket_game_id,
    home: row.home,
    away: row.away,
    homeScore: row.home_score,
    awayScore: row.away_score,
    line: row.line,
    vegasLine: row.vegas_line,
    ou: row.ou,
    vegasOu: row.vegas_ou,
    homeWinProb: row.home_win_prob,
    awayWinProb: row.away_win_prob,
  });
}

export interface GameRepo {
  findByBracketGameId(input: { season: number; bracketGameId: string }): Promise<Game | null>;
}

class SupabaseGameRepo implements GameRepo {
  private readonly supabase = getSupabaseServerClient();

  async findByBracketGameId({
    season,
    bracketGameId,
  }: {
    season: number;
    bracketGameId: string;
  }): Promise<Game | null> {
    const { data, error } = await this.supabase
      .from("games")
      .select("*")
      .eq("season", season)
      .eq("bracket_game_id", bracketGameId)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to load game odds: ${error.message}`);
    }

    if (!data) {
      return null;
    }

    return rowToGame(data as GameRow);
  }
}

export const gameRepo: GameRepo = new SupabaseGameRepo();
