/**
 * Embedding Provider Interface
 *
 * Abstraction for embedding generation, allowing users to plug in
 * any embedding provider (OpenAI, Cohere, local models, etc).
 */

export interface EmbeddingProvider {
  /** Generate embeddings for one or more texts. Must return consistent-length vectors. */
  embedBatch(texts: string[]): Promise<number[][]>;
}

/** Wrap a single-text embed function into an EmbeddingProvider. */
export function singleToProvider(
  embed: (text: string) => Promise<number[]>,
): EmbeddingProvider {
  return { embedBatch: (texts) => Promise.all(texts.map((t) => embed(t))) };
}
