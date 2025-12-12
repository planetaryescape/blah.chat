import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useApiClient } from "@/lib/api/client";
import { queryKeys } from "@/lib/query/keys";
import type { Id } from "@/convex/_generated/dataModel";

interface TogglePinArgs {
	conversationId: Id<"conversations">;
}

export function useTogglePin() {
	const api = useApiClient();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({ conversationId }: TogglePinArgs) => {
			return api.patch(`/api/v1/conversations/${conversationId}/pin`);
		},

		onMutate: async ({ conversationId }) => {
			// Cancel in-flight queries
			await queryClient.cancelQueries({
				queryKey: queryKeys.conversations.lists(),
			});

			// Snapshot previous state
			const previous = queryClient.getQueryData(
				queryKeys.conversations.lists(),
			);

			// Optimistically update (toggle pinned field)
			queryClient.setQueriesData(
				{ queryKey: queryKeys.conversations.lists() },
				(old: any) => {
					if (!old) return old;
					return old.map((c: any) =>
						c._id === conversationId ? { ...c, pinned: !c.pinned } : c,
					);
				},
			);

			return { previous };
		},

		onError: (error, variables, context: any) => {
			// Rollback on error
			if (context?.previous) {
				queryClient.setQueryData(
					queryKeys.conversations.lists(),
					context.previous,
				);
			}
			toast.error("Failed to toggle pin");
		},

		onSettled: () => {
			// Refetch to ensure server sync
			queryClient.invalidateQueries({
				queryKey: queryKeys.conversations.lists(),
			});
		},
	});
}
