import { NextResponse } from "next/server";
import { gameRepo } from "@/lib/data/game-repo";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const bracketGameId = searchParams.get("bracketGameId")?.trim();
  const seasonParam = searchParams.get("season")?.trim();

  if (!bracketGameId) {
    return NextResponse.json(
      {
        error: "Missing required query param: bracketGameId",
      },
      { status: 400 },
    );
  }

  const season = Number(seasonParam);
  if (!seasonParam || Number.isNaN(season)) {
    return NextResponse.json(
      {
        error: "Missing or invalid required query param: season",
      },
      { status: 400 },
    );
  }

  try {
    const game = await gameRepo.findByBracketGameId({
      season,
      bracketGameId,
    });
    return NextResponse.json({ game });
  } catch {
    return NextResponse.json({ error: "Failed to load game odds" }, { status: 500 });
  }
}
