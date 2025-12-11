# Phase 4: File RAG System - Chunking, Embeddings & Semantic Search

## Overview

Build the complete RAG (Retrieval-Augmented Generation) pipeline for project files: document chunking, batch embedding generation, and semantic search via vector index.

**Duration**: 2-3 days
**Dependencies**: Phase 1 (Schema with fileChunks table)
**Output**: Files automatically embedded, searchable via semantic queries, integrated into project chat context

## Context: What We're Building

**File RAG** is a major differentiator for blah.chat. When users upload documents to projects, the system:

1. **Chunks** documents into overlapping segments (1500 tokens each)
2. **Embeds** chunks using text-embedding-3-small (1536-dim vectors)
3. **Indexes** chunks in vector database for semantic search
4. **Retrieves** relevant chunks based on user queries
5. **Injects** chunks into project chat context

This enables AI chat to "know about" uploaded files without hitting context limits.

## Existing Patterns to Follow

### 1. Message Embeddings (`convex/messages/embeddings.ts`)

**Pattern**: Batch embedding with status tracking

```typescript
// Batch embed multiple items
const { embeddings } = await embedMany({
  model: aiGateway("openai:text-embedding-3-small"),
  values: chunks.map(c => c.content),
});

// Store each embedding
for (let i = 0; i < chunks.length; i++) {
  await ctx.db.insert("fileChunks", {
    ...chunks[i],
    embedding: embeddings[i],
  });
}
```

### 2. Vector Search Pattern

```typescript
// Search by embedding
const results = await ctx.db
  .query("fileChunks")
  .withIndex("by_embedding", (q) =>
    q.eq("userId", userId)
  )
  .vectorSearch(queryEmbedding, topK);
```

### 3. Document Processing (`convex/tools/fileDocument.ts`)

**Pattern**: Extract text from various formats

```typescript
import { unpdf } from "unpdf"; // PDF
import mammoth from "mammoth"; // DOCX
import xlsx from "xlsx"; // Excel

// PDF
const { text } = await unpdf(buffer);

// DOCX
const { value } = await mammoth.extractRawText({ buffer });

// Already implemented - we'll reuse this
```

## Technical Decisions

### Chunking Strategy
- **Size**: 1500 tokens (~6000 characters)
- **Overlap**: 300 tokens (~1200 characters)
- **Rationale**: Balance context preservation vs chunk count
- **Method**: Character-based (simple), upgrade to tiktoken later

### Embedding Model
- **Model**: text-embedding-3-small
- **Dimensions**: 1536
- **Cost**: $0.02 per 1M tokens
- **Batch size**: 100 chunks at a time (API limit)

### Retrieval Strategy
- **Top-K**: 5 chunks for project context
- **Filter**: Scope to userId + optionally fileId/projectId
- **No threshold**: Use ranking (top 5 always returned)
- **No reranking**: Direct vector similarity for MVP

## Implementation Part 1: Document Chunking

### File: `convex/files/chunking.ts` (NEW)

```typescript
"use node"; // Required for text processing

import { v } from "convex/values";
import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";

const CHUNK_SIZE_TOKENS = 1500;
const CHUNK_OVERLAP_TOKENS = 300;
const CHARS_PER_TOKEN = 4; // Rough estimate (upgrade to tiktoken later)

/**
 * Chunk file content into overlapping segments
 */
export const chunkFile = internalAction({
  args: {
    fileId: v.id("files"),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const chunkChars = CHUNK_SIZE_TOKENS * CHARS_PER_TOKEN;
    const overlapChars = CHUNK_OVERLAP_TOKENS * CHARS_PER_TOKEN;

    const chunks: Array<{
      content: string;
      chunkIndex: number;
      metadata: {
        charOffset: number;
        tokenCount: number;
      };
    }> = [];

    let offset = 0;
    let index = 0;

    // Split into overlapping chunks
    while (offset < args.content.length) {
      const end = Math.min(offset + chunkChars, args.content.length);
      const chunkContent = args.content.slice(offset, end);

      // Skip empty chunks
      if (chunkContent.trim().length === 0) {
        offset += chunkChars - overlapChars;
        continue;
      }

      chunks.push({
        content: chunkContent,
        chunkIndex: index,
        metadata: {
          charOffset: offset,
          tokenCount: Math.floor(chunkContent.length / CHARS_PER_TOKEN),
        },
      });

      // Move forward with overlap
      offset += chunkChars - overlapChars;
      index++;
    }

    return chunks;
  },
});

/**
 * Enhanced chunking with metadata extraction (PDF-specific)
 */
export const chunkFileWithMetadata = internalAction({
  args: {
    fileId: v.id("files"),
    content: v.string(),
    mimeType: v.string(),
  },
  handler: async (ctx, args) => {
    // Basic chunking first
    const baseChunks = ((await (ctx.runAction as any)(
      // @ts-ignore
      internal.files.chunking.chunkFile,
      { fileId: args.fileId, content: args.content }
    )) as any[]);

    // For PDFs, try to extract page numbers
    // This is simplified - full implementation would parse PDF structure
    if (args.mimeType === "application/pdf") {
      // Estimate pages based on char count (rough heuristic)
      const charsPerPage = 2000;

      return baseChunks.map((chunk) => ({
        ...chunk,
        metadata: {
          ...chunk.metadata,
          startPage: Math.floor(chunk.metadata.charOffset / charsPerPage) + 1,
          endPage: Math.floor(
            (chunk.metadata.charOffset + chunk.content.length) / charsPerPage
          ) + 1,
        },
      }));
    }

    return baseChunks;
  },
});
```

## Implementation Part 2: Embedding Generation

### File: `convex/files/embeddings.ts` (NEW)

```typescript
"use node";

import { v } from "convex/values";
import { internalAction, internalMutation } from "../_generated/server";
import { internal } from "../_generated/api";
import { embed, embedMany } from "ai";
import { getModel } from "@/lib/ai/registry";
import { getGatewayOptions } from "../../src/lib/ai/gateway";
import type { Doc } from "../_generated/dataModel";

const EMBEDDING_MODEL = "openai:text-embedding-3-small";
const BATCH_SIZE = 100; // Max chunks per embedding batch

/**
 * Generate embeddings for file and store chunks
 */
export const generateFileEmbeddings = internalAction({
  args: {
    fileId: v.id("files"),
  },
  handler: async (ctx, args) => {
    // Get file
    const file = ((await (ctx.runQuery as any)(
      // @ts-ignore
      internal.files.getFileById,
      { fileId: args.fileId }
    )) as Doc<"files"> | null);

    if (!file) {
      throw new Error("File not found");
    }

    // Get file content (via document processing tool)
    const fileContent = ((await (ctx.runAction as any)(
      // @ts-ignore
      internal.tools.fileDocument.processFile,
      { fileId: args.fileId }
    )) as { text: string } | null);

    if (!fileContent || !fileContent.text) {
      throw new Error("Could not extract text from file");
    }

    // Update status to processing
    await ((ctx.runMutation as any)(
      // @ts-ignore
      internal.files.updateEmbeddingStatus,
      {
        fileId: args.fileId,
        status: "processing",
      }
    ));

    try {
      // Chunk file
      const chunks = ((await (ctx.runAction as any)(
        // @ts-ignore
        internal.files.chunking.chunkFileWithMetadata,
        {
          fileId: args.fileId,
          content: fileContent.text,
          mimeType: file.mimeType,
        }
      )) as any[]);

      if (chunks.length === 0) {
        throw new Error("No chunks generated from file");
      }

      // Batch embed chunks
      for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
        const batch = chunks.slice(i, i + BATCH_SIZE);

        // Generate embeddings for batch
        const { embeddings } = await embedMany({
          model: getModel(EMBEDDING_MODEL),
          values: batch.map((c) => c.content),
          providerOptions: getGatewayOptions(EMBEDDING_MODEL, undefined, [
            "file-embedding",
          ]),
        });

        // Store chunks with embeddings
        for (let j = 0; j < batch.length; j++) {
          await ((ctx.runMutation as any)(
            // @ts-ignore
            internal.files.insertFileChunk,
            {
              fileId: args.fileId,
              userId: file.userId,
              chunkIndex: batch[j].chunkIndex,
              content: batch[j].content,
              metadata: batch[j].metadata,
              embedding: embeddings[j],
            }
          ));
        }
      }

      // Update file status to completed
      await ((ctx.runMutation as any)(
        // @ts-ignore
        internal.files.updateEmbeddingStatus,
        {
          fileId: args.fileId,
          status: "completed",
          chunkCount: chunks.length,
        }
      ));

      return { success: true, chunkCount: chunks.length };
    } catch (error: any) {
      // Update status to failed
      await ((ctx.runMutation as any)(
        // @ts-ignore
        internal.files.updateEmbeddingStatus,
        {
          fileId: args.fileId,
          status: "failed",
          error: error.message,
        }
      ));

      throw error;
    }
  },
});

/**
 * Re-embed file (if processing failed or content changed)
 */
export const reEmbedFile = internalAction({
  args: { fileId: v.id("files") },
  handler: async (ctx, args) => {
    // Delete existing chunks
    const existingChunks = await ((ctx.runQuery as any)(
      // @ts-ignore
      internal.files.getFileChunks,
      { fileId: args.fileId }
    )) as Doc<"fileChunks">[];

    for (const chunk of existingChunks) {
      await ((ctx.runMutation as any)(
        // @ts-ignore
        internal.files.deleteFileChunk,
        { chunkId: chunk._id }
      ));
    }

    // Re-run embedding
    return await ((ctx.runAction as any)(
      // @ts-ignore
      internal.files.embeddings.generateFileEmbeddings,
      { fileId: args.fileId }
    ));
  },
});
```

## Implementation Part 3: File Mutations & Queries

### File: `convex/files.ts` (EXTEND)

Add these mutations and queries:

```typescript
import { v } from "convex/values";
import { internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { getCurrentUser } from "./lib/userSync";
import type { Doc } from "./_generated/dataModel";

// ============================================================
// EMBEDDING STATUS MUTATIONS (Internal)
// ============================================================

/**
 * Update file embedding status
 */
export const updateEmbeddingStatus = internalMutation({
  args: {
    fileId: v.id("files"),
    status: v.union(
      v.literal("pending"),
      v.literal("processing"),
      v.literal("completed"),
      v.literal("failed")
    ),
    chunkCount: v.optional(v.number()),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.fileId, {
      embeddingStatus: args.status,
      chunkCount: args.chunkCount,
      embeddingError: args.error,
      processedAt: Date.now(),
    });
  },
});

/**
 * Insert file chunk with embedding
 */
export const insertFileChunk = internalMutation({
  args: {
    fileId: v.id("files"),
    userId: v.id("users"),
    chunkIndex: v.number(),
    content: v.string(),
    metadata: v.object({
      charOffset: v.number(),
      tokenCount: v.number(),
      startPage: v.optional(v.number()),
      endPage: v.optional(v.number()),
      section: v.optional(v.string()),
    }),
    embedding: v.array(v.float64()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("fileChunks", {
      fileId: args.fileId,
      userId: args.userId,
      chunkIndex: args.chunkIndex,
      content: args.content,
      metadata: args.metadata,
      embedding: args.embedding,
      createdAt: Date.now(),
    });
  },
});

/**
 * Delete file chunk
 */
export const deleteFileChunk = internalMutation({
  args: { chunkId: v.id("fileChunks") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.chunkId);
  },
});

// ============================================================
// QUERIES
// ============================================================

/**
 * Get file by ID (internal)
 */
export const getFileById = internalQuery({
  args: { fileId: v.id("files") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.fileId);
  },
});

/**
 * Get file chunks
 */
export const getFileChunks = internalQuery({
  args: { fileId: v.id("files") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("fileChunks")
      .withIndex("by_file", (q) => q.eq("fileId", args.fileId))
      .collect();
  },
});

/**
 * Get file with embedding status
 */
export const getFileWithStatus = query({
  args: { fileId: v.id("files") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return null;

    const file = await ctx.db.get(args.fileId);
    if (!file || file.userId !== user._id) {
      return null;
    }

    return file;
  },
});
```

## Implementation Part 4: Semantic Search

### File: `convex/files/search.ts` (NEW)

```typescript
"use node";

import { v } from "convex/values";
import { action, internalQuery } from "../_generated/server";
import { internal } from "../_generated/api";
import { embed } from "ai";
import { getModel } from "@/lib/ai/registry";
import { getGatewayOptions } from "../../src/lib/ai/gateway";
import type { Doc } from "../_generated/dataModel";

const EMBEDDING_MODEL = "openai:text-embedding-3-small";

/**
 * Search file chunks by semantic similarity
 */
export const searchFileChunks = action({
  args: {
    query: v.string(),
    projectId: v.optional(v.id("projects")),
    fileId: v.optional(v.id("files")),
    topK: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = ((await (ctx.runQuery as any)(
      // @ts-ignore
      internal.lib.helpers.getCurrentUser
    )) as any);

    if (!user) throw new Error("Not authenticated");

    // Generate query embedding
    const { embedding: queryEmbedding } = await embed({
      model: getModel(EMBEDDING_MODEL),
      value: args.query,
      providerOptions: getGatewayOptions(EMBEDDING_MODEL, undefined, [
        "file-search",
      ]),
    });

    // Get file IDs to search (if project specified)
    let fileIds: string[] | undefined;

    if (args.projectId) {
      const fileLinks = ((await (ctx.runQuery as any)(
        // @ts-ignore
        internal.projects.getProjectFileLinks,
        { projectId: args.projectId }
      )) as any[]);

      fileIds = fileLinks.map((l) => l.fileId);
    } else if (args.fileId) {
      fileIds = [args.fileId];
    }

    // Vector search
    const results = ((await (ctx.runQuery as any)(
      // @ts-ignore
      internal.files.search.vectorSearchChunks,
      {
        embedding: queryEmbedding,
        userId: user._id,
        fileIds,
        topK: args.topK || 10,
      }
    )) as any[]);

    // Hydrate with file info
    const hydratedResults = await Promise.all(
      results.map(async (result) => {
        const file = await ((ctx.runQuery as any)(
          // @ts-ignore
          internal.files.getFileById,
          { fileId: result.fileId }
        )) as Doc<"files"> | null;

        return {
          ...result,
          file: file ? { name: file.name, mimeType: file.mimeType } : null,
        };
      })
    );

    return hydratedResults;
  },
});

/**
 * Vector search implementation (internal)
 */
export const vectorSearchChunks = internalQuery({
  args: {
    embedding: v.array(v.float64()),
    userId: v.id("users"),
    fileIds: v.optional(v.array(v.string())),
    topK: v.number(),
  },
  handler: async (ctx, args) => {
    // Vector search on chunks
    let results = await ctx.db
      .query("fileChunks")
      .withIndex("by_embedding", (q) => q.eq("userId", args.userId))
      .vectorSearch(args.embedding, args.topK * 2); // Get extra for filtering

    // Filter by file IDs if specified
    if (args.fileIds && args.fileIds.length > 0) {
      results = results.filter((r) => args.fileIds!.includes(r.fileId));
    }

    // Return top-K after filtering
    return results.slice(0, args.topK);
  },
});
```

## Implementation Part 5: Project Context Integration

### File: `convex/projects.ts` (EXTEND)

Add action for project context retrieval with RAG:

```typescript
"use node";

/**
 * Get enriched project context for chat (includes RAG)
 */
export const getProjectContext = action({
  args: {
    projectId: v.id("projects"),
    query: v.string(), // Current user message
  },
  handler: async (ctx, args) => {
    const user = ((await (ctx.runQuery as any)(
      // @ts-ignore
      internal.lib.helpers.getCurrentUser
    )) as any);

    if (!user) throw new Error("Not authenticated");

    // Get project
    const project = ((await (ctx.runQuery as any)(
      // @ts-ignore
      internal.projects.get,
      { id: args.projectId }
    )) as Doc<"projects"> | null);

    if (!project || project.userId !== user._id) {
      throw new Error("Project not found");
    }

    // Get relevant file chunks via RAG
    const fileContext = ((await (ctx.runAction as any)(
      // @ts-ignore
      internal.files.search.searchFileChunks,
      {
        query: args.query,
        projectId: args.projectId,
        topK: 5,
      }
    )) as any[]);

    // Get active tasks
    const tasks = ((await (ctx.runQuery as any)(
      // @ts-ignore
      internal.tasks.listTasks,
      {
        projectId: args.projectId,
        status: "confirmed",
      }
    )) as any[]);

    // Combine context
    const contextParts = [
      `# Project: ${project.name}`,
      project.description ? `\n${project.description}` : "",
      project.systemPrompt ? `\n## Instructions\n${project.systemPrompt}` : "",
    ];

    // Add file context if available
    if (fileContext.length > 0) {
      contextParts.push("\n## Relevant File Content");
      fileContext.forEach((chunk, i) => {
        const fileInfo = chunk.file
          ? `[${chunk.file.name}${chunk.metadata.startPage ? `, page ${chunk.metadata.startPage}` : ""}]`
          : "[Unknown file]";

        contextParts.push(`\n### Source ${i + 1}: ${fileInfo}`);
        contextParts.push(chunk.content);
      });
    }

    // Add active tasks
    if (tasks.length > 0) {
      contextParts.push("\n## Active Tasks");
      tasks.forEach((task: any) => {
        const deadline = task.deadline
          ? ` (due ${new Date(task.deadline).toLocaleDateString()})`
          : "";
        contextParts.push(`- ${task.title}${deadline}`);
      });
    }

    return contextParts.join("\n");
  },
});

/**
 * Get project file links (helper)
 */
export const getProjectFileLinks = internalQuery({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("projectFiles")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();
  },
});
```

## Implementation Part 6: Auto-Embed on Upload

### File: `convex/files.ts` (EXTEND)

Modify file upload to trigger embedding:

```typescript
/**
 * Save file metadata and trigger embedding
 */
export const saveFile = mutation({
  args: {
    storageId: v.string(),
    name: v.string(),
    mimeType: v.string(),
    size: v.number(),
    conversationId: v.optional(v.id("conversations")),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrCreate(ctx);

    const fileId = await ctx.db.insert("files", {
      userId: user._id,
      conversationId: args.conversationId,
      storageId: args.storageId,
      name: args.name,
      mimeType: args.mimeType,
      size: args.size,
      embeddingStatus: "pending", // NEW: Default to pending
      createdAt: Date.now(),
    });

    // Trigger embedding asynchronously (don't wait)
    // Only for supported document types
    const supportedTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "text/plain",
      "text/markdown",
    ];

    if (supportedTypes.includes(args.mimeType)) {
      ctx.scheduler.runAfter(0, internal.files.embeddings.generateFileEmbeddings, {
        fileId,
      });
    }

    return fileId;
  },
});
```

## Testing

### 1. Test Chunking

```typescript
const content = "A".repeat(20000); // Long text

const chunks = await ctx.runAction(internal.files.chunking.chunkFile, {
  fileId: "<file-id>",
  content,
});

console.log(chunks.length); // Should be ~3-4 chunks
console.log(chunks[0].metadata); // Should have charOffset, tokenCount
```

### 2. Test Embedding Generation

```typescript
// Upload a test file
const fileId = await ctx.runMutation(api.files.saveFile, {
  storageId: "<storage-id>",
  name: "test.pdf",
  mimeType: "application/pdf",
  size: 50000,
});

// Check status (wait a few seconds for async processing)
const file = await ctx.runQuery(api.files.getFileWithStatus, { fileId });
console.log(file.embeddingStatus); // Should be "processing" then "completed"

// Check chunks created
const chunks = await ctx.runQuery(internal.files.getFileChunks, { fileId });
console.log(chunks.length); // Should be > 0
```

### 3. Test Semantic Search

```typescript
// Search for content
const results = await ctx.runAction(api.files.search.searchFileChunks, {
  query: "authentication system",
  projectId: "<project-id>",
  topK: 5,
});

console.log(results);
// Should return relevant chunks with similarity scores
```

### 4. Test Project Context

```typescript
const context = await ctx.runAction(api.projects.getProjectContext, {
  projectId: "<project-id>",
  query: "How does authentication work?",
});

console.log(context);
// Should include project info + relevant file chunks + tasks
```

## Troubleshooting

### Embedding Fails
- Check file content extraction works
- Verify embedding model is accessible
- Check API quota/limits
- Look at `embeddingError` field in file record

### No Chunks Returned
- Verify chunks were created (`getFileChunks`)
- Check vector index is built (Convex dashboard)
- Verify query embedding generation works
- Check userId filter matches

### Context Too Long
- Reduce topK (fewer chunks)
- Implement chunk truncation
- Use summarization for large chunks

## Performance Optimization

### Batch Processing
- Process max 100 chunks per batch
- Use `ctx.scheduler` for async embedding
- Don't block UI on embedding completion

### Caching
- Cache query embeddings for repeated searches
- Store frequently accessed chunks in memory
- Use Convex reactive queries for real-time updates

### Monitoring
- Track embedding success/failure rates
- Monitor chunk count distribution
- Alert on processing failures

## Success Criteria

- [ ] Files automatically chunked on upload
- [ ] Embeddings generated within 30 seconds for 10-page PDF
- [ ] Semantic search returns relevant chunks
- [ ] Project context includes file chunks
- [ ] Embedding status indicators work (pending/processing/completed/failed)
- [ ] Failed embeddings can be retried
- [ ] Vector search returns top-K results
- [ ] Chunks include page numbers for PDFs
- [ ] Batch embedding handles 100+ chunks

## Next Phase

**Phase 5: Smart Assistant UI** - Build upload flow, task review panel, state management

File RAG complete. UI will trigger transcription → extraction → embedding pipeline.

## Reference Files

- Message embeddings: `convex/messages/embeddings.ts`
- Document processing: `convex/tools/fileDocument.ts`
- Vector search example: `convex/schema.ts` (memories.by_embedding)
- AI Gateway: `src/lib/ai/gateway.ts`
