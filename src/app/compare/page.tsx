import { CompareView } from "@/components/compare/compare-view";
import { loadBracketState } from "@/lib/data/bracket-repo";
import { teamRepo } from "@/lib/data/team-repo";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type ComparePageProps = {
  searchParams?: Promise<{
    teamA?: string;
    teamB?: string;
  }>;
};

export default async function ComparePage({ searchParams }: ComparePageProps) {
  const [teams, bracketState] = await Promise.all([teamRepo.listTeams(), loadBracketState()]);
  const params = (await searchParams) ?? {};

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold">Compare Teams</h2>
        <p className="text-sm text-muted-foreground">
          Side-by-side team sheet comparison for live matchup decisions.
        </p>
      </div>

      <CompareView
        teams={teams}
        initialTeamAId={params.teamA}
        initialTeamBId={params.teamB}
        bracketState={bracketState}
      />
    </div>
  );
}
