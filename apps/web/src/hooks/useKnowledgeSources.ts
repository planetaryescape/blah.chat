import { useQuery } from "@tanstack/react-query";
import type {
  KnowledgeChunk,
  KnowledgeSource,
  ProjectAttachment,
} from "@/components/knowledge/types";

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

export function useKnowledgeSources(projectId?: string | null) {
  return useQuery<KnowledgeSource[]>({
    queryKey: ["knowledge-sources", projectId ?? null],
    queryFn: async () => {
      const search = new URLSearchParams();
      if (projectId) {
        search.set("projectId", projectId);
      }
      const response = await fetch(
        `/api/v1/knowledge/sources${search.size > 0 ? `?${search}` : ""}`,
      );
      const items =
        await readEnvelope<Array<{ data: KnowledgeSource }>>(response);
      return items.map((item) => item.data);
    },
    staleTime: 10_000,
  });
}

export function useKnowledgeSourceCount(projectId?: string | null) {
  return useQuery<number>({
    queryKey: ["knowledge-sources-count", projectId ?? null],
    queryFn: async () => {
      const search = new URLSearchParams();
      if (projectId) {
        search.set("projectId", projectId);
      }
      const response = await fetch(
        `/api/v1/knowledge/sources/count${search.size > 0 ? `?${search}` : ""}`,
      );
      const data = await readEnvelope<{ count: number }>(response);
      return data.count;
    },
    staleTime: 10_000,
  });
}

export function useKnowledgeSourceDetail(sourceId: string | null) {
  return useQuery<
    KnowledgeSource & {
      chunks?: KnowledgeChunk[];
    }
  >({
    queryKey: ["knowledge-source-detail", sourceId],
    queryFn: async () => {
      const response = await fetch(
        `/api/v1/knowledge/sources/${encodeURIComponent(sourceId ?? "")}`,
      );
      return readEnvelope<
        KnowledgeSource & {
          chunks?: KnowledgeChunk[];
        }
      >(response);
    },
    enabled: Boolean(sourceId),
    staleTime: 5_000,
  });
}

export function useProjectAttachments(projectId: string | null) {
  return useQuery<ProjectAttachment[]>({
    queryKey: ["project-attachments", projectId],
    queryFn: async () => {
      const response = await fetch(
        `/api/v1/projects/${encodeURIComponent(projectId ?? "")}/attachments`,
      );
      const items =
        await readEnvelope<Array<{ data: ProjectAttachment }>>(response);
      return items.map((item) => item.data);
    },
    enabled: Boolean(projectId),
    staleTime: 10_000,
  });
}
