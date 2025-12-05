"use client";

import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import type { Doc } from "@/convex/_generated/dataModel";
import { MODEL_CONFIG } from "@/lib/ai/models";
import { useMemo, useState } from "react";

interface ConsolidateDialogProps {
	open: boolean;
	comparisonGroupId: string;
	messages: Doc<"messages">[];
	onConfirm: (model: string) => void;
	onClose: () => void;
}

export function ConsolidateDialog({
	open,
	messages,
	onConfirm,
	onClose,
}: ConsolidateDialogProps) {
	const availableModels = Object.values(MODEL_CONFIG).filter(
		(m) => !m.isLocal,
	);
	const [selectedModel, setSelectedModel] = useState<string>(
		availableModels[0]?.id || "",
	);

	// Estimate input tokens (rough calculation)
	const estimatedTokens = useMemo(() => {
		const fullContent = messages.map((m) => m.content).join("\n\n");
		// Rough estimate: ~4 chars per token
		return Math.ceil(fullContent.length / 4);
	}, [messages]);

	const estimatedCost = (estimatedTokens / 1000) * 0.003; // Rough estimate

	const handleConfirm = () => {
		onConfirm(selectedModel);
	};

	return (
		<Dialog open={open} onOpenChange={onClose}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Consolidate Responses</DialogTitle>
					<DialogDescription>
						Create a new conversation where one model synthesizes all{" "}
						{messages.length} responses into a comprehensive answer.
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-4 py-4">
					<div>
						<label className="text-sm font-medium mb-2 block">
							Which model should consolidate?
						</label>
						<Select value={selectedModel} onValueChange={setSelectedModel}>
							<SelectTrigger>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{availableModels.map((model) => (
									<SelectItem key={model.id} value={model.id}>
										{model.name}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					<div className="bg-muted p-3 rounded space-y-1 text-sm">
						<div className="flex justify-between">
							<span>Estimated input tokens:</span>
							<span className="font-mono">{estimatedTokens.toLocaleString()}</span>
						</div>
						<div className="flex justify-between">
							<span>Estimated cost:</span>
							<span className="font-mono">${estimatedCost.toFixed(4)}</span>
						</div>
					</div>
				</div>

				<DialogFooter>
					<Button variant="outline" onClick={onClose}>
						Cancel
					</Button>
					<Button onClick={handleConfirm}>
						Consolidate with{" "}
						{availableModels.find((m) => m.id === selectedModel)?.name}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
