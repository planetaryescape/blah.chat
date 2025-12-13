/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as admin from "../admin.js";
import type * as adminSettings from "../adminSettings.js";
import type * as ai_generateTitle from "../ai/generateTitle.js";
import type * as ai_modelTriage from "../ai/modelTriage.js";
import type * as ai_taskExtraction from "../ai/taskExtraction.js";
import type * as ai_tools_calculator from "../ai/tools/calculator.js";
import type * as ai_tools_codeExecution from "../ai/tools/codeExecution.js";
import type * as ai_tools_datetime from "../ai/tools/datetime.js";
import type * as ai_tools_fileDocument from "../ai/tools/fileDocument.js";
import type * as ai_tools_memories_index from "../ai/tools/memories/index.js";
import type * as ai_tools_memories_memoryDelete from "../ai/tools/memories/memoryDelete.js";
import type * as ai_tools_memories_memorySave from "../ai/tools/memories/memorySave.js";
import type * as ai_tools_memories_memorySearch from "../ai/tools/memories/memorySearch.js";
import type * as ai_tools_projectContext from "../ai/tools/projectContext.js";
import type * as ai_tools_projectContext_queryProjectHistory from "../ai/tools/projectContext/queryProjectHistory.js";
import type * as ai_tools_projectContext_searchProjectFiles from "../ai/tools/projectContext/searchProjectFiles.js";
import type * as ai_tools_projectContext_searchProjectNotes from "../ai/tools/projectContext/searchProjectNotes.js";
import type * as ai_tools_projectContext_searchProjectTasks from "../ai/tools/projectContext/searchProjectTasks.js";
import type * as ai_tools_urlReader from "../ai/tools/urlReader.js";
import type * as ai_tools_weather from "../ai/tools/weather.js";
import type * as ai_tools_webSearch from "../ai/tools/webSearch.js";
import type * as bookmarks from "../bookmarks.js";
import type * as chat from "../chat.js";
import type * as conversations from "../conversations.js";
import type * as conversations_actions from "../conversations/actions.js";
import type * as conversations_hybridSearch from "../conversations/hybridSearch.js";
import type * as crons from "../crons.js";
import type * as debug from "../debug.js";
import type * as emails_components_EmailButton from "../emails/components/EmailButton.js";
import type * as emails_components_EmailContainer from "../emails/components/EmailContainer.js";
import type * as emails_components_index from "../emails/components/index.js";
import type * as emails_index from "../emails/index.js";
import type * as emails_templates_apiCreditsExhausted from "../emails/templates/apiCreditsExhausted.js";
import type * as emails_templates_budgetWarning from "../emails/templates/budgetWarning.js";
import type * as emails_templates_feedbackNotification from "../emails/templates/feedbackNotification.js";
import type * as emails_templates_index from "../emails/templates/index.js";
import type * as emails_test_testEmails from "../emails/test/testEmails.js";
import type * as emails_utils_index from "../emails/utils/index.js";
import type * as emails_utils_mutations from "../emails/utils/mutations.js";
import type * as emails_utils_send from "../emails/utils/send.js";
import type * as feedback from "../feedback.js";
import type * as feedback_triage from "../feedback/triage.js";
import type * as files from "../files.js";
import type * as files_chunking from "../files/chunking.js";
import type * as files_embeddings from "../files/embeddings.js";
import type * as files_search from "../files/search.js";
import type * as generation from "../generation.js";
import type * as generation_image from "../generation/image.js";
import type * as http from "../http.js";
import type * as import_ from "../import.js";
import type * as jobs_actions from "../jobs/actions.js";
import type * as jobs_crud from "../jobs/crud.js";
import type * as lib_analytics from "../lib/analytics.js";
import type * as lib_errorTracking from "../lib/errorTracking.js";
import type * as lib_helpers from "../lib/helpers.js";
import type * as lib_prompts_base from "../lib/prompts/base.js";
import type * as lib_prompts_formatting from "../lib/prompts/formatting.js";
import type * as lib_prompts_index from "../lib/prompts/index.js";
import type * as lib_prompts_operational_imageGeneration from "../lib/prompts/operational/imageGeneration.js";
import type * as lib_prompts_operational_memoryConsolidation from "../lib/prompts/operational/memoryConsolidation.js";
import type * as lib_prompts_operational_memoryExtraction from "../lib/prompts/operational/memoryExtraction.js";
import type * as lib_prompts_operational_memoryRephrase from "../lib/prompts/operational/memoryRephrase.js";
import type * as lib_prompts_operational_memoryRerank from "../lib/prompts/operational/memoryRerank.js";
import type * as lib_prompts_operational_summarization from "../lib/prompts/operational/summarization.js";
import type * as lib_prompts_operational_tagExtraction from "../lib/prompts/operational/tagExtraction.js";
import type * as lib_prompts_operational_titleGeneration from "../lib/prompts/operational/titleGeneration.js";
import type * as lib_prompts_templates_builtIn from "../lib/prompts/templates/builtIn.js";
import type * as lib_userSync from "../lib/userSync.js";
import type * as memories from "../memories.js";
import type * as memories_delete from "../memories/delete.js";
import type * as memories_expiration from "../memories/expiration.js";
import type * as memories_extract from "../memories/extract.js";
import type * as memories_mutations from "../memories/mutations.js";
import type * as memories_save from "../memories/save.js";
import type * as memories_search from "../memories/search.js";
import type * as messages from "../messages.js";
import type * as messages_embeddings from "../messages/embeddings.js";
import type * as migrations_001_normalize_message_attachments from "../migrations/001_normalize_message_attachments.js";
import type * as migrations_003_normalize_project_conversations from "../migrations/003_normalize_project_conversations.js";
import type * as migrations_003_normalize_project_conversations_actions from "../migrations/003_normalize_project_conversations_actions.js";
import type * as migrations_004_remove_conversationIds_field from "../migrations/004_remove_conversationIds_field.js";
import type * as migrations_004_remove_conversationIds_field_actions from "../migrations/004_remove_conversationIds_field_actions.js";
import type * as migrations_005_backfill_tags from "../migrations/005_backfill_tags.js";
import type * as migrations_005_require_message_model from "../migrations/005_require_message_model.js";
import type * as migrations_005_require_message_model_actions from "../migrations/005_require_message_model_actions.js";
import type * as migrations_006_user_preferences_backfill from "../migrations/006_user_preferences_backfill.js";
import type * as migrations_006_user_preferences_backfill_actions from "../migrations/006_user_preferences_backfill_actions.js";
import type * as migrations_007_normalize_conversation_metadata from "../migrations/007_normalize_conversation_metadata.js";
import type * as migrations_007_normalize_conversation_metadata_helpers from "../migrations/007_normalize_conversation_metadata_helpers.js";
import type * as migrations_007_verify_token_usage from "../migrations/007_verify_token_usage.js";
import type * as migrations_backfill_memory_extraction from "../migrations/backfill_memory_extraction.js";
import type * as migrations_verify_dual_write from "../migrations/verify_dual_write.js";
import type * as notes from "../notes.js";
import type * as notes_generateTitle from "../notes/generateTitle.js";
import type * as notes_tags from "../notes/tags.js";
import type * as onboarding from "../onboarding.js";
import type * as projects from "../projects.js";
import type * as search from "../search.js";
import type * as search_hybrid from "../search/hybrid.js";
import type * as shares from "../shares.js";
import type * as shares_password from "../shares/password.js";
import type * as snippets from "../snippets.js";
import type * as sources from "../sources.js";
import type * as sources_enrichment from "../sources/enrichment.js";
import type * as sources_enrichment_actions from "../sources/enrichment_actions.js";
import type * as sources_operations from "../sources/operations.js";
import type * as sources_operations_actions from "../sources/operations_actions.js";
import type * as tags_admin from "../tags/admin.js";
import type * as tags_admin_queries from "../tags/admin_queries.js";
import type * as tags_embeddings from "../tags/embeddings.js";
import type * as tags_matching from "../tags/matching.js";
import type * as tags_migrations from "../tags/migrations.js";
import type * as tags_mutations from "../tags/mutations.js";
import type * as tags_queries from "../tags/queries.js";
import type * as tasks from "../tasks.js";
import type * as tasks_tags from "../tasks/tags.js";
import type * as templates from "../templates.js";
import type * as templates_builtIn from "../templates/builtIn.js";
import type * as tokens_counting from "../tokens/counting.js";
import type * as tokens_service from "../tokens/service.js";
import type * as tools_codeExecution from "../tools/codeExecution.js";
import type * as tools_fileDocument from "../tools/fileDocument.js";
import type * as tools_projectContext from "../tools/projectContext.js";
import type * as tools_projectContext_helpers from "../tools/projectContext/helpers.js";
import type * as tools_projectContext_searchFiles from "../tools/projectContext/searchFiles.js";
import type * as tools_projectContext_searchHistory from "../tools/projectContext/searchHistory.js";
import type * as tools_projectContext_searchNotes from "../tools/projectContext/searchNotes.js";
import type * as tools_projectContext_searchTasks from "../tools/projectContext/searchTasks.js";
import type * as tools_urlReader from "../tools/urlReader.js";
import type * as tools_weather from "../tools/weather.js";
import type * as tools_webSearch from "../tools/webSearch.js";
import type * as transcription from "../transcription.js";
import type * as tts from "../tts.js";
import type * as ttsCache from "../ttsCache.js";
import type * as usage from "../usage.js";
import type * as usage_checkBudget from "../usage/checkBudget.js";
import type * as usage_mutations from "../usage/mutations.js";
import type * as usage_queries from "../usage/queries.js";
import type * as users from "../users.js";
import type * as users_constants from "../users/constants.js";
import type * as users_preferences from "../users/preferences.js";
import type * as videoAnalysis from "../videoAnalysis.js";
import type * as votes from "../votes.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  admin: typeof admin;
  adminSettings: typeof adminSettings;
  "ai/generateTitle": typeof ai_generateTitle;
  "ai/modelTriage": typeof ai_modelTriage;
  "ai/taskExtraction": typeof ai_taskExtraction;
  "ai/tools/calculator": typeof ai_tools_calculator;
  "ai/tools/codeExecution": typeof ai_tools_codeExecution;
  "ai/tools/datetime": typeof ai_tools_datetime;
  "ai/tools/fileDocument": typeof ai_tools_fileDocument;
  "ai/tools/memories/index": typeof ai_tools_memories_index;
  "ai/tools/memories/memoryDelete": typeof ai_tools_memories_memoryDelete;
  "ai/tools/memories/memorySave": typeof ai_tools_memories_memorySave;
  "ai/tools/memories/memorySearch": typeof ai_tools_memories_memorySearch;
  "ai/tools/projectContext": typeof ai_tools_projectContext;
  "ai/tools/projectContext/queryProjectHistory": typeof ai_tools_projectContext_queryProjectHistory;
  "ai/tools/projectContext/searchProjectFiles": typeof ai_tools_projectContext_searchProjectFiles;
  "ai/tools/projectContext/searchProjectNotes": typeof ai_tools_projectContext_searchProjectNotes;
  "ai/tools/projectContext/searchProjectTasks": typeof ai_tools_projectContext_searchProjectTasks;
  "ai/tools/urlReader": typeof ai_tools_urlReader;
  "ai/tools/weather": typeof ai_tools_weather;
  "ai/tools/webSearch": typeof ai_tools_webSearch;
  bookmarks: typeof bookmarks;
  chat: typeof chat;
  conversations: typeof conversations;
  "conversations/actions": typeof conversations_actions;
  "conversations/hybridSearch": typeof conversations_hybridSearch;
  crons: typeof crons;
  debug: typeof debug;
  "emails/components/EmailButton": typeof emails_components_EmailButton;
  "emails/components/EmailContainer": typeof emails_components_EmailContainer;
  "emails/components/index": typeof emails_components_index;
  "emails/index": typeof emails_index;
  "emails/templates/apiCreditsExhausted": typeof emails_templates_apiCreditsExhausted;
  "emails/templates/budgetWarning": typeof emails_templates_budgetWarning;
  "emails/templates/feedbackNotification": typeof emails_templates_feedbackNotification;
  "emails/templates/index": typeof emails_templates_index;
  "emails/test/testEmails": typeof emails_test_testEmails;
  "emails/utils/index": typeof emails_utils_index;
  "emails/utils/mutations": typeof emails_utils_mutations;
  "emails/utils/send": typeof emails_utils_send;
  feedback: typeof feedback;
  "feedback/triage": typeof feedback_triage;
  files: typeof files;
  "files/chunking": typeof files_chunking;
  "files/embeddings": typeof files_embeddings;
  "files/search": typeof files_search;
  generation: typeof generation;
  "generation/image": typeof generation_image;
  http: typeof http;
  import: typeof import_;
  "jobs/actions": typeof jobs_actions;
  "jobs/crud": typeof jobs_crud;
  "lib/analytics": typeof lib_analytics;
  "lib/errorTracking": typeof lib_errorTracking;
  "lib/helpers": typeof lib_helpers;
  "lib/prompts/base": typeof lib_prompts_base;
  "lib/prompts/formatting": typeof lib_prompts_formatting;
  "lib/prompts/index": typeof lib_prompts_index;
  "lib/prompts/operational/imageGeneration": typeof lib_prompts_operational_imageGeneration;
  "lib/prompts/operational/memoryConsolidation": typeof lib_prompts_operational_memoryConsolidation;
  "lib/prompts/operational/memoryExtraction": typeof lib_prompts_operational_memoryExtraction;
  "lib/prompts/operational/memoryRephrase": typeof lib_prompts_operational_memoryRephrase;
  "lib/prompts/operational/memoryRerank": typeof lib_prompts_operational_memoryRerank;
  "lib/prompts/operational/summarization": typeof lib_prompts_operational_summarization;
  "lib/prompts/operational/tagExtraction": typeof lib_prompts_operational_tagExtraction;
  "lib/prompts/operational/titleGeneration": typeof lib_prompts_operational_titleGeneration;
  "lib/prompts/templates/builtIn": typeof lib_prompts_templates_builtIn;
  "lib/userSync": typeof lib_userSync;
  memories: typeof memories;
  "memories/delete": typeof memories_delete;
  "memories/expiration": typeof memories_expiration;
  "memories/extract": typeof memories_extract;
  "memories/mutations": typeof memories_mutations;
  "memories/save": typeof memories_save;
  "memories/search": typeof memories_search;
  messages: typeof messages;
  "messages/embeddings": typeof messages_embeddings;
  "migrations/001_normalize_message_attachments": typeof migrations_001_normalize_message_attachments;
  "migrations/003_normalize_project_conversations": typeof migrations_003_normalize_project_conversations;
  "migrations/003_normalize_project_conversations_actions": typeof migrations_003_normalize_project_conversations_actions;
  "migrations/004_remove_conversationIds_field": typeof migrations_004_remove_conversationIds_field;
  "migrations/004_remove_conversationIds_field_actions": typeof migrations_004_remove_conversationIds_field_actions;
  "migrations/005_backfill_tags": typeof migrations_005_backfill_tags;
  "migrations/005_require_message_model": typeof migrations_005_require_message_model;
  "migrations/005_require_message_model_actions": typeof migrations_005_require_message_model_actions;
  "migrations/006_user_preferences_backfill": typeof migrations_006_user_preferences_backfill;
  "migrations/006_user_preferences_backfill_actions": typeof migrations_006_user_preferences_backfill_actions;
  "migrations/007_normalize_conversation_metadata": typeof migrations_007_normalize_conversation_metadata;
  "migrations/007_normalize_conversation_metadata_helpers": typeof migrations_007_normalize_conversation_metadata_helpers;
  "migrations/007_verify_token_usage": typeof migrations_007_verify_token_usage;
  "migrations/backfill_memory_extraction": typeof migrations_backfill_memory_extraction;
  "migrations/verify_dual_write": typeof migrations_verify_dual_write;
  notes: typeof notes;
  "notes/generateTitle": typeof notes_generateTitle;
  "notes/tags": typeof notes_tags;
  onboarding: typeof onboarding;
  projects: typeof projects;
  search: typeof search;
  "search/hybrid": typeof search_hybrid;
  shares: typeof shares;
  "shares/password": typeof shares_password;
  snippets: typeof snippets;
  sources: typeof sources;
  "sources/enrichment": typeof sources_enrichment;
  "sources/enrichment_actions": typeof sources_enrichment_actions;
  "sources/operations": typeof sources_operations;
  "sources/operations_actions": typeof sources_operations_actions;
  "tags/admin": typeof tags_admin;
  "tags/admin_queries": typeof tags_admin_queries;
  "tags/embeddings": typeof tags_embeddings;
  "tags/matching": typeof tags_matching;
  "tags/migrations": typeof tags_migrations;
  "tags/mutations": typeof tags_mutations;
  "tags/queries": typeof tags_queries;
  tasks: typeof tasks;
  "tasks/tags": typeof tasks_tags;
  templates: typeof templates;
  "templates/builtIn": typeof templates_builtIn;
  "tokens/counting": typeof tokens_counting;
  "tokens/service": typeof tokens_service;
  "tools/codeExecution": typeof tools_codeExecution;
  "tools/fileDocument": typeof tools_fileDocument;
  "tools/projectContext": typeof tools_projectContext;
  "tools/projectContext/helpers": typeof tools_projectContext_helpers;
  "tools/projectContext/searchFiles": typeof tools_projectContext_searchFiles;
  "tools/projectContext/searchHistory": typeof tools_projectContext_searchHistory;
  "tools/projectContext/searchNotes": typeof tools_projectContext_searchNotes;
  "tools/projectContext/searchTasks": typeof tools_projectContext_searchTasks;
  "tools/urlReader": typeof tools_urlReader;
  "tools/weather": typeof tools_weather;
  "tools/webSearch": typeof tools_webSearch;
  transcription: typeof transcription;
  tts: typeof tts;
  ttsCache: typeof ttsCache;
  usage: typeof usage;
  "usage/checkBudget": typeof usage_checkBudget;
  "usage/mutations": typeof usage_mutations;
  "usage/queries": typeof usage_queries;
  users: typeof users;
  "users/constants": typeof users_constants;
  "users/preferences": typeof users_preferences;
  videoAnalysis: typeof videoAnalysis;
  votes: typeof votes;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  resend: {
    lib: {
      cancelEmail: FunctionReference<
        "mutation",
        "internal",
        { emailId: string },
        null
      >;
      cleanupAbandonedEmails: FunctionReference<
        "mutation",
        "internal",
        { olderThan?: number },
        null
      >;
      cleanupOldEmails: FunctionReference<
        "mutation",
        "internal",
        { olderThan?: number },
        null
      >;
      createManualEmail: FunctionReference<
        "mutation",
        "internal",
        {
          from: string;
          headers?: Array<{ name: string; value: string }>;
          replyTo?: Array<string>;
          subject: string;
          to: Array<string> | string;
        },
        string
      >;
      get: FunctionReference<
        "query",
        "internal",
        { emailId: string },
        {
          bcc?: Array<string>;
          bounced?: boolean;
          cc?: Array<string>;
          clicked?: boolean;
          complained: boolean;
          createdAt: number;
          deliveryDelayed?: boolean;
          errorMessage?: string;
          failed?: boolean;
          finalizedAt: number;
          from: string;
          headers?: Array<{ name: string; value: string }>;
          html?: string;
          opened: boolean;
          replyTo: Array<string>;
          resendId?: string;
          segment: number;
          status:
            | "waiting"
            | "queued"
            | "cancelled"
            | "sent"
            | "delivered"
            | "delivery_delayed"
            | "bounced"
            | "failed";
          subject?: string;
          template?: {
            id: string;
            variables?: Record<string, string | number>;
          };
          text?: string;
          to: Array<string>;
        } | null
      >;
      getStatus: FunctionReference<
        "query",
        "internal",
        { emailId: string },
        {
          bounced: boolean;
          clicked: boolean;
          complained: boolean;
          deliveryDelayed: boolean;
          errorMessage: string | null;
          failed: boolean;
          opened: boolean;
          status:
            | "waiting"
            | "queued"
            | "cancelled"
            | "sent"
            | "delivered"
            | "delivery_delayed"
            | "bounced"
            | "failed";
        } | null
      >;
      handleEmailEvent: FunctionReference<
        "mutation",
        "internal",
        { event: any },
        null
      >;
      sendEmail: FunctionReference<
        "mutation",
        "internal",
        {
          bcc?: Array<string>;
          cc?: Array<string>;
          from: string;
          headers?: Array<{ name: string; value: string }>;
          html?: string;
          options: {
            apiKey: string;
            initialBackoffMs: number;
            onEmailEvent?: { fnHandle: string };
            retryAttempts: number;
            testMode: boolean;
          };
          replyTo?: Array<string>;
          subject?: string;
          template?: {
            id: string;
            variables?: Record<string, string | number>;
          };
          text?: string;
          to: Array<string>;
        },
        string
      >;
      updateManualEmail: FunctionReference<
        "mutation",
        "internal",
        {
          emailId: string;
          errorMessage?: string;
          resendId?: string;
          status:
            | "waiting"
            | "queued"
            | "cancelled"
            | "sent"
            | "delivered"
            | "delivery_delayed"
            | "bounced"
            | "failed";
        },
        null
      >;
    };
  };
};
