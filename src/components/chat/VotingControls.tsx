"use client";

import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";

interface VotingControlsProps {
	onVote: (rating: string) => void;
	currentVote?: string;
	label: string;
}

export function VotingControls({
	onVote,
	currentVote,
	label,
}: VotingControlsProps) {
	return (
		<div className="flex gap-2">
			<Button
				size="sm"
				variant={currentVote === "this_better" ? "default" : "outline"}
				onClick={() => onVote("this_better")}
				className="flex-1"
			>
				{currentVote === "this_better" && <Check className="w-3 h-3 mr-1" />}
				{label}
			</Button>
		</div>
	);
}
