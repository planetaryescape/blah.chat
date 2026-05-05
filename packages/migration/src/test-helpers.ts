import * as schema from "@blah-chat/persistence-postgres";
import { PGlite } from "@electric-sql/pglite";
import { drizzle, type PgliteDatabase } from "drizzle-orm/pglite";

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
  model_recommendation jsonb,
  active_leaf_message_id text,
  project_id text,
  is_incognito boolean NOT NULL DEFAULT false,
  incognito_settings jsonb,
  pinned boolean NOT NULL DEFAULT false,
  archived boolean NOT NULL DEFAULT false,
  starred boolean NOT NULL DEFAULT false,
  thinking_effort text NOT NULL DEFAULT 'none',
  mode text NOT NULL DEFAULT 'chat',
  active_document_id text,
  created_at bigint NOT NULL,
  updated_at bigint NOT NULL
);

CREATE TABLE user_preferences (
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  key text NOT NULL,
  value jsonb NOT NULL,
  created_at bigint NOT NULL,
  updated_at bigint NOT NULL,
  PRIMARY KEY (user_id, key)
);

CREATE TABLE messages (
  id text PRIMARY KEY,
  conversation_id text NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id text REFERENCES users(id) ON DELETE SET NULL,
  role text NOT NULL,
  content text NOT NULL,
  client_message_id text,
  status text NOT NULL DEFAULT 'complete',
  model text,
  comparison_group_id text,
  consolidated_message_id text,
  is_consolidation boolean NOT NULL DEFAULT false,
  root_message_id text,
  sibling_index bigint NOT NULL DEFAULT 0,
  fork_reason text,
  created_at bigint NOT NULL,
  updated_at bigint NOT NULL
);

CREATE TABLE message_edges (
  parent_message_id text NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  child_message_id text NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  position bigint NOT NULL,
  edge_type text NOT NULL,
  created_at bigint NOT NULL,
  PRIMARY KEY (parent_message_id, child_message_id)
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
  metadata jsonb,
  extracted_text text,
  extraction_error text,
  extracted_at bigint,
  created_at bigint NOT NULL
);

CREATE TABLE projects (
  id text PRIMARY KEY,
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  system_prompt text,
  is_template boolean NOT NULL DEFAULT false,
  created_from text,
  created_at bigint NOT NULL,
  updated_at bigint NOT NULL
);

CREATE TABLE templates (
  id text PRIMARY KEY,
  user_id text REFERENCES users(id) ON DELETE CASCADE,
  name text NOT NULL,
  prompt text NOT NULL,
  description text,
  category text NOT NULL,
  is_built_in boolean NOT NULL DEFAULT false,
  is_public boolean NOT NULL DEFAULT false,
  usage_count bigint NOT NULL DEFAULT 0,
  created_at bigint NOT NULL,
  updated_at bigint NOT NULL
);

CREATE TABLE bookmarks (
  id text PRIMARY KEY,
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message_id text NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  conversation_id text NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  note text,
  tags text[] NOT NULL DEFAULT ARRAY[]::text[],
  created_at bigint NOT NULL,
  updated_at bigint NOT NULL
);

CREATE TABLE notes (
  id text PRIMARY KEY,
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title text NOT NULL,
  content text NOT NULL,
  source_message_id text REFERENCES messages(id) ON DELETE SET NULL,
  source_conversation_id text REFERENCES conversations(id) ON DELETE SET NULL,
  project_id text,
  tags text[] NOT NULL DEFAULT ARRAY[]::text[],
  suggested_tags text[] NOT NULL DEFAULT ARRAY[]::text[],
  is_pinned boolean NOT NULL DEFAULT false,
  share_id text,
  is_public boolean NOT NULL DEFAULT false,
  share_password text,
  share_expires_at bigint,
  created_at bigint NOT NULL,
  updated_at bigint NOT NULL
);

CREATE TABLE tasks (
  id text PRIMARY KEY,
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'in_progress',
  deadline bigint,
  deadline_source text,
  urgency text,
  tags text[] NOT NULL DEFAULT ARRAY[]::text[],
  source_type text,
  source_id text,
  source_context jsonb,
  project_id text,
  priority bigint,
  position bigint,
  completed_at bigint,
  created_at bigint NOT NULL,
  updated_at bigint NOT NULL
);

CREATE TABLE usage_records (
  id text PRIMARY KEY,
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date text NOT NULL,
  model text NOT NULL,
  conversation_id text REFERENCES conversations(id) ON DELETE SET NULL,
  feature text,
  operation_type text,
  input_tokens bigint NOT NULL DEFAULT 0,
  output_tokens bigint NOT NULL DEFAULT 0,
  reasoning_tokens bigint,
  cost double precision NOT NULL,
  message_count bigint NOT NULL DEFAULT 1,
  is_byok boolean,
  created_at bigint NOT NULL
);

CREATE TABLE tts_cache (
  hash text PRIMARY KEY,
  bucket text NOT NULL,
  key text NOT NULL,
  text text NOT NULL,
  voice text NOT NULL,
  speed double precision NOT NULL,
  format text NOT NULL,
  created_at bigint NOT NULL,
  last_accessed_at bigint NOT NULL
);

CREATE TABLE message_tool_calls (
  id text PRIMARY KEY,
  message_id text NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  conversation_id text NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tool_call_id text NOT NULL,
  tool_name text NOT NULL,
  args jsonb NOT NULL,
  result jsonb,
  text_position bigint,
  is_partial boolean NOT NULL DEFAULT false,
  timestamp bigint NOT NULL,
  created_at bigint NOT NULL,
  UNIQUE (message_id, tool_call_id)
);

CREATE TABLE source_metadata (
  id text PRIMARY KEY,
  url_hash text NOT NULL UNIQUE,
  url text NOT NULL,
  title text,
  description text,
  og_image text,
  favicon text,
  site_name text,
  enriched boolean NOT NULL DEFAULT false,
  error text,
  first_seen_at bigint NOT NULL,
  last_accessed_at bigint NOT NULL,
  access_count bigint NOT NULL DEFAULT 0,
  created_at bigint NOT NULL,
  updated_at bigint NOT NULL
);

CREATE TABLE message_sources (
  id text PRIMARY KEY,
  message_id text NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  conversation_id text NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id text REFERENCES users(id) ON DELETE SET NULL,
  position bigint NOT NULL,
  provider text NOT NULL DEFAULT 'unknown',
  title text NOT NULL,
  snippet text,
  url_hash text NOT NULL,
  url text NOT NULL,
  is_partial boolean NOT NULL DEFAULT false,
  created_at bigint NOT NULL
);

CREATE TABLE knowledge_sources (
  id text PRIMARY KEY,
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id text,
  type text NOT NULL,
  title text NOT NULL,
  description text,
  storage_key text,
  url text,
  raw_content text,
  video_metadata jsonb,
  mime_type text,
  size bigint,
  status text NOT NULL DEFAULT 'pending',
  error text,
  chunk_count bigint,
  processed_at bigint,
  created_at bigint NOT NULL,
  updated_at bigint NOT NULL
);

CREATE TABLE feedback_entries (
  id text PRIMARY KEY,
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_email text NOT NULL,
  user_name text NOT NULL,
  page text NOT NULL,
  feedback_type text NOT NULL,
  description text NOT NULL,
  what_they_did text,
  what_they_saw text,
  what_they_expected text,
  screenshot_key text,
  user_suggested_urgency text,
  status text NOT NULL,
  priority text NOT NULL DEFAULT 'none',
  tags text[] NOT NULL DEFAULT ARRAY[]::text[],
  ai_triage jsonb,
  error_context jsonb,
  archived_at bigint,
  created_at bigint NOT NULL,
  updated_at bigint NOT NULL
);

CREATE TABLE starter_suggestion_caches (
  id text PRIMARY KEY,
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  suggestions jsonb NOT NULL DEFAULT '[]'::jsonb,
  needs_refresh boolean NOT NULL DEFAULT false,
  generated_at bigint NOT NULL,
  source text NOT NULL DEFAULT 'cache',
  created_at bigint NOT NULL,
  updated_at bigint NOT NULL
);

CREATE TABLE cli_api_keys (
  id text PRIMARY KEY,
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  key_hash text NOT NULL UNIQUE,
  key_prefix text NOT NULL,
  name text NOT NULL,
  last_used_at bigint,
  created_at bigint NOT NULL,
  revoked_at bigint
);

CREATE TABLE user_api_keys (
  id text PRIMARY KEY,
  user_id text NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  byok_enabled boolean NOT NULL DEFAULT false,
  encrypted_vercel_gateway_key text,
  encrypted_open_router_key text,
  encrypted_groq_key text,
  encrypted_deepgram_key text,
  encryption_ivs text,
  auth_tags text,
  last_validated jsonb,
  created_at bigint NOT NULL,
  updated_at bigint NOT NULL
);

CREATE TABLE composio_connections (
  id text PRIMARY KEY,
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  composio_connection_id text NOT NULL UNIQUE,
  integration_id text NOT NULL,
  integration_name text NOT NULL,
  status text NOT NULL,
  scopes text[] NOT NULL DEFAULT ARRAY[]::text[],
  oauth_state text,
  oauth_state_expires_at bigint,
  connected_at bigint,
  last_used_at bigint,
  last_error text,
  created_at bigint NOT NULL,
  updated_at bigint NOT NULL,
  UNIQUE (user_id, integration_id)
);

CREATE TABLE comparison_votes (
  id text PRIMARY KEY,
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  comparison_group_id text NOT NULL,
  winner_message_id text,
  rating text NOT NULL,
  voted_at bigint NOT NULL
);

CREATE TABLE consolidations (
  id text PRIMARY KEY,
  comparison_group_id text NOT NULL,
  conversation_id text REFERENCES conversations(id) ON DELETE CASCADE,
  user_message_id text REFERENCES messages(id) ON DELETE SET NULL,
  consolidated_message_id text REFERENCES messages(id) ON DELETE SET NULL,
  model_id text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  metadata jsonb,
  created_at bigint NOT NULL,
  updated_at bigint NOT NULL
);

CREATE TABLE generation_requests (
  id text PRIMARY KEY,
  conversation_id text NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_message_id text NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  requested_models text[] NOT NULL DEFAULT ARRAY[]::text[],
  prompt_override text,
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

CREATE TABLE routing_policies (
  id text PRIMARY KEY,
  name text NOT NULL,
  description text,
  is_active boolean NOT NULL DEFAULT false,
  strategy text NOT NULL DEFAULT 'outcome_weighted',
  config jsonb NOT NULL,
  created_at bigint NOT NULL,
  updated_at bigint NOT NULL
);

CREATE TABLE routing_decisions (
  id text PRIMARY KEY,
  policy_id text REFERENCES routing_policies(id) ON DELETE SET NULL,
  generation_request_id text REFERENCES generation_requests(id) ON DELETE SET NULL,
  conversation_id text REFERENCES conversations(id) ON DELETE SET NULL,
  user_id text REFERENCES users(id) ON DELETE SET NULL,
  route_label text,
  selected_model_id text NOT NULL,
  previous_model_id text,
  reasoning text,
  input jsonb,
  created_at bigint NOT NULL
);

CREATE TABLE routing_candidate_scores (
  id text PRIMARY KEY,
  decision_id text NOT NULL REFERENCES routing_decisions(id) ON DELETE CASCADE,
  model_id text NOT NULL,
  provider text,
  score double precision NOT NULL,
  rank bigint,
  features jsonb,
  created_at bigint NOT NULL
);

CREATE TABLE shares (
  id text PRIMARY KEY,
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  conversation_id text NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  share_id text NOT NULL UNIQUE,
  title text NOT NULL,
  expires_at bigint,
  is_public boolean NOT NULL DEFAULT true,
  is_active boolean NOT NULL DEFAULT true,
  password text,
  anonymize_usernames boolean NOT NULL DEFAULT false,
  view_count bigint NOT NULL DEFAULT 0,
  created_at bigint NOT NULL
);
`;

export async function createTestDb(): Promise<PgliteDatabase<typeof schema>> {
  const client = new PGlite();
  await client.exec(bootstrapSql);
  return drizzle(client, { schema });
}
