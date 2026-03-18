"use client";

import { CompareView } from "@/components/compare/compare-view";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { BracketState } from "@/lib/schema/bracket";
import type { Team } from "@/lib/schema/team";

type BracketCompareOverlayProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teams: Team[];
  teamAId?: string;
  teamBId?: string;
  bracketGameId?: string;
  season?: number;
  bracketState?: BracketState;
  title: string;
};

export function BracketCompareOverlay({
  open,
  onOpenChange,
  teams,
  teamAId,
  teamBId,
  bracketGameId,
  season,
  bracketState,
  title,
}: BracketCompareOverlayProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="h-[94vh] w-[96vw] max-w-[96vw] overflow-y-auto p-4 sm:max-w-[96vw] sm:p-6">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>Compare the active matchup, then close to return to the bracket.</DialogDescription>
        </DialogHeader>
        <CompareView
          teams={teams}
          initialTeamAId={teamAId}
          initialTeamBId={teamBId}
          bracketGameId={bracketGameId}
          season={season}
          bracketState={bracketState}
        />
      </DialogContent>
    </Dialog>
  );
}
