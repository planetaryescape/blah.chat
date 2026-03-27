import { useAuth } from "@clerk/clerk-expo";
import { useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/cache/queryClient";
import type { Id } from "@/lib/convex";
import { createMobileSdkClient } from "@/lib/transport/httpClient";

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

const DEFAULT_APP_URL = "https://blah.chat";

function resolveAppUrl() {
  const raw = process.env.EXPO_PUBLIC_APP_URL || DEFAULT_APP_URL;
  return raw.endsWith("/") ? raw.slice(0, -1) : raw;
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
    throw new Error(`Request failed with status ${response.status}`);
  }
}

export function useToggleConversationPin() {
  const { getToken } = useAuth();

  const mutation = useMutation({
    mutationFn: async (args: { conversationId: Id<"conversations"> }) => {
      await authedRequest(
        `/api/v1/conversations/${args.conversationId}/pin`,
        getToken,
        { method: "POST" },
      );
    },
    onSuccess: (_data, variables) => {
      invalidateConversationQueries(variables.conversationId);
    },
  });

  return async (args: { conversationId: Id<"conversations"> }) =>
    mutation.mutateAsync(args);
}

export function useToggleConversationStar() {
  const { getToken } = useAuth();

  const mutation = useMutation({
    mutationFn: async (args: { conversationId: Id<"conversations"> }) => {
      await authedRequest(
        `/api/v1/conversations/${args.conversationId}/star`,
        getToken,
        { method: "POST" },
      );
    },
    onSuccess: (_data, variables) => {
      invalidateConversationQueries(variables.conversationId);
    },
  });

  return async (args: { conversationId: Id<"conversations"> }) =>
    mutation.mutateAsync(args);
}

export function useArchiveConversation() {
  const { getToken } = useAuth();

  const mutation = useMutation({
    mutationFn: async (args: { conversationId: Id<"conversations"> }) => {
      const client = createMobileSdkClient(() => getToken());
      await client.archiveConversation(args.conversationId);
    },
    onSuccess: (_data, variables) => {
      invalidateConversationQueries(variables.conversationId);
    },
  });

  return async (args: { conversationId: Id<"conversations"> }) =>
    mutation.mutateAsync(args);
}

export function useDeleteConversation() {
  const { getToken } = useAuth();

  const mutation = useMutation({
    mutationFn: async (args: { conversationId: Id<"conversations"> }) => {
      const client = createMobileSdkClient(() => getToken());
      await client.deleteConversation(args.conversationId);
    },
    onSuccess: (_data, variables) => {
      invalidateConversationQueries(variables.conversationId);
    },
  });

  return async (args: { conversationId: Id<"conversations"> }) =>
    mutation.mutateAsync(args);
}

export function useRenameConversation() {
  const { getToken } = useAuth();

  const mutation = useMutation({
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

  return async (args: { conversationId: Id<"conversations">; title: string }) =>
    mutation.mutateAsync(args);
}
