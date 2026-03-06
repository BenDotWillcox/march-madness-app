"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function ImportTeamsExcel() {
  const [status, setStatus] = useState<string>("");
  const [loading, setLoading] = useState(false);

  async function syncFromExcel() {
    setLoading(true);
    setStatus("Syncing...");

    try {
      const response = await fetch("/api/import/teams", {
        method: "POST",
      });

      const json = (await response.json()) as {
        imported?: number;
        sourceFile?: string;
        sheetName?: string;
        error?: string;
      };

      if (!response.ok) {
        setStatus(json.error ?? "Import failed");
        return;
      }

      setStatus(
        `Synced ${json.imported ?? 0} teams from ${json.sourceFile ?? "Excel"} (${json.sheetName ?? "sheet"}). Refresh to see updates.`,
      );
    } catch {
      setStatus("Sync failed. Check the Excel file and retry.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border p-4">
      <div>
        <p className="font-medium">Sync Teams from Excel</p>
        <p className="text-sm text-muted-foreground">
          Uses `data/excel_data/NCAA_Statistics.xlsx` as the source of truth and replaces the team dataset.
        </p>
      </div>

      <Button type="button" onClick={syncFromExcel} disabled={loading} className="w-fit">
        {loading ? "Syncing..." : "Sync Excel Data"}
      </Button>

      {status ? <p className="text-sm text-muted-foreground">{status}</p> : null}
    </div>
  );
}

// Backward-compatible export for existing imports.
export const ImportTeamsCsv = ImportTeamsExcel;
