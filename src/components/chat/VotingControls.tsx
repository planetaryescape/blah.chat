"use client";

import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";

interface VotingControlsProps {
  onVote: () => void;
  isVoted?: boolean;
  label: string;
}

export function VotingControls({
  onVote,
  isVoted,
  label,
}: VotingControlsProps) {
  return (
    <div className="flex gap-2">
      <Button
        size="sm"
        variant={isVoted ? "default" : "outline"}
        onClick={onVote}
        className="flex-1"
      >
        {isVoted && <Check className="w-3 h-3 mr-1" />}
        {label}
      </Button>
    </div>
  );
}
