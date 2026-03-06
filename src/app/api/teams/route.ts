import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { teamRepo } from "@/lib/data/team-repo";
import { teamInputSchema } from "@/lib/schema/team";

export const runtime = "nodejs";

export async function GET() {
  const teams = await teamRepo.listTeams();
  return NextResponse.json({ teams });
}

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const payload = teamInputSchema.parse(json);
    const team = await teamRepo.upsertTeam(payload);

    return NextResponse.json({ team }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          error: "Invalid team payload",
          issues: error.issues,
        },
        { status: 400 },
      );
    }

    return NextResponse.json({ error: "Failed to create team" }, { status: 500 });
  }
}
