import { BracketView } from "@/components/bracket/bracket-view";
import { loadBracketState } from "@/lib/data/bracket-repo";
import { teamRepo } from "@/lib/data/team-repo";

export default async function BracketPage() {
  const [teams, bracketState] = await Promise.all([teamRepo.listTeams(), loadBracketState()]);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold">Bracket Builder</h2>
        <p className="text-sm text-muted-foreground">
          Boilerplate bracket format for First Four through the national championship.
        </p>
      </div>
      <BracketView teams={teams} initialState={bracketState} />
    </div>
  );
}
