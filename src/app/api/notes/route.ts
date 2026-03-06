import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { teamRepo } from "@/lib/data/team-repo";
import { teamNoteInputSchema } from "@/lib/schema/note";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const teamId = searchParams.get("teamId") ?? undefined;

  const notes = await teamRepo.listNotes(teamId);
  return NextResponse.json({ notes });
}

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const payload = teamNoteInputSchema.parse(json);
    const note = await teamRepo.addNote(payload);

    return NextResponse.json({ note }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          error: "Invalid note payload",
          issues: error.issues,
        },
        { status: 400 },
      );
    }

    return NextResponse.json({ error: "Failed to add note" }, { status: 500 });
  }
}
