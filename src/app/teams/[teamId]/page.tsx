import Link from "next/link";
import { notFound } from "next/navigation";
import { TeamSheetEditor } from "@/components/teams/team-sheet-editor";
import { Button } from "@/components/ui/button";
import { teamRepo } from "@/lib/data/team-repo";

type TeamPageProps = {
  params: Promise<{
    teamId: string;
  }>;
};

export default async function TeamPage({ params }: TeamPageProps) {
  const { teamId } = await params;
  const [team, notes, allTeams] = await Promise.all([
    teamRepo.getTeam(teamId),
    teamRepo.listNotes(teamId),
    teamRepo.listTeams(),
  ]);

  if (!team) {
    notFound();
  }

  const otherTeam = allTeams.find((candidate) => candidate.id !== team.id);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">{team.name} Team Sheet</h1>

        {otherTeam ? (
          <Button asChild variant="outline">
            <Link href={`/compare?teamA=${team.id}&teamB=${otherTeam.id}`}>Compare Matchup</Link>
          </Button>
        ) : null}
      </div>

      <TeamSheetEditor team={team} notes={notes} allTeams={allTeams} />
    </div>
  );
}
