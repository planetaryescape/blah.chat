import { embed, generateObject } from "ai";
import { z } from "zod";
import { getGatewayOptions } from "@/lib/ai/gateway";
import {
  EMBEDDING_MODEL,
  MEMORY_PROCESSING_MODEL,
} from "@/lib/ai/operational-models";
import { getModel } from "@/lib/ai/registry";
import { internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import { action } from "../_generated/server";

const rephrasedMemorySchema = z.object({
  content: z.string(),
});

const consolidatedMemoriesSchema = z.object({
  memories: z.array(
    z.object({
      content: z.string(),
      category: z.enum([
        "identity",
        "preference",
        "project",
        "context",
        "relationship",
      ]),
      importance: z.number().min(1).max(10),
      sourceIds: z.array(z.string()),
      operation: z.enum(["merge", "dedupe", "keep"]),
      reasoning: z.string().min(10).max(1000),
    }),
  ),
});

export const migrateUserMemories = action({
  handler: async (
    ctx,
  ): Promise<{ migrated: number; skipped: number; total: number }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const user = await (
      ctx.runQuery as (ref: any, args: any) => Promise<Doc<"users"> | null>
    )(internal.lib.helpers.getCurrentUser, {});
    if (!user) throw new Error("User not found");

    const memories = await (
      ctx.runQuery as (ref: any, args: any) => Promise<Doc<"memories">[]>
    )(internal.lib.helpers.listAllMemories, { userId: user._id });

    if (memories.length === 0) {
      return { migrated: 0, skipped: 0, total: 0 };
    }

    let migrated = 0;
    let skipped = 0;

    for (const memory of memories) {
      try {
        const result = await generateObject({
          model: getModel(MEMORY_PROCESSING_MODEL.id),
          schema: rephrasedMemorySchema,
          providerOptions: getGatewayOptions(
            MEMORY_PROCESSING_MODEL.id,
            undefined,
            ["memory-rephrase"],
          ),
          prompt: `Rephrase this memory to third-person perspective for AI context injection.

Original memory: "${memory.content}"

REPHRASING RULES:
- Convert first-person to third-person: "I am X" → "User is X"
- Possessives: "My wife is Jane" → "User's wife is named Jane"
- "I prefer X" → "User prefers X"
- "We're building X" → "User is building X"

Preserve specifics exactly:
- Technical terms: "Next.js 15", "gpt-oss-20b", "React 19"
- Version numbers: "TypeScript 5.3"
- Project names: "blah.chat"
- Code snippets: \`const\` vs \`let\`

For quotes, attribute to user:
- "I say 'X'" → "User's motto: 'X'"

Resolve pronouns intelligently:
- "My colleague John" → "User's colleague John"
- If ambiguous, preserve user's phrasing in quotes

Let context guide rephrasing - prioritize clarity for AI consumption.

Return ONLY the rephrased content, no explanation or additional text.`,
        });

        const embeddingResult = await embed({
          model: EMBEDDING_MODEL,
          value: result.object.content,
        });

        await ctx.runMutation(internal.memories.updateWithEmbedding, {
          id: memory._id,
          content: result.object.content,
          embedding: embeddingResult.embedding,
        });

        migrated++;
      } catch (error) {
        console.error(`Failed to migrate memory ${memory._id}:`, error);
        skipped++;
      }
    }

    return { migrated, skipped, total: memories.length };
  },
});

export const consolidateUserMemories = action({
  handler: async (
    ctx,
  ): Promise<{
    original: number;
    consolidated: number;
    deleted: number;
    created: number;
  }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const user: Doc<"users"> | null = await ctx.runQuery(
      internal.lib.helpers.getCurrentUser,
      {},
    );
    if (!user) throw new Error("User not found");

    const memories: Doc<"memories">[] = await ctx.runQuery(
      internal.lib.helpers.listAllMemories,
      { userId: user._id },
    );

    if (memories.length === 0) {
      return { original: 0, consolidated: 0, deleted: 0, created: 0 };
    }

    const originalCount = memories.length;
    let deletedCount = 0;
    let createdCount = 0;

    const processedIds = new Set<string>();
    const clustersToProcess: Doc<"memories">[][] = [];

    // Group memories by similarity using vector search
    for (const memory of memories) {
      if (processedIds.has(memory._id)) continue;

      const similarMemories = await ctx.runAction(
        internal.memories.searchByEmbedding,
        {
          userId: memory.userId,
          embedding: memory.embedding,
          limit: 20,
        },
      );

      const cluster: Doc<"memories">[] = [memory];
      processedIds.add(memory._id);

      for (const similar of similarMemories) {
        if (similar._id === memory._id) continue;
        if (processedIds.has(similar._id)) continue;

        if (similar._score >= 0.85) {
          cluster.push(similar);
          processedIds.add(similar._id);
        }
      }

      clustersToProcess.push(cluster);
    }

    console.log(
      `Found ${clustersToProcess.length} memories/clusters to process (${processedIds.size} total)`,
    );

    for (const cluster of clustersToProcess) {
      try {
        const isSingleMemory = cluster.length === 1;

        const result = await generateObject({
          model: getModel(MEMORY_PROCESSING_MODEL.id),
          schema: consolidatedMemoriesSchema,
          providerOptions: getGatewayOptions(
            MEMORY_PROCESSING_MODEL.id,
            undefined,
            ["memory-consolidation"],
          ),
          prompt: isSingleMemory
            ? `Rephrase this memory to third-person perspective for AI context injection.

Memory:
- ${cluster[0].content} (ID: ${cluster[0]._id})

REPHRASING RULES:
- Convert first-person to third-person: "I am X" → "User is X"
- Possessives: "My wife is Jane" → "User's wife is named Jane"
- "I prefer X" → "User prefers X"
- "We're building X" → "User is building X"

Preserve specifics exactly:
- Technical terms: "Next.js 1", "gpt-oss-20b", "React 19"
- Version numbers: "TypeScript 5.3"
- Project names: "blah.chat"
- Code snippets: \`const\` vs \`let\`

For quotes, attribute to user:
- "I say 'X'" → "User's motto: 'X'"

Resolve pronouns intelligently:
- "My colleague John" → "User's colleague John"
- If ambiguous, preserve user's phrasing in quotes

${
  cluster[0].metadata?.reasoning
    ? `Original reasoning (preserve exactly): "${cluster[0].metadata.reasoning}"`
    : `This memory has no existing reasoning. Generate a clear, specific 1-2 sentence explanation of why this fact matters for future interactions with the user. Focus on practical value - how will knowing this help you assist the user better?`
}

Return ONE memory with:
- content: rephrased text in third-person
- category: ${cluster[0].metadata?.category || "context"}
- importance: ${cluster[0].metadata?.importance || 7}
- sourceIds: ["${cluster[0]._id}"]
- operation: "keep"
- reasoning: ${cluster[0].metadata?.reasoning ? "the preserved original reasoning from above" : "your newly generated reasoning explaining why this fact is valuable"}`
            : `Consolidate these related memories into atomic, self-contained units.

Memories:
${cluster.map((m) => `- ${m.content} (ID: ${m._id})`).join("\n")}

Rules:
1. Each output memory = ONE thought/idea/fact
2. Remove exact duplicates (keep most complete)
3. Merge similar memories into unified statement
4. Preserve all unique information
5. Third-person format ("User is X", "User's Y")
6. Include context for clarity

Return array of atomic memories with:
- content: consolidated text
- category: identity|preference|project|context|relationship
- importance: 1-10
- sourceIds: [original memory IDs merged] (use IDs from above)
- operation: "merge"|"dedupe"|"keep"
- reasoning: For each consolidated memory, provide reasoning. If source memories have reasoning, combine them (e.g., "Combines: reason1; reason2"). If source memories lack reasoning, generate clear 1-2 sentence explanation of why this consolidated fact is valuable for future interactions.

IMPORTANT: sourceIds must contain the actual memory IDs shown above.

Source memories with reasoning status:
${cluster
  .map((m) => {
    if (m.metadata?.reasoning) {
      return `- [${m._id}]: HAS reasoning: "${m.metadata.reasoning}"`;
    }
    return `- [${m._id}]: NO reasoning - Content: "${m.content}" (generate reasoning explaining why this matters)`;
  })
  .join("\n")}`,
        });

        // Delete original memories in cluster
        for (const memory of cluster) {
          await ctx.runMutation(internal.memories.deleteInternal, {
            id: memory._id,
          });
          deletedCount++;
        }

        // Create consolidated memories
        for (const consolidated of result.object.memories) {
          const embeddingResult = await embed({
            model: EMBEDDING_MODEL,
            value: consolidated.content,
          });

          const expiresAt = cluster.reduce(
            (longest: number | undefined, m) => {
              if (!m.metadata?.expiresAt) return undefined;
              if (!longest) return m.metadata.expiresAt;
              return Math.max(longest, m.metadata.expiresAt);
            },
            undefined as number | undefined,
          );

          const allSourceMessageIds = cluster.reduce((acc, mem) => {
            if (mem.sourceMessageId) acc.push(mem.sourceMessageId);
            if (mem.sourceMessageIds) acc.push(...mem.sourceMessageIds);
            return acc;
          }, [] as Id<"messages">[]);

          const uniqueIds = [...new Set(allSourceMessageIds)];

          await ctx.runMutation(internal.memories.create, {
            userId: cluster[0].userId,
            content: consolidated.content,
            embedding: embeddingResult.embedding,
            sourceMessageIds: uniqueIds.length > 0 ? uniqueIds : undefined,
            metadata: {
              category: consolidated.category,
              importance: consolidated.importance,
              reasoning: consolidated.reasoning,
              confidence: 0.95,
              verifiedBy: "consolidated",
              version: 1,
              expiresAt,
              extractedAt: Date.now(),
              sourceConversationId: cluster[0].conversationId,
            },
          });

          createdCount++;
        }
      } catch (error) {
        console.error(`Failed to consolidate cluster:`, error);
      }
    }

    const consolidatedCount = originalCount - deletedCount + createdCount;

    console.log(
      `Consolidation complete: ${originalCount} → ${consolidatedCount} memories (${deletedCount} deleted, ${createdCount} created)`,
    );

    return {
      original: originalCount,
      consolidated: consolidatedCount,
      deleted: deletedCount,
      created: createdCount,
    };
  },
});
