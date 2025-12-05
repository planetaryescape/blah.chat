"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Doc } from "@/convex/_generated/dataModel";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { useSyncedScroll } from "@/hooks/useSyncedScroll";
import { cn } from "@/lib/utils";
import { Sparkles, X } from "lucide-react";
import { useMemo, useState } from "react";
import { ComparisonPanel } from "./ComparisonPanel";
import { ConsolidateDialog } from "./ConsolidateDialog";

interface ComparisonViewProps {
	messages: Doc<"messages">[];
	comparisonGroupId: string;
	showModelNames: boolean;
	onVote: (winnerId: string, rating: string) => void;
	onConsolidate: (model: string) => void;
	onExit?: () => void;
}

export function ComparisonView({
	messages,
	comparisonGroupId,
	showModelNames,
	onVote,
	onConsolidate,
	onExit,
}: ComparisonViewProps) {
	const [syncEnabled, setSyncEnabled] = useState(true);
	const [showConsolidateDialog, setShowConsolidateDialog] = useState(false);
	const [currentVote, setCurrentVote] = useState<string | undefined>();

	const { register } = useSyncedScroll(syncEnabled);
	const isMobile = useMediaQuery("(max-width: 1024px)");

	// Sort messages by creation time
	const sortedMessages = useMemo(() => {
		return [...messages].sort((a, b) => a.createdAt - b.createdAt);
	}, [messages]);

	// Calculate aggregate stats
	const totalCost = useMemo(() => {
		return messages.reduce((sum, m) => sum + (m.cost || 0), 0);
	}, [messages]);

	const totalInputTokens = useMemo(() => {
		return messages.reduce((sum, m) => sum + (m.inputTokens || 0), 0);
	}, [messages]);

	const totalOutputTokens = useMemo(() => {
		return messages.reduce((sum, m) => sum + (m.outputTokens || 0), 0);
	}, [messages]);

	const allComplete = messages.every((m) => m.status === "complete");

	const handleVote = (winnerId: string, rating: string) => {
		setCurrentVote(rating);
		onVote(winnerId, rating);
	};

	const handleConsolidate = (model: string) => {
		setShowConsolidateDialog(false);
		onConsolidate(model);
	};

	// Mobile: Tabs
	if (isMobile) {
		return (
			<div className="flex flex-col h-full">
				<div className="flex items-center justify-between p-3 border-b">
					<h3 className="font-medium">Comparing {messages.length} models</h3>
					{onExit && (
						<Button size="icon" variant="ghost" onClick={onExit}>
							<X className="w-4 h-4" />
						</Button>
					)}
				</div>

				<Tabs defaultValue={sortedMessages[0]._id} className="flex-1">
					<TabsList className="w-full sticky top-0 z-10">
						{sortedMessages.map((msg, idx) => (
							<TabsTrigger key={msg._id} value={msg._id}>
								{showModelNames
									? msg.model?.split(":")[1] || msg.model
									: `Model ${idx + 1}`}
							</TabsTrigger>
						))}
					</TabsList>

					{sortedMessages.map((msg, idx) => (
						<TabsContent key={msg._id} value={msg._id} className="flex-1">
							<ComparisonPanel
								message={msg}
								index={idx}
								showModelName={showModelNames}
								onVote={(rating) => handleVote(msg._id, rating)}
								currentVote={currentVote}
							/>
						</TabsContent>
					))}
				</Tabs>

				{/* Footer */}
				<div className="p-3 border-t space-y-2">
					<div className="flex justify-between text-sm">
						<span className="font-medium">Total Cost</span>
						<span className="font-mono">${totalCost.toFixed(4)}</span>
					</div>
					{allComplete && (
						<Button
							onClick={() => setShowConsolidateDialog(true)}
							className="w-full"
							variant="secondary"
						>
							<Sparkles className="w-4 h-4 mr-2" />
							Consolidate Responses
						</Button>
					)}
				</div>

				<ConsolidateDialog
					open={showConsolidateDialog}
					comparisonGroupId={comparisonGroupId}
					messages={sortedMessages}
					onConfirm={handleConsolidate}
					onClose={() => setShowConsolidateDialog(false)}
				/>
			</div>
		);
	}

	// Desktop: Side-by-side grid
	return (
		<div className="flex flex-col h-full">
			{/* Header */}
			<div className="flex items-center justify-between p-3 border-b">
				<div className="flex items-center gap-3">
					<h3 className="font-medium">Comparing {messages.length} models</h3>
					<Badge variant="outline">
						{syncEnabled ? "Sync On" : "Sync Off"}
					</Badge>
				</div>
				<div className="flex items-center gap-2">
					<Button
						size="sm"
						variant="ghost"
						onClick={() => setSyncEnabled(!syncEnabled)}
					>
						Toggle Sync
					</Button>
					{onExit && (
						<Button size="icon" variant="ghost" onClick={onExit}>
							<X className="w-4 h-4" />
						</Button>
					)}
				</div>
			</div>

			{/* Grid */}
			<div
				className={cn(
					"flex-1 grid gap-4 p-4 overflow-hidden",
					messages.length === 2 && "grid-cols-2",
					messages.length === 3 && "grid-cols-3",
					messages.length === 4 && "grid-cols-2 lg:grid-cols-4",
				)}
			>
				{sortedMessages.map((msg, idx) => (
					<ComparisonPanel
						key={msg._id}
						ref={register}
						message={msg}
						index={idx}
						showModelName={showModelNames}
						onVote={(rating) => handleVote(msg._id, rating)}
						currentVote={currentVote}
					/>
				))}
			</div>

			{/* Footer */}
			<div className="flex items-center justify-between p-3 border-t">
				<div className="space-y-1">
					<div className="flex items-center gap-4">
						<span className="text-sm font-medium">Total Cost:</span>
						<span className="font-mono text-lg">${totalCost.toFixed(4)}</span>
					</div>
					<div className="text-xs text-muted-foreground">
						{totalInputTokens.toLocaleString()} input +{" "}
						{totalOutputTokens.toLocaleString()} output tokens
					</div>
				</div>

				{allComplete && (
					<Button
						onClick={() => setShowConsolidateDialog(true)}
						variant="secondary"
					>
						<Sparkles className="w-4 h-4 mr-2" />
						Consolidate Responses
					</Button>
				)}
			</div>

			<ConsolidateDialog
				open={showConsolidateDialog}
				comparisonGroupId={comparisonGroupId}
				messages={sortedMessages}
				onConfirm={handleConsolidate}
				onClose={() => setShowConsolidateDialog(false)}
			/>
		</div>
	);
}
