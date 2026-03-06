import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { teamRepo } from "@/lib/data/team-repo";
import { teamInputSchema } from "@/lib/schema/team";

export const runtime = "nodejs";

type Params = {
  params: Promise<{
    teamId: string;
  }>;
};

export async function GET(_: Request, context: Params) {
  const { teamId } = await context.params;
  const team = await teamRepo.getTeam(teamId);

  if (!team) {
    return NextResponse.json({ error: "Team not found" }, { status: 404 });
  }

  return NextResponse.json({ team });
}

export async function PUT(request: Request, context: Params) {
  try {
    const { teamId } = await context.params;
    const json = await request.json();
    const payload = teamInputSchema.parse({ ...json, id: teamId });
    const team = await teamRepo.upsertTeam(payload);

    return NextResponse.json({ team });
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

    return NextResponse.json({ error: "Failed to update team" }, { status: 500 });
  }
}

export async function DELETE(_: Request, context: Params) {
  const { teamId } = await context.params;
  const deleted = await teamRepo.deleteTeam(teamId);

  if (!deleted) {
    return NextResponse.json({ error: "Team not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
