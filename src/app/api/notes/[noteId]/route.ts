import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { teamRepo } from "@/lib/data/team-repo";
import { teamNoteUpdateSchema } from "@/lib/schema/note";

export const runtime = "nodejs";

type Params = {
  params: Promise<{
    noteId: string;
  }>;
};

export async function PATCH(request: Request, context: Params) {
  try {
    const { noteId } = await context.params;
    const json = await request.json();
    const payload = teamNoteUpdateSchema.partial().parse(json);
    const note = await teamRepo.updateNote(noteId, payload);

    if (!note) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }

    return NextResponse.json({ note });
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

    return NextResponse.json({ error: "Failed to update note" }, { status: 500 });
  }
}

export async function DELETE(_: Request, context: Params) {
  const { noteId } = await context.params;
  const deleted = await teamRepo.deleteNote(noteId);

  if (!deleted) {
    return NextResponse.json({ error: "Note not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
