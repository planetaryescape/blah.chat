import type { Doc } from "../../_generated/dataModel";

type MemoryCategory =
  | "identity"
  | "preference"
  | "project"
  | "context"
  | "relationship";

export function formatMemoriesByCategory(
  memories: Array<Doc<"memories">>,
): string {
  const categorized: Record<MemoryCategory, string[]> = {
    relationship: [],
    preference: [],
    identity: [],
    project: [],
    context: [],
  };

  for (const mem of memories) {
    const cat = (mem.metadata?.category as MemoryCategory) || "context";
    categorized[cat].push(mem.content);
  }

  const sections: string[] = [];

  if (categorized.relationship.length) {
    sections.push(
      `### Relationships\n${categorized.relationship.map((m) => `- ${m}`).join("\n")}`,
    );
  }
  if (categorized.preference.length) {
    sections.push(
      `### Preferences\n${categorized.preference.map((m) => `- ${m}`).join("\n")}`,
    );
  }
  if (categorized.identity.length) {
    sections.push(
      `### Identity\n${categorized.identity.map((m) => `- ${m}`).join("\n")}`,
    );
  }
  if (categorized.project.length) {
    sections.push(
      `### Projects\n${categorized.project.map((m) => `- ${m}`).join("\n")}`,
    );
  }
  if (categorized.context.length) {
    sections.push(
      `### Context\n${categorized.context.map((m) => `- ${m}`).join("\n")}`,
    );
  }

  if (!sections.length) return "";

  return `## Relevant Memories\n\n${sections.join("\n\n")}`;
}

export function truncateMemories(
  memories: Array<Doc<"memories">>,
  maxTokens: number,
): Array<Doc<"memories">> {
  const priorityOrder: MemoryCategory[] = [
    "relationship",
    "preference",
    "identity",
    "project",
    "context",
  ];

  const categorized = new Map<MemoryCategory, Array<Doc<"memories">>>();
  for (const mem of memories) {
    const cat = (mem.metadata?.category as MemoryCategory) || "context";
    if (!categorized.has(cat)) categorized.set(cat, []);
    categorized.get(cat)?.push(mem);
  }

  const result: Array<Doc<"memories">> = [];
  let estimatedTokens = 0;

  for (const category of priorityOrder) {
    const mems = categorized.get(category) || [];
    for (const mem of mems) {
      const tokens = estimateTokens(mem.content);
      if (estimatedTokens + tokens > maxTokens) break;
      result.push(mem);
      estimatedTokens += tokens;
    }
  }

  return result;
}

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}
