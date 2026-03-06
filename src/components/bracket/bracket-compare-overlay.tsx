"use client";

import { CompareView } from "@/components/compare/compare-view";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Team } from "@/lib/schema/team";

type BracketCompareOverlayProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teams: Team[];
  teamAId?: string;
  teamBId?: string;
  title: string;
};

export function BracketCompareOverlay({
  open,
  onOpenChange,
  teams,
  teamAId,
  teamBId,
  title,
}: BracketCompareOverlayProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="h-[92vh] w-[95vw] max-w-[1200px] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>Compare the active matchup, then close to return to the bracket.</DialogDescription>
        </DialogHeader>
        <CompareView teams={teams} initialTeamAId={teamAId} initialTeamBId={teamBId} />
      </DialogContent>
    </Dialog>
  );
}
