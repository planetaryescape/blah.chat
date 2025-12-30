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
import type * as admin_byod from "../admin/byod.js";
import type * as adminSettings from "../adminSettings.js";
import type * as ai_generateTitle from "../ai/generateTitle.js";
import type * as ai_modelTriage from "../ai/modelTriage.js";
import type * as ai_taskExtraction from "../ai/taskExtraction.js";
import type * as ai_tools_askForClarification from "../ai/tools/askForClarification.js";
import type * as ai_tools_calculator from "../ai/tools/calculator.js";
import type * as ai_tools_codeExecution from "../ai/tools/codeExecution.js";
import type * as ai_tools_createDocument from "../ai/tools/createDocument.js";
import type * as ai_tools_datetime from "../ai/tools/datetime.js";
import type * as ai_tools_documentMode from "../ai/tools/documentMode.js";
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
import type * as ai_tools_readDocument from "../ai/tools/readDocument.js";
import type * as ai_tools_resolveConflict from "../ai/tools/resolveConflict.js";
import type * as ai_tools_search_index from "../ai/tools/search/index.js";
import type * as ai_tools_search_queryHistory from "../ai/tools/search/queryHistory.js";
import type * as ai_tools_search_searchAll from "../ai/tools/search/searchAll.js";
import type * as ai_tools_search_searchFiles from "../ai/tools/search/searchFiles.js";
import type * as ai_tools_search_searchNotes from "../ai/tools/search/searchNotes.js";
import type * as ai_tools_search_searchTasks from "../ai/tools/search/searchTasks.js";
import type * as ai_tools_taskManager from "../ai/tools/taskManager.js";
import type * as ai_tools_updateDocument from "../ai/tools/updateDocument.js";
import type * as ai_tools_urlReader from "../ai/tools/urlReader.js";
import type * as ai_tools_weather from "../ai/tools/weather.js";
import type * as ai_tools_youtubeVideo from "../ai/tools/youtubeVideo.js";
import type * as bible from "../bible.js";
import type * as bookmarks from "../bookmarks.js";
import type * as byod_credentials from "../byod/credentials.js";
import type * as byod_deploy from "../byod/deploy.js";
import type * as byod_healthCheck from "../byod/healthCheck.js";
import type * as byod_migrationRunner from "../byod/migrationRunner.js";
import type * as byod_migrations_001_initial from "../byod/migrations/001_initial.js";
import type * as byod_migrations_index from "../byod/migrations/index.js";
import type * as byod_saveCredentials from "../byod/saveCredentials.js";
import type * as byod_testConnection from "../byod/testConnection.js";
import type * as byok_credentials from "../byok/credentials.js";
import type * as byok_helpers from "../byok/helpers.js";
import type * as byok_saveCredentials from "../byok/saveCredentials.js";
import type * as canvas_documents from "../canvas/documents.js";
import type * as canvas_history from "../canvas/history.js";
import type * as chat from "../chat.js";
import type * as conversations from "../conversations.js";
import type * as conversations_actions from "../conversations/actions.js";
import type * as conversations_branching from "../conversations/branching.js";
import type * as conversations_bulk from "../conversations/bulk.js";
import type * as conversations_consolidation from "../conversations/consolidation.js";
import type * as conversations_hybridSearch from "../conversations/hybridSearch.js";
import type * as conversations_internal from "../conversations/internal.js";
import type * as conversations_tokens from "../conversations/tokens.js";
import type * as crons from "../crons.js";
import type * as debug from "../debug.js";
import type * as designTemplates from "../designTemplates.js";
import type * as designTemplates_analyze from "../designTemplates/analyze.js";
import type * as emails_components_EmailButton from "../emails/components/EmailButton.js";
import type * as emails_components_EmailContainer from "../emails/components/EmailContainer.js";
import type * as emails_components_index from "../emails/components/index.js";
import type * as emails_index from "../emails/index.js";
import type * as emails_templates_apiCreditsExhausted from "../emails/templates/apiCreditsExhausted.js";
import type * as emails_templates_budgetWarning from "../emails/templates/budgetWarning.js";
import type * as emails_templates_byodUpdateRequired from "../emails/templates/byodUpdateRequired.js";
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
import type * as files_extraction from "../files/extraction.js";
import type * as files_search from "../files/search.js";
import type * as generation from "../generation.js";
import type * as generation_attachments from "../generation/attachments.js";
import type * as generation_image from "../generation/image.js";
import type * as generation_index from "../generation/index.js";
import type * as generation_slideImage from "../generation/slideImage.js";
import type * as generation_sources from "../generation/sources.js";
import type * as generation_tools from "../generation/tools.js";
import type * as http from "../http.js";
import type * as import_ from "../import.js";
import type * as incognito from "../incognito.js";
import type * as jobs_actions from "../jobs/actions.js";
import type * as jobs_crud from "../jobs/crud.js";
import type * as knowledgeBank_constants from "../knowledgeBank/constants.js";
import type * as knowledgeBank_index from "../knowledgeBank/index.js";
import type * as knowledgeBank_process from "../knowledgeBank/process.js";
import type * as knowledgeBank_search from "../knowledgeBank/search.js";
import type * as knowledgeBank_tool from "../knowledgeBank/tool.js";
import type * as lib_analytics from "../lib/analytics.js";
import type * as lib_budgetTracker from "../lib/budgetTracker.js";
import type * as lib_encryption from "../lib/encryption.js";
import type * as lib_errorTracking from "../lib/errorTracking.js";
import type * as lib_helpers from "../lib/helpers.js";
import type * as lib_pdf_convertToPdf from "../lib/pdf/convertToPdf.js";
import type * as lib_prompts_base from "../lib/prompts/base.js";
import type * as lib_prompts_formatting from "../lib/prompts/formatting.js";
import type * as lib_prompts_index from "../lib/prompts/index.js";
import type * as lib_prompts_operational_designSystem from "../lib/prompts/operational/designSystem.js";
import type * as lib_prompts_operational_documentMode from "../lib/prompts/operational/documentMode.js";
import type * as lib_prompts_operational_imageGeneration from "../lib/prompts/operational/imageGeneration.js";
import type * as lib_prompts_operational_memoryConsolidation from "../lib/prompts/operational/memoryConsolidation.js";
import type * as lib_prompts_operational_memoryExtraction from "../lib/prompts/operational/memoryExtraction.js";
import type * as lib_prompts_operational_memoryRephrase from "../lib/prompts/operational/memoryRephrase.js";
import type * as lib_prompts_operational_memoryRerank from "../lib/prompts/operational/memoryRerank.js";
import type * as lib_prompts_operational_outlineFeedback from "../lib/prompts/operational/outlineFeedback.js";
import type * as lib_prompts_operational_presentationDescription from "../lib/prompts/operational/presentationDescription.js";
import type * as lib_prompts_operational_slideImage from "../lib/prompts/operational/slideImage.js";
import type * as lib_prompts_operational_slidesOutline from "../lib/prompts/operational/slidesOutline.js";
import type * as lib_prompts_operational_summarization from "../lib/prompts/operational/summarization.js";
import type * as lib_prompts_operational_tagExtraction from "../lib/prompts/operational/tagExtraction.js";
import type * as lib_prompts_operational_templateAnalysis from "../lib/prompts/operational/templateAnalysis.js";
import type * as lib_prompts_operational_titleGeneration from "../lib/prompts/operational/titleGeneration.js";
import type * as lib_prompts_operational_visualDirection from "../lib/prompts/operational/visualDirection.js";
import type * as lib_prompts_operational_visualFormatting from "../lib/prompts/operational/visualFormatting.js";
import type * as lib_prompts_systemBuilder from "../lib/prompts/systemBuilder.js";
import type * as lib_prompts_templates_builtIn from "../lib/prompts/templates/builtIn.js";
import type * as lib_slides_parseOutline from "../lib/slides/parseOutline.js";
import type * as lib_userSync from "../lib/userSync.js";
import type * as lib_utils_cascade from "../lib/utils/cascade.js";
import type * as lib_utils_memory from "../lib/utils/memory.js";
import type * as lib_utils_search from "../lib/utils/search.js";
import type * as memories from "../memories.js";
import type * as memories_consolidation from "../memories/consolidation.js";
import type * as memories_delete from "../memories/delete.js";
import type * as memories_expiration from "../memories/expiration.js";
import type * as memories_extract from "../memories/extract.js";
import type * as memories_mutations from "../memories/mutations.js";
import type * as memories_queries from "../memories/queries.js";
import type * as memories_save from "../memories/save.js";
import type * as memories_search from "../memories/search.js";
import type * as messages from "../messages.js";
import type * as messages_attachments from "../messages/attachments.js";
import type * as messages_embeddings from "../messages/embeddings.js";
import type * as messages_thinking from "../messages/thinking.js";
import type * as messages_toolCalls from "../messages/toolCalls.js";
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
import type * as migrations_008_backfill_presentation_conversations from "../migrations/008_backfill_presentation_conversations.js";
import type * as migrations_009_backfill_usage_features from "../migrations/009_backfill_usage_features.js";
import type * as migrations_010_fix_gemini_image_pricing from "../migrations/010_fix_gemini_image_pricing.js";
import type * as migrations_011_migrate_project_files_to_kb from "../migrations/011_migrate_project_files_to_kb.js";
import type * as migrations_012_rechunk_knowledge from "../migrations/012_rechunk_knowledge.js";
import type * as migrations_backfill_memory_extraction from "../migrations/backfill_memory_extraction.js";
import type * as migrations_verify_dual_write from "../migrations/verify_dual_write.js";
import type * as notes from "../notes.js";
import type * as notes_embeddings from "../notes/embeddings.js";
import type * as notes_generateTitle from "../notes/generateTitle.js";
import type * as notes_tags from "../notes/tags.js";
import type * as notifications from "../notifications.js";
import type * as onboarding from "../onboarding.js";
import type * as outlineItems from "../outlineItems.js";
import type * as presentationSessions from "../presentationSessions.js";
import type * as presentations from "../presentations.js";
import type * as presentations_description from "../presentations/description.js";
import type * as presentations_designSystem from "../presentations/designSystem.js";
import type * as presentations_embeddings from "../presentations/embeddings.js";
import type * as presentations_export from "../presentations/export.js";
import type * as presentations_generateSlides from "../presentations/generateSlides.js";
import type * as presentations_internal from "../presentations/internal.js";
import type * as presentations_outline from "../presentations/outline.js";
import type * as presentations_retry from "../presentations/retry.js";
import type * as presentations_slides from "../presentations/slides.js";
import type * as projects from "../projects.js";
import type * as projects_activity from "../projects/activity.js";
import type * as projects_files from "../projects/files.js";
import type * as projects_internal from "../projects/internal.js";
import type * as projects_notes from "../projects/notes.js";
import type * as projects_resources from "../projects/resources.js";
import type * as search from "../search.js";
import type * as search_hybrid from "../search/hybrid.js";
import type * as search_presentations from "../search/presentations.js";
import type * as settings_apiKeys from "../settings/apiKeys.js";
import type * as shares from "../shares.js";
import type * as shares_fork from "../shares/fork.js";
import type * as shares_internal from "../shares/internal.js";
import type * as shares_password from "../shares/password.js";
import type * as snippets from "../snippets.js";
import type * as sources from "../sources.js";
import type * as sources_enrichment from "../sources/enrichment.js";
import type * as sources_enrichment_actions from "../sources/enrichment_actions.js";
import type * as sources_operations from "../sources/operations.js";
import type * as sources_operations_actions from "../sources/operations_actions.js";
import type * as storage from "../storage.js";
import type * as tags_admin from "../tags/admin.js";
import type * as tags_admin_queries from "../tags/admin_queries.js";
import type * as tags_embeddings from "../tags/embeddings.js";
import type * as tags_matching from "../tags/matching.js";
import type * as tags_migrations from "../tags/migrations.js";
import type * as tags_mutations from "../tags/mutations.js";
import type * as tags_queries from "../tags/queries.js";
import type * as tasks from "../tasks.js";
import type * as tasks_embeddings from "../tasks/embeddings.js";
import type * as tasks_tags from "../tasks/tags.js";
import type * as telemetry_heartbeat from "../telemetry/heartbeat.js";
import type * as telemetry_instanceId from "../telemetry/instanceId.js";
import type * as telemetry_stats from "../telemetry/stats.js";
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
import type * as tools_search_index from "../tools/search/index.js";
import type * as tools_search_queryHistory from "../tools/search/queryHistory.js";
import type * as tools_search_searchAll from "../tools/search/searchAll.js";
import type * as tools_search_searchFiles from "../tools/search/searchFiles.js";
import type * as tools_search_searchNotes from "../tools/search/searchNotes.js";
import type * as tools_search_searchTasks from "../tools/search/searchTasks.js";
import type * as tools_taskManager from "../tools/taskManager.js";
import type * as tools_urlReader from "../tools/urlReader.js";
import type * as tools_weather from "../tools/weather.js";
import type * as tools_youtubeVideo from "../tools/youtubeVideo.js";
import type * as transcription from "../transcription.js";
import type * as tts from "../tts.js";
import type * as ttsCache from "../ttsCache.js";
import type * as usage from "../usage.js";
import type * as usage_checkBudget from "../usage/checkBudget.js";
import type * as usage_mutations from "../usage/mutations.js";
import type * as usage_queries from "../usage/queries.js";
import type * as usage_rankings from "../usage/rankings.js";
import type * as users from "../users.js";
import type * as users_constants from "../users/constants.js";
import type * as users_preferences from "../users/preferences.js";
import type * as votes from "../votes.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  admin: typeof admin;
  "admin/byod": typeof admin_byod;
  adminSettings: typeof adminSettings;
  "ai/generateTitle": typeof ai_generateTitle;
  "ai/modelTriage": typeof ai_modelTriage;
  "ai/taskExtraction": typeof ai_taskExtraction;
  "ai/tools/askForClarification": typeof ai_tools_askForClarification;
  "ai/tools/calculator": typeof ai_tools_calculator;
  "ai/tools/codeExecution": typeof ai_tools_codeExecution;
  "ai/tools/createDocument": typeof ai_tools_createDocument;
  "ai/tools/datetime": typeof ai_tools_datetime;
  "ai/tools/documentMode": typeof ai_tools_documentMode;
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
  "ai/tools/readDocument": typeof ai_tools_readDocument;
  "ai/tools/resolveConflict": typeof ai_tools_resolveConflict;
  "ai/tools/search/index": typeof ai_tools_search_index;
  "ai/tools/search/queryHistory": typeof ai_tools_search_queryHistory;
  "ai/tools/search/searchAll": typeof ai_tools_search_searchAll;
  "ai/tools/search/searchFiles": typeof ai_tools_search_searchFiles;
  "ai/tools/search/searchNotes": typeof ai_tools_search_searchNotes;
  "ai/tools/search/searchTasks": typeof ai_tools_search_searchTasks;
  "ai/tools/taskManager": typeof ai_tools_taskManager;
  "ai/tools/updateDocument": typeof ai_tools_updateDocument;
  "ai/tools/urlReader": typeof ai_tools_urlReader;
  "ai/tools/weather": typeof ai_tools_weather;
  "ai/tools/youtubeVideo": typeof ai_tools_youtubeVideo;
  bible: typeof bible;
  bookmarks: typeof bookmarks;
  "byod/credentials": typeof byod_credentials;
  "byod/deploy": typeof byod_deploy;
  "byod/healthCheck": typeof byod_healthCheck;
  "byod/migrationRunner": typeof byod_migrationRunner;
  "byod/migrations/001_initial": typeof byod_migrations_001_initial;
  "byod/migrations/index": typeof byod_migrations_index;
  "byod/saveCredentials": typeof byod_saveCredentials;
  "byod/testConnection": typeof byod_testConnection;
  "byok/credentials": typeof byok_credentials;
  "byok/helpers": typeof byok_helpers;
  "byok/saveCredentials": typeof byok_saveCredentials;
  "canvas/documents": typeof canvas_documents;
  "canvas/history": typeof canvas_history;
  chat: typeof chat;
  conversations: typeof conversations;
  "conversations/actions": typeof conversations_actions;
  "conversations/branching": typeof conversations_branching;
  "conversations/bulk": typeof conversations_bulk;
  "conversations/consolidation": typeof conversations_consolidation;
  "conversations/hybridSearch": typeof conversations_hybridSearch;
  "conversations/internal": typeof conversations_internal;
  "conversations/tokens": typeof conversations_tokens;
  crons: typeof crons;
  debug: typeof debug;
  designTemplates: typeof designTemplates;
  "designTemplates/analyze": typeof designTemplates_analyze;
  "emails/components/EmailButton": typeof emails_components_EmailButton;
  "emails/components/EmailContainer": typeof emails_components_EmailContainer;
  "emails/components/index": typeof emails_components_index;
  "emails/index": typeof emails_index;
  "emails/templates/apiCreditsExhausted": typeof emails_templates_apiCreditsExhausted;
  "emails/templates/budgetWarning": typeof emails_templates_budgetWarning;
  "emails/templates/byodUpdateRequired": typeof emails_templates_byodUpdateRequired;
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
  "files/extraction": typeof files_extraction;
  "files/search": typeof files_search;
  generation: typeof generation;
  "generation/attachments": typeof generation_attachments;
  "generation/image": typeof generation_image;
  "generation/index": typeof generation_index;
  "generation/slideImage": typeof generation_slideImage;
  "generation/sources": typeof generation_sources;
  "generation/tools": typeof generation_tools;
  http: typeof http;
  import: typeof import_;
  incognito: typeof incognito;
  "jobs/actions": typeof jobs_actions;
  "jobs/crud": typeof jobs_crud;
  "knowledgeBank/constants": typeof knowledgeBank_constants;
  "knowledgeBank/index": typeof knowledgeBank_index;
  "knowledgeBank/process": typeof knowledgeBank_process;
  "knowledgeBank/search": typeof knowledgeBank_search;
  "knowledgeBank/tool": typeof knowledgeBank_tool;
  "lib/analytics": typeof lib_analytics;
  "lib/budgetTracker": typeof lib_budgetTracker;
  "lib/encryption": typeof lib_encryption;
  "lib/errorTracking": typeof lib_errorTracking;
  "lib/helpers": typeof lib_helpers;
  "lib/pdf/convertToPdf": typeof lib_pdf_convertToPdf;
  "lib/prompts/base": typeof lib_prompts_base;
  "lib/prompts/formatting": typeof lib_prompts_formatting;
  "lib/prompts/index": typeof lib_prompts_index;
  "lib/prompts/operational/designSystem": typeof lib_prompts_operational_designSystem;
  "lib/prompts/operational/documentMode": typeof lib_prompts_operational_documentMode;
  "lib/prompts/operational/imageGeneration": typeof lib_prompts_operational_imageGeneration;
  "lib/prompts/operational/memoryConsolidation": typeof lib_prompts_operational_memoryConsolidation;
  "lib/prompts/operational/memoryExtraction": typeof lib_prompts_operational_memoryExtraction;
  "lib/prompts/operational/memoryRephrase": typeof lib_prompts_operational_memoryRephrase;
  "lib/prompts/operational/memoryRerank": typeof lib_prompts_operational_memoryRerank;
  "lib/prompts/operational/outlineFeedback": typeof lib_prompts_operational_outlineFeedback;
  "lib/prompts/operational/presentationDescription": typeof lib_prompts_operational_presentationDescription;
  "lib/prompts/operational/slideImage": typeof lib_prompts_operational_slideImage;
  "lib/prompts/operational/slidesOutline": typeof lib_prompts_operational_slidesOutline;
  "lib/prompts/operational/summarization": typeof lib_prompts_operational_summarization;
  "lib/prompts/operational/tagExtraction": typeof lib_prompts_operational_tagExtraction;
  "lib/prompts/operational/templateAnalysis": typeof lib_prompts_operational_templateAnalysis;
  "lib/prompts/operational/titleGeneration": typeof lib_prompts_operational_titleGeneration;
  "lib/prompts/operational/visualDirection": typeof lib_prompts_operational_visualDirection;
  "lib/prompts/operational/visualFormatting": typeof lib_prompts_operational_visualFormatting;
  "lib/prompts/systemBuilder": typeof lib_prompts_systemBuilder;
  "lib/prompts/templates/builtIn": typeof lib_prompts_templates_builtIn;
  "lib/slides/parseOutline": typeof lib_slides_parseOutline;
  "lib/userSync": typeof lib_userSync;
  "lib/utils/cascade": typeof lib_utils_cascade;
  "lib/utils/memory": typeof lib_utils_memory;
  "lib/utils/search": typeof lib_utils_search;
  memories: typeof memories;
  "memories/consolidation": typeof memories_consolidation;
  "memories/delete": typeof memories_delete;
  "memories/expiration": typeof memories_expiration;
  "memories/extract": typeof memories_extract;
  "memories/mutations": typeof memories_mutations;
  "memories/queries": typeof memories_queries;
  "memories/save": typeof memories_save;
  "memories/search": typeof memories_search;
  messages: typeof messages;
  "messages/attachments": typeof messages_attachments;
  "messages/embeddings": typeof messages_embeddings;
  "messages/thinking": typeof messages_thinking;
  "messages/toolCalls": typeof messages_toolCalls;
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
  "migrations/008_backfill_presentation_conversations": typeof migrations_008_backfill_presentation_conversations;
  "migrations/009_backfill_usage_features": typeof migrations_009_backfill_usage_features;
  "migrations/010_fix_gemini_image_pricing": typeof migrations_010_fix_gemini_image_pricing;
  "migrations/011_migrate_project_files_to_kb": typeof migrations_011_migrate_project_files_to_kb;
  "migrations/012_rechunk_knowledge": typeof migrations_012_rechunk_knowledge;
  "migrations/backfill_memory_extraction": typeof migrations_backfill_memory_extraction;
  "migrations/verify_dual_write": typeof migrations_verify_dual_write;
  notes: typeof notes;
  "notes/embeddings": typeof notes_embeddings;
  "notes/generateTitle": typeof notes_generateTitle;
  "notes/tags": typeof notes_tags;
  notifications: typeof notifications;
  onboarding: typeof onboarding;
  outlineItems: typeof outlineItems;
  presentationSessions: typeof presentationSessions;
  presentations: typeof presentations;
  "presentations/description": typeof presentations_description;
  "presentations/designSystem": typeof presentations_designSystem;
  "presentations/embeddings": typeof presentations_embeddings;
  "presentations/export": typeof presentations_export;
  "presentations/generateSlides": typeof presentations_generateSlides;
  "presentations/internal": typeof presentations_internal;
  "presentations/outline": typeof presentations_outline;
  "presentations/retry": typeof presentations_retry;
  "presentations/slides": typeof presentations_slides;
  projects: typeof projects;
  "projects/activity": typeof projects_activity;
  "projects/files": typeof projects_files;
  "projects/internal": typeof projects_internal;
  "projects/notes": typeof projects_notes;
  "projects/resources": typeof projects_resources;
  search: typeof search;
  "search/hybrid": typeof search_hybrid;
  "search/presentations": typeof search_presentations;
  "settings/apiKeys": typeof settings_apiKeys;
  shares: typeof shares;
  "shares/fork": typeof shares_fork;
  "shares/internal": typeof shares_internal;
  "shares/password": typeof shares_password;
  snippets: typeof snippets;
  sources: typeof sources;
  "sources/enrichment": typeof sources_enrichment;
  "sources/enrichment_actions": typeof sources_enrichment_actions;
  "sources/operations": typeof sources_operations;
  "sources/operations_actions": typeof sources_operations_actions;
  storage: typeof storage;
  "tags/admin": typeof tags_admin;
  "tags/admin_queries": typeof tags_admin_queries;
  "tags/embeddings": typeof tags_embeddings;
  "tags/matching": typeof tags_matching;
  "tags/migrations": typeof tags_migrations;
  "tags/mutations": typeof tags_mutations;
  "tags/queries": typeof tags_queries;
  tasks: typeof tasks;
  "tasks/embeddings": typeof tasks_embeddings;
  "tasks/tags": typeof tasks_tags;
  "telemetry/heartbeat": typeof telemetry_heartbeat;
  "telemetry/instanceId": typeof telemetry_instanceId;
  "telemetry/stats": typeof telemetry_stats;
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
  "tools/search/index": typeof tools_search_index;
  "tools/search/queryHistory": typeof tools_search_queryHistory;
  "tools/search/searchAll": typeof tools_search_searchAll;
  "tools/search/searchFiles": typeof tools_search_searchFiles;
  "tools/search/searchNotes": typeof tools_search_searchNotes;
  "tools/search/searchTasks": typeof tools_search_searchTasks;
  "tools/taskManager": typeof tools_taskManager;
  "tools/urlReader": typeof tools_urlReader;
  "tools/weather": typeof tools_weather;
  "tools/youtubeVideo": typeof tools_youtubeVideo;
  transcription: typeof transcription;
  tts: typeof tts;
  ttsCache: typeof ttsCache;
  usage: typeof usage;
  "usage/checkBudget": typeof usage_checkBudget;
  "usage/mutations": typeof usage_mutations;
  "usage/queries": typeof usage_queries;
  "usage/rankings": typeof usage_rankings;
  users: typeof users;
  "users/constants": typeof users_constants;
  "users/preferences": typeof users_preferences;
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
