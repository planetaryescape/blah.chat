/**
 * Tag Matching Module
 *
 * Three-tier semantic deduplication for auto-tagging:
 * 1. Exact slug match (normalize case/whitespace)
 * 2. Fuzzy string match (Levenshtein distance ≤2 for typos)
 * 3. Semantic similarity (embedding cosine ≥0.85 for synonyms)
 */

import { openai } from "@ai-sdk/openai";
import { embed } from "ai";
import {
  calculateEmbeddingCost,
  EMBEDDING_PRICING,
} from "@/lib/ai/operational-models";
import { levenshteinDistance } from "@/lib/utils/stringUtils";
import { normalizeTagSlug } from "@/lib/utils/tagUtils";
import { internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import type { ActionCtx } from "../_generated/server";
import { estimateTokens } from "../tokens/counting";
import { cosineSimilarity } from "./embeddings";

const EMBEDDING_MODEL = openai.embedding("text-embedding-3-small");

// Thresholds
const FUZZY_MAX_DISTANCE = 2; // Max edit distance for fuzzy match
const SEMANTIC_MIN_SIMILARITY = 0.85; // Min cosine similarity for semantic match

export interface MatchResult {
  existingTag: Doc<"tags"> | null;
  matchType: "exact" | "fuzzy" | "semantic" | "none";
  confidence: number; // 0-1
}

/**
 * Find similar tag using three-tier matching
 *
 * @param ctx - Action context
 * @param candidateTag - Tag text to match (e.g., "ML", "machne-learning")
 * @param userId - User ID for scoping
 * @param existingTags - User's existing tags to match against
 * @param embeddingCache - Cache for tag embeddings (avoid re-generation)
 * @returns Match result with existing tag (if found) and match type
 */
export async function findSimilarTag(
  ctx: ActionCtx,
  candidateTag: string,
  userId: Id<"users">,
  existingTags: Doc<"tags">[],
  embeddingCache: Map<string, number[]>,
): Promise<MatchResult> {
  const slug = normalizeTagSlug(candidateTag);

  // ========================================
  // TIER 1: Exact slug match
  // ========================================
  const exactMatch = existingTags.find((t) => t.slug === slug);
  if (exactMatch) {
    return {
      existingTag: exactMatch,
      matchType: "exact",
      confidence: 1.0,
    };
  }

  // ========================================
  // TIER 2: Fuzzy string match (typos)
  // ========================================
  for (const tag of existingTags) {
    const distance = levenshteinDistance(slug, tag.slug);
    if (distance <= FUZZY_MAX_DISTANCE) {
      return {
        existingTag: tag,
        matchType: "fuzzy",
        confidence: 0.9, // High confidence for fuzzy match
      };
    }
  }

  // ========================================
  // TIER 3: Semantic similarity (synonyms)
  // ========================================
  try {
    // Generate embedding for candidate tag
    const tokenCount = estimateTokens(candidateTag);
    const { embedding: candidateEmbed } = await embed({
      model: EMBEDDING_MODEL,
      value: candidateTag,
    });

    // Track embedding cost
    await ctx.scheduler.runAfter(
      0,
      // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
      internal.usage.mutations.recordEmbedding,
      {
        userId,
        model: EMBEDDING_PRICING.model,
        tokenCount,
        cost: calculateEmbeddingCost(tokenCount),
        feature: "notes",
      },
    );

    // Check similarity against all existing tags
    for (const tag of existingTags) {
      // Get or generate tag embedding
      let tagEmbed = embeddingCache.get(tag._id);

      if (!tagEmbed) {
        // Check if tag already has embedding in DB
        if (tag.embedding && tag.embedding.length > 0) {
          tagEmbed = tag.embedding;
        } else {
          // Lazy generation: trigger embedding generation
          (await (ctx.runAction as any)(
            // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
            internal.tags.embeddings.generateTagEmbedding,
            { tagId: tag._id },
          )) as Promise<void>;

          // Fetch updated tag with embedding
          const updatedTag = (await (ctx.runQuery as any)(
            // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
            internal.lib.helpers.getTag,
            { tagId: tag._id },
          )) as Doc<"tags"> | null;

          if (updatedTag?.embedding) {
            tagEmbed = updatedTag.embedding;
          } else {
            // Embedding generation failed, skip this tag
            console.warn(
              `[Matching] Failed to get embedding for tag "${tag.displayName}"`,
            );
            continue;
          }
        }

        // Cache for subsequent matches
        embeddingCache.set(tag._id, tagEmbed);
      }

      // Calculate semantic similarity
      const similarity = cosineSimilarity(candidateEmbed, tagEmbed);

      if (similarity >= SEMANTIC_MIN_SIMILARITY) {
        return {
          existingTag: tag,
          matchType: "semantic",
          confidence: similarity,
        };
      }
    }
  } catch (error) {
    console.error("[Matching] Semantic matching failed:", error);
    // Fall through to "none" - don't block on embedding errors
  }

  // ========================================
  // NO MATCH: Create new tag
  // ========================================
  return {
    existingTag: null,
    matchType: "none",
    confidence: 0,
  };
}
