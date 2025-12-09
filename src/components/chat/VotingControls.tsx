"use client";

import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";

interface VotingControlsProps {
  onVote: () => void;
  isVoted?: boolean;
  hasVoted?: boolean;
  label: string;
}

export function VotingControls({
  onVote,
  isVoted,
  hasVoted,
  label,
}: VotingControlsProps) {
  return (
    <div className="flex gap-2">
      {hasVoted ? (
        isVoted ? (
          <div className="flex-1 flex items-center justify-center gap-2 text-sm font-medium text-primary py-2 border rounded-md bg-primary/10 border-primary/20">
            <Check className="w-4 h-4" />
            Voted
          </div>
        ) : null
      ) : (
        <Button
          size="sm"
          variant="outline"
          onClick={onVote}
          className="flex-1 hover:bg-primary hover:text-primary-foreground transition-all duration-200"
        >
          {label}
        </Button>
      )}
    </div>
  );
}
