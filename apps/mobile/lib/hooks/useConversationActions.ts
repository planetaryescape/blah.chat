import { useAuth } from "@clerk/clerk-expo";
import { useMutation as useTanstackMutation } from "@tanstack/react-query";
import { useMutation as useConvexMutation } from "convex/react";
import { queryClient } from "@/lib/cache/queryClient";
import type { Id } from "@/lib/convex";
import { api } from "@/lib/convex";
import { createMobileSdkClient } from "@/lib/transport/httpClient";
import { shouldUseConvexTransport } from "@/lib/transport/mode";

const DEFAULT_APP_URL = "https://blah.chat";

function resolveAppUrl(): string {
  const raw = process.env.EXPO_PUBLIC_APP_URL || DEFAULT_APP_URL;
  return raw.endsWith("/") ? raw.slice(0, -1) : raw;
}

function invalidateConversationQueries(conversationId?: string) {
  queryClient.invalidateQueries({ queryKey: ["mobile", "conversations"] });

  if (!conversationId) return;

  queryClient.invalidateQueries({
    queryKey: ["mobile", "conversation", conversationId],
  });
  queryClient.invalidateQueries({
    queryKey: ["mobile", "messages", conversationId],
  });
}

async function authedRequest(
  path: string,
  getToken: () => Promise<string | null>,
  init: RequestInit,
) {
  const token = await getToken();
  if (!token) {
    throw new Error("Missing bearer token");
  }

  const response = await fetch(`${resolveAppUrl()}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(init.headers ?? {}),
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Request failed with status ${response.status}`);
  }
}

export function useToggleConversationPin() {
  const useConvexMode = shouldUseConvexTransport();
  const convexMutation = useConvexMutation(api.conversations.togglePin);
  const { getToken } = useAuth();

  const httpMutation = useTanstackMutation({
    mutationFn: async (args: { conversationId: Id<"conversations"> }) => {
      await authedRequest(
        `/api/v1/conversations/${args.conversationId}/pin`,
        getToken,
        {
          method: "POST",
        },
      );
    },
    onSuccess: (_data, variables) => {
      invalidateConversationQueries(variables.conversationId);
    },
  });

  if (useConvexMode) return convexMutation;

  return async (args: { conversationId: Id<"conversations"> }) => {
    return httpMutation.mutateAsync(args);
  };
}

export function useToggleConversationStar() {
  const useConvexMode = shouldUseConvexTransport();
  const convexMutation = useConvexMutation(api.conversations.toggleStar);
  const { getToken } = useAuth();

  const httpMutation = useTanstackMutation({
    mutationFn: async (args: { conversationId: Id<"conversations"> }) => {
      await authedRequest(
        `/api/v1/conversations/${args.conversationId}/star`,
        getToken,
        {
          method: "POST",
        },
      );
    },
    onSuccess: (_data, variables) => {
      invalidateConversationQueries(variables.conversationId);
    },
  });

  if (useConvexMode) return convexMutation;

  return async (args: { conversationId: Id<"conversations"> }) => {
    return httpMutation.mutateAsync(args);
  };
}

export function useArchiveConversation() {
  const useConvexMode = shouldUseConvexTransport();
  const convexMutation = useConvexMutation(api.conversations.archive);
  const { getToken } = useAuth();

  const httpMutation = useTanstackMutation({
    mutationFn: async (args: { conversationId: Id<"conversations"> }) => {
      await authedRequest(
        `/api/v1/conversations/${args.conversationId}/archive`,
        getToken,
        {
          method: "POST",
        },
      );
    },
    onSuccess: (_data, variables) => {
      invalidateConversationQueries(variables.conversationId);
    },
  });

  if (useConvexMode) return convexMutation;

  return async (args: { conversationId: Id<"conversations"> }) => {
    return httpMutation.mutateAsync(args);
  };
}

export function useDeleteConversation() {
  const useConvexMode = shouldUseConvexTransport();
  const convexMutation = useConvexMutation(
    api.conversations.deleteConversation,
  );
  const { getToken } = useAuth();

  const httpMutation = useTanstackMutation({
    mutationFn: async (args: { conversationId: Id<"conversations"> }) => {
      await authedRequest(
        `/api/v1/conversations/${args.conversationId}`,
        getToken,
        {
          method: "DELETE",
        },
      );
    },
    onSuccess: (_data, variables) => {
      invalidateConversationQueries(variables.conversationId);
    },
  });

  if (useConvexMode) return convexMutation;

  return async (args: { conversationId: Id<"conversations"> }) => {
    return httpMutation.mutateAsync(args);
  };
}

export function useRenameConversation() {
  const useConvexMode = shouldUseConvexTransport();
  const convexMutation = useConvexMutation(api.conversations.rename);
  const { getToken } = useAuth();

  const httpMutation = useTanstackMutation({
    mutationFn: async (args: {
      conversationId: Id<"conversations">;
      title: string;
    }) => {
      const client = createMobileSdkClient(() => getToken());
      await client.updateConversation(args.conversationId, {
        title: args.title,
      });
    },
    onSuccess: (_data, variables) => {
      invalidateConversationQueries(variables.conversationId);
    },
  });

  if (useConvexMode) return convexMutation;

  return async (args: {
    conversationId: Id<"conversations">;
    title: string;
  }) => {
    return httpMutation.mutateAsync(args);
  };
}
