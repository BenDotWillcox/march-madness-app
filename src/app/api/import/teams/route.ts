import { NextResponse } from "next/server";
import { teamRepo } from "@/lib/data/team-repo";
import {
  defaultExcelRelativePath,
  importTeamsFromExcel,
  importTeamsFromExcelBuffer,
  resolveExcelPath,
} from "@/lib/import/excel-import";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    let importedFrom = resolveExcelPath(defaultExcelRelativePath);
    let sheetName: string;
    let teams;

    try {
      const formData = await request.formData();
      const file = formData.get("file");

      if (file instanceof File && file.size > 0) {
        const arrayBuffer = await file.arrayBuffer();
        const parsed = importTeamsFromExcelBuffer(Buffer.from(arrayBuffer), {
          sourceName: file.name,
        });
        teams = parsed.teams;
        sheetName = parsed.sheetName;
        importedFrom = parsed.workbookPath;
      } else {
        const parsed = await importTeamsFromExcel();
        teams = parsed.teams;
        sheetName = parsed.sheetName;
        importedFrom = parsed.workbookPath;
      }
    } catch {
      const parsed = await importTeamsFromExcel();
      teams = parsed.teams;
      sheetName = parsed.sheetName;
      importedFrom = parsed.workbookPath;
    }

    const result = await teamRepo.replaceTeams(teams);

    return NextResponse.json({
      imported: result.total,
      sourceFile: importedFrom,
      sheetName,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to import teams from Excel",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
