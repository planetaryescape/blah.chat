/**
 * Shared constants that can be imported in both server and browser contexts.
 * This file should NEVER import Convex functions (queries, mutations, actions).
 */

/**
 * Minimum number of messages required before a conversation can be compacted.
 * Used to prevent compacting conversations that are too short to benefit.
 */
export const MIN_MESSAGES_FOR_COMPACTION = 3;
