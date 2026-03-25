-- Phase 11: pgvector embeddings + tsvector full-text search
-- Converts embedding columns from jsonb to native vector(1536)
-- Adds tsvector generated columns with GIN indexes for full-text search
-- Adds HNSW indexes for vector similarity search

CREATE EXTENSION IF NOT EXISTS vector;

-- message_embeddings: jsonb -> vector(1536)
ALTER TABLE message_embeddings
  ALTER COLUMN embedding TYPE vector(1536)
  USING embedding::text::vector;

ALTER TABLE message_embeddings
  ADD COLUMN search_tsv tsvector
  GENERATED ALWAYS AS (to_tsvector('english', coalesce(search_document, content))) STORED;

CREATE INDEX message_embeddings_fts ON message_embeddings USING gin(search_tsv);
CREATE INDEX message_embeddings_vec ON message_embeddings USING hnsw(embedding vector_cosine_ops);

-- memory_embeddings: jsonb -> vector(1536)
ALTER TABLE memory_embeddings
  ALTER COLUMN embedding TYPE vector(1536)
  USING embedding::text::vector;

ALTER TABLE memory_embeddings
  ADD COLUMN search_tsv tsvector
  GENERATED ALWAYS AS (to_tsvector('english', coalesce(search_document, content))) STORED;

CREATE INDEX memory_embeddings_fts ON memory_embeddings USING gin(search_tsv);
CREATE INDEX memory_embeddings_vec ON memory_embeddings USING hnsw(embedding vector_cosine_ops);

-- task_embeddings: jsonb -> vector(1536)
ALTER TABLE task_embeddings
  ALTER COLUMN embedding TYPE vector(1536)
  USING embedding::text::vector;

ALTER TABLE task_embeddings
  ADD COLUMN search_tsv tsvector
  GENERATED ALWAYS AS (to_tsvector('english', coalesce(search_document, content))) STORED;

CREATE INDEX task_embeddings_fts ON task_embeddings USING gin(search_tsv);
CREATE INDEX task_embeddings_vec ON task_embeddings USING hnsw(embedding vector_cosine_ops);

-- note_embeddings: jsonb -> vector(1536)
ALTER TABLE note_embeddings
  ALTER COLUMN embedding TYPE vector(1536)
  USING embedding::text::vector;

ALTER TABLE note_embeddings
  ADD COLUMN search_tsv tsvector
  GENERATED ALWAYS AS (to_tsvector('english', coalesce(search_document, content))) STORED;

CREATE INDEX note_embeddings_fts ON note_embeddings USING gin(search_tsv);
CREATE INDEX note_embeddings_vec ON note_embeddings USING hnsw(embedding vector_cosine_ops);

-- file_chunks: jsonb -> vector(1536)
ALTER TABLE file_chunks
  ALTER COLUMN embedding TYPE vector(1536)
  USING embedding::text::vector;

ALTER TABLE file_chunks
  ADD COLUMN search_tsv tsvector
  GENERATED ALWAYS AS (to_tsvector('english', coalesce(search_document, content))) STORED;

CREATE INDEX file_chunks_fts ON file_chunks USING gin(search_tsv);
CREATE INDEX file_chunks_vec ON file_chunks USING hnsw(embedding vector_cosine_ops);

-- knowledge_chunks: jsonb -> vector(1536)
ALTER TABLE knowledge_chunks
  ALTER COLUMN embedding TYPE vector(1536)
  USING embedding::text::vector;

ALTER TABLE knowledge_chunks
  ADD COLUMN search_tsv tsvector
  GENERATED ALWAYS AS (to_tsvector('english', coalesce(search_document, content))) STORED;

CREATE INDEX knowledge_chunks_fts ON knowledge_chunks USING gin(search_tsv);
CREATE INDEX knowledge_chunks_vec ON knowledge_chunks USING hnsw(embedding vector_cosine_ops);

-- routing_examples: jsonb -> vector(1536)
ALTER TABLE routing_examples
  ALTER COLUMN embedding TYPE vector(1536)
  USING embedding::text::vector;

CREATE INDEX routing_examples_vec ON routing_examples USING hnsw(embedding vector_cosine_ops);
