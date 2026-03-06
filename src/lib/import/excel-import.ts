import { promises as fs } from "node:fs";
import path from "node:path";
import * as XLSX from "xlsx";
import { rowsToTeamInputs } from "@/lib/import/team-import";
import { type TeamInput } from "@/lib/schema/team";

export const defaultExcelRelativePath = path.join("data", "excel_data", "NCAA_Statistics.xlsx");

export function resolveExcelPath(relativeOrAbsolutePath?: string) {
  if (!relativeOrAbsolutePath) {
    return path.join(process.cwd(), defaultExcelRelativePath);
  }

  return path.isAbsolute(relativeOrAbsolutePath)
    ? relativeOrAbsolutePath
    : path.join(process.cwd(), relativeOrAbsolutePath);
}

export function importTeamsFromExcel(params?: { filePath?: string; sheetName?: string }): {
  teams: TeamInput[];
  workbookPath: string;
  sheetName: string;
};

export async function importTeamsFromExcel(params?: {
  filePath?: string;
  sheetName?: string;
}): Promise<{
  teams: TeamInput[];
  workbookPath: string;
  sheetName: string;
}> {
  const workbookPath = resolveExcelPath(params?.filePath);
  const workbookBuffer = await fs.readFile(workbookPath);
  const workbook = XLSX.read(workbookBuffer, { type: "buffer" });
  return importTeamsFromWorkbook(workbook, workbookPath, params?.sheetName);
}

export function importTeamsFromExcelBuffer(
  buffer: Buffer,
  params?: { sourceName?: string; sheetName?: string },
): {
  teams: TeamInput[];
  workbookPath: string;
  sheetName: string;
} {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  return importTeamsFromWorkbook(workbook, params?.sourceName ?? "uploaded workbook", params?.sheetName);
}

function importTeamsFromWorkbook(
  workbook: XLSX.WorkBook,
  workbookPath: string,
  sheetName?: string,
): {
  teams: TeamInput[];
  workbookPath: string;
  sheetName: string;
} {
  const existingSheetNames = workbook.SheetNames.filter((name) => Boolean(workbook.Sheets[name]));
  if (existingSheetNames.length === 0) {
    throw new Error("Workbook has no sheets");
  }

  const targetSheetName = sheetName
    ? sheetName
    : workbook.Sheets.Sheet1
      ? "Sheet1"
      : existingSheetNames[0] ?? Object.keys(workbook.Sheets)[0];
  const worksheet = targetSheetName ? workbook.Sheets[targetSheetName] : undefined;
  if (!worksheet) {
    throw new Error(
      `Sheet '${targetSheetName}' was not found in workbook. Available sheets: ${existingSheetNames.join(
        ", ",
      )}`,
    );
  }

  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
    defval: "",
  });

  const teams = rowsToTeamInputs(rows);

  return {
    teams,
    workbookPath,
    sheetName: targetSheetName,
  };
}
