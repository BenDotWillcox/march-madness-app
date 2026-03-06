import path from "node:path";
import { NextResponse } from "next/server";
import { teamRepo } from "@/lib/data/team-repo";
import { importTeamsFromExcel } from "@/lib/import/excel-import";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      filePath?: string;
      sheetName?: string;
    };

    const { teams, workbookPath, sheetName } = await importTeamsFromExcel({
      filePath: body.filePath,
      sheetName: body.sheetName,
    });

    const result = await teamRepo.replaceTeams(teams);

    return NextResponse.json({
      imported: result.total,
      sourceFile: path.relative(process.cwd(), workbookPath),
      sheetName,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to import teams from Excel",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 400 },
    );
  }
}
