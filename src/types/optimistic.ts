import type { Id } from "@/convex/_generated/dataModel";

/**
 * Optimistic message shown immediately when user sends message
 * Replaced by real server message when confirmed
 */
export interface OptimisticMessage {
	_id: `temp-${string}`;
	conversationId: Id<"conversations">;
	userId?: Id<"users">;
	role: "user" | "assistant";
	content: string;
	status: "optimistic" | "pending" | "generating" | "complete" | "error";
	model?: string;
	attachments?: Array<{
		id: string;
		file?: File;
		preview?: string;
		storageId?: Id<"_storage">;
		uploadStatus?: "pending" | "uploading" | "complete" | "error";
		_optimistic?: boolean;
	}>;
	comparisonGroupId?: string;
	createdAt: number;
	updatedAt: number;
	_creationTime: number; // Convex system field - set to match server messages
	_optimistic: true;
}

/**
 * Failed message with error state + retry capability
 * Shown when send fails - allows inline retry
 */
export interface FailedMessage extends OptimisticMessage {
	_failed: true;
	error: string;
}

/**
 * Queued message for offline mode
 * Persisted in localStorage, sent when online
 */
export interface QueuedMessage {
	id: string;
	conversationId: Id<"conversations">;
	content: string;
	modelId?: string;
	models?: string[];
	attachments?: Array<{
		id: string;
		storageId: Id<"_storage">;
	}>;
	timestamp: number;
	retries: number;
}
