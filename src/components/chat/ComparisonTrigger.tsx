"use client";

import { Button } from "@/components/ui/button";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { ArrowLeftRight } from "lucide-react";
import { useState } from "react";
import { ComparisonModelSelector } from "./ComparisonModelSelector";

interface ComparisonTriggerProps {
	onStartComparison: (models: string[]) => void;
	isActive: boolean;
}

export function ComparisonTrigger({
	onStartComparison,
	isActive,
}: ComparisonTriggerProps) {
	const [open, setOpen] = useState(false);

	const handleConfirm = (models: string[]) => {
		onStartComparison(models);
		setOpen(false);
	};

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<Button
					size="icon"
					variant={isActive ? "default" : "ghost"}
					disabled={isActive}
				>
					<ArrowLeftRight className="w-4 h-4" />
				</Button>
			</PopoverTrigger>
			<PopoverContent className="w-96 p-0">
				<ComparisonModelSelector
					onConfirm={handleConfirm}
					onCancel={() => setOpen(false)}
				/>
			</PopoverContent>
		</Popover>
	);
}
