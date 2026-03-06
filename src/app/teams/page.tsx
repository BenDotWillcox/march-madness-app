import Link from "next/link";
import { ImportTeamsExcel } from "@/components/import/import-teams-csv";
import { TeamsTable } from "@/components/teams/teams-table";
import { Button } from "@/components/ui/button";
import { teamRepo } from "@/lib/data/team-repo";

export default async function TeamsPage() {
  const teams = await teamRepo.listTeams();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold">Teams</h2>
          <p className="text-sm text-muted-foreground">
            Team sheets with predictive + resume metrics and notes.
          </p>
        </div>

        {teams.length > 1 ? (
          <Button asChild>
            <Link href={`/compare?teamA=${teams[0].id}&teamB=${teams[1].id}`}>Quick Compare</Link>
          </Button>
        ) : null}
      </div>

      <ImportTeamsExcel />
      <TeamsTable teams={teams} />
    </div>
  );
}
