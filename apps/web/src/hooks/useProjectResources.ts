import { useQuery } from "@tanstack/react-query";
import type { KnowledgeSource } from "@/components/knowledge/types";
import { useKnowledgeSources } from "./useKnowledgeSources";

type ProjectConversation = {
  _id: string;
  title?: string;
  createdAt: number;
  updatedAt?: number;
};

async function readEnvelope<T>(response: Response): Promise<T> {
  const payload = (await response.json()) as {
    data?: T;
    error?: string;
  };

  if (!response.ok || payload.data === undefined) {
    throw new Error(payload.error || "Request failed");
  }

  return payload.data;
}

export function useProjectConversations(projectId: string | null) {
  return useQuery<ProjectConversation[]>({
    queryKey: ["project-conversations", projectId],
    queryFn: async () => {
      const response = await fetch(
        `/api/v1/conversations?projectId=${encodeURIComponent(projectId ?? "")}`,
      );
      const data = await readEnvelope<{
        items: Array<{
          status: string;
          data: ProjectConversation;
        }>;
      }>(response);
      return data.items.map((item) => item.data);
    },
    enabled: Boolean(projectId),
    staleTime: 10_000,
  });
}

export function useProjectResources(projectId: string | null) {
  const conversations = useProjectConversations(projectId);
  const knowledgeSources = useKnowledgeSources(projectId);

  const files = (knowledgeSources.data ?? []).filter(
    (source): source is KnowledgeSource => source.type === "file",
  );

  return {
    conversations: conversations.data ?? [],
    files,
    isLoading: conversations.isLoading || knowledgeSources.isLoading,
    error: conversations.error ?? knowledgeSources.error ?? null,
  };
}
