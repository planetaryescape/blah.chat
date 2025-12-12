import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useApiClient } from "@/lib/api/client";
import { analytics } from "@/lib/analytics";
import { queryKeys } from "@/lib/query/keys";
import type { Id } from "@/convex/_generated/dataModel";

interface SendMessageArgs {
	conversationId: Id<"conversations">;
	content: string;
	modelId?: string;
	models?: string[];
	thinkingEffort?: "low" | "medium" | "high";
	attachments?: Array<{
		type: "file" | "image" | "audio";
		name: string;
		storageId: string;
		mimeType: string;
		size: number;
	}>;
}

export function useSendMessage() {
	const api = useApiClient();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (args: SendMessageArgs) => {
			return api.post(
				`/api/v1/conversations/${args.conversationId}/messages`,
				args,
			);
		},

		onSuccess: (data, variables) => {
			// Invalidate messages (triggers Convex re-fetch)
			queryClient.invalidateQueries({
				queryKey: queryKeys.messages.list(variables.conversationId),
			});

			// Track analytics
			analytics.track("message_sent", {
				model: variables.models
					? variables.models.join(",")
					: variables.modelId ?? "unknown",
				hasAttachments: !!variables.attachments?.length,
			});
		},

		onError: (error) => {
			const msg =
				error instanceof Error ? error.message : "Failed to send message";
			toast.error(msg);
		},
	});
}
