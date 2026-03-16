import { PGlite } from "@electric-sql/pglite";
import { createPgliteDatabase } from "../db";

const bootstrapSql = `
CREATE TABLE users (
  id text PRIMARY KEY,
  clerk_id text NOT NULL UNIQUE,
  email text NOT NULL,
  name text NOT NULL,
  image_url text,
  created_at bigint NOT NULL,
  updated_at bigint NOT NULL
);

CREATE TABLE conversations (
  id text PRIMARY KEY,
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title text NOT NULL,
  model text NOT NULL,
  active_leaf_message_id text,
  archived boolean NOT NULL DEFAULT false,
  created_at bigint NOT NULL,
  updated_at bigint NOT NULL
);

CREATE TABLE messages (
  id text PRIMARY KEY,
  conversation_id text NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id text REFERENCES users(id) ON DELETE SET NULL,
  role text NOT NULL,
  content text NOT NULL,
  status text NOT NULL,
  model text,
  comparison_group_id text,
  root_message_id text,
  sibling_index bigint NOT NULL,
  fork_reason text,
  created_at bigint NOT NULL,
  updated_at bigint NOT NULL
);

CREATE TABLE attachments (
  id text PRIMARY KEY,
  message_id text NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  conversation_id text NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type text NOT NULL,
  key text NOT NULL,
  bucket text NOT NULL,
  name text NOT NULL,
  mime_type text NOT NULL,
  size bigint NOT NULL,
  extracted_text text,
  extraction_error text,
  extracted_at bigint,
  created_at bigint NOT NULL
);

CREATE TABLE message_edges (
  parent_message_id text NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  child_message_id text NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  position bigint NOT NULL,
  edge_type text NOT NULL,
  created_at bigint NOT NULL,
  PRIMARY KEY (parent_message_id, child_message_id)
);

CREATE TABLE generation_requests (
  id text PRIMARY KEY,
  conversation_id text NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_message_id text NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  requested_models text[] NOT NULL DEFAULT ARRAY[]::text[],
  status text NOT NULL,
  created_at bigint NOT NULL,
  updated_at bigint NOT NULL
);

CREATE TABLE generation_sessions (
  id text PRIMARY KEY,
  request_id text NOT NULL REFERENCES generation_requests(id) ON DELETE CASCADE,
  assistant_message_id text NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  model_id text NOT NULL,
  status text NOT NULL,
  provider text,
  created_at bigint NOT NULL,
  updated_at bigint NOT NULL
);

CREATE TABLE generation_checkpoints (
  id text PRIMARY KEY,
  session_id text NOT NULL REFERENCES generation_sessions(id) ON DELETE CASCADE,
  content text NOT NULL,
  sequence bigint NOT NULL,
  created_at bigint NOT NULL
);
`;

export async function createTestPersistenceDb() {
  const client = new PGlite();
  await client.exec(bootstrapSql);
  return createPgliteDatabase(client);
}
