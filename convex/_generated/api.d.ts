/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as ai_generateTitle from "../ai/generateTitle.js";
import type * as chat from "../chat.js";
import type * as conversations from "../conversations.js";
import type * as files from "../files.js";
import type * as generation from "../generation.js";
import type * as lib_userSync from "../lib/userSync.js";
import type * as memories from "../memories.js";
import type * as memories_extract from "../memories/extract.js";
import type * as messages from "../messages.js";
import type * as messages_embeddings from "../messages/embeddings.js";
import type * as projects from "../projects.js";
import type * as search from "../search.js";
import type * as search_hybrid from "../search/hybrid.js";
import type * as templates from "../templates.js";
import type * as templates_builtIn from "../templates/builtIn.js";
import type * as usage from "../usage.js";
import type * as usage_checkBudget from "../usage/checkBudget.js";
import type * as usage_queries from "../usage/queries.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  "ai/generateTitle": typeof ai_generateTitle;
  chat: typeof chat;
  conversations: typeof conversations;
  files: typeof files;
  generation: typeof generation;
  "lib/userSync": typeof lib_userSync;
  memories: typeof memories;
  "memories/extract": typeof memories_extract;
  messages: typeof messages;
  "messages/embeddings": typeof messages_embeddings;
  projects: typeof projects;
  search: typeof search;
  "search/hybrid": typeof search_hybrid;
  templates: typeof templates;
  "templates/builtIn": typeof templates_builtIn;
  usage: typeof usage;
  "usage/checkBudget": typeof usage_checkBudget;
  "usage/queries": typeof usage_queries;
  users: typeof users;
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

export declare const components: {};
