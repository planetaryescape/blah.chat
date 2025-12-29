"use node";

import type { ModelMessage } from "ai";
import type { ModelConfig } from "@/lib/ai/utils";
import { api, internal } from "../../_generated/api";
import type { Doc, Id } from "../../_generated/dataModel";
import type { ActionCtx } from "../../_generated/server";
import { getKnowledgeBankSystemPrompt } from "../../knowledgeBank/tool";
import {
  type BudgetState,
  formatStatus,
  isContextGettingFull,
  shouldSuggestAskUser,
} from "../budgetTracker";
import { getBasePrompt } from "./base";
import { formatMemoriesByCategory, truncateMemories } from "./formatting";
import type { MemoryExtractionLevel } from "./operational/memoryExtraction";

export interface BuildSystemPromptsArgs {
  userId: Id<"users">;
  conversationId: Id<"conversations">;
  userMessage: string;
  modelConfig: ModelConfig;
  hasFunctionCalling: boolean;
  prefetchedMemories: string | null;
  memoryExtractionLevel: MemoryExtractionLevel;
  /** Budget state for context-aware prompts (Phase 3) */
  budgetState?: BudgetState;
}

export interface BuildSystemPromptsResult {
  messages: ModelMessage[];
  memoryContent: string | null;
}

/**
 * Build system prompts from multiple sources
 * ORDER MATTERS: Later messages have higher effective priority (recency bias in LLMs)
 * Structure: Base (foundation) → Context → User Preferences (highest priority, last)
 */
export async function buildSystemPrompts(
  ctx: ActionCtx,
  args: BuildSystemPromptsArgs,
): Promise<BuildSystemPromptsResult> {
  const systemMessages: ModelMessage[] = [];
  let memoryContentForTracking: string | null = null;

  // Parallelize context queries (user, project, conversation)
  const [user, conversation] = (await Promise.all([
    // @ts-ignore - TypeScript recursion limit with helper queries
    ctx.runQuery(internal.lib.helpers.getCurrentUser, {}),
    // @ts-ignore - TypeScript recursion limit with helper queries
    ctx.runQuery(internal.lib.helpers.getConversation, {
      id: args.conversationId,
    }),
  ])) as [Doc<"users"> | null, Doc<"conversations"> | null];

  // Incognito blank slate: skip custom instructions and memories when configured
  const isBlankSlate =
    conversation?.isIncognito &&
    conversation?.incognitoSettings?.applyCustomInstructions === false;

  // Load custom instructions early (needed for base prompt conditional tone)
  // Phase 4: Load from new preference system
  const customInstructions = user
    ? await ctx.runQuery(
        // @ts-ignore - Type depth exceeded with complex Convex query (85+ modules)
        api.users.getUserPreference,
        {
          key: "customInstructions",
        },
      )
    : null;

  // === 1. BASE IDENTITY (foundation) ===
  // Comes first to establish baseline behavior, which user preferences can override
  const currentDate = new Date().toISOString().split("T")[0]; // YYYY-MM-DD format
  const basePromptOptions = {
    modelConfig: args.modelConfig,
    hasFunctionCalling: args.hasFunctionCalling,
    prefetchedMemories: args.prefetchedMemories,
    currentDate,
    customInstructions: customInstructions, // Pass to conditionally modify tone section
    memoryExtractionLevel: args.memoryExtractionLevel,
  };
  const basePrompt = getBasePrompt(basePromptOptions);

  systemMessages.push({
    role: "system",
    content: basePrompt,
  });

  // === 2. IDENTITY MEMORIES ===
  // Skip for incognito blank slate mode
  if (!isBlankSlate) {
    try {
      const identityMemories: Doc<"memories">[] = await ctx.runQuery(
        internal.memories.search.getIdentityMemories,
        {
          userId: args.userId,
          limit: 20,
        },
      );

      if (identityMemories.length > 0) {
        // Calculate 10% budget for identity memories (conservative)
        const maxMemoryTokens = Math.floor(
          args.modelConfig.contextWindow * 0.1,
        );

        // Truncate by priority
        const truncated = truncateMemories(identityMemories, maxMemoryTokens);

        memoryContentForTracking = formatMemoriesByCategory(truncated);

        if (memoryContentForTracking) {
          systemMessages.push({
            role: "system",
            content: `## Identity & Preferences\n\n${memoryContentForTracking}`,
          });
        }
      }
    } catch (error) {
      console.error("[Identity] Failed to load identity memories:", error);
      // Continue without memories (graceful degradation)
    }
  }

  // === 3. CONTEXTUAL MEMORIES (for non-tool models only) ===
  // Skip for incognito blank slate mode
  if (args.prefetchedMemories && !isBlankSlate) {
    systemMessages.push({
      role: "system",
      content: `## Contextual Memories\n\n${args.prefetchedMemories}`,
    });
  }

  // === 4. PROJECT CONTEXT ===
  if (conversation?.projectId) {
    const project: Doc<"projects"> | null = await ctx.runQuery(
      internal.lib.helpers.getProject,
      {
        id: conversation.projectId,
      },
    );
    if (project?.systemPrompt) {
      systemMessages.push({
        role: "system",
        content: `## Project Context\n${project.systemPrompt}`,
      });
    }
  }

  // === 4.25. KNOWLEDGE BANK ===
  // Skip for incognito blank slate mode
  if (!isBlankSlate && args.hasFunctionCalling) {
    try {
      const hasKnowledge = (await (ctx.runQuery as any)(
        // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
        internal.knowledgeBank.index.hasKnowledge,
        { userId: args.userId },
      )) as boolean;

      const kbPrompt = getKnowledgeBankSystemPrompt(hasKnowledge);
      if (kbPrompt) {
        systemMessages.push({
          role: "system",
          content: kbPrompt,
        });
      }
    } catch (error) {
      console.error("[KnowledgeBank] Failed to check knowledge bank:", error);
      // Continue without KB prompt (graceful degradation)
    }
  }

  // === 4.3. BUDGET AWARENESS (Phase 3) ===
  // Inject budget status when context is getting full
  if (args.budgetState && isContextGettingFull(args.budgetState)) {
    systemMessages.push({
      role: "system",
      content: formatStatus(args.budgetState),
    });
  }

  // === 4.4. ASK USER SUGGESTION (Phase 3) ===
  // Nudge AI to ask for clarification when stuck
  if (args.budgetState && shouldSuggestAskUser(args.budgetState)) {
    const { searchHistory } = args.budgetState;
    const lowQualityCount = searchHistory.filter(
      (h) => h.topScore < 0.7,
    ).length;
    systemMessages.push({
      role: "system",
      content: `[Stuck Detection: ${lowQualityCount} low-quality searches. Use askForClarification tool to get user input instead of continuing to search.]`,
    });
  }

  // === 4.5. DOCUMENT MODE PROMPT (Canvas) ===
  if (conversation?.mode === "document") {
    const { DOCUMENT_MODE_PROMPT } = await import("./index");
    systemMessages.push({
      role: "system",
      content: DOCUMENT_MODE_PROMPT,
    });
  }

  // === 5. CONVERSATION-LEVEL SYSTEM PROMPT ===
  if (conversation?.systemPrompt) {
    systemMessages.push({
      role: "system",
      content: `## Conversation Instructions\n${conversation.systemPrompt}`,
    });
  }

  // === 6. USER CUSTOM INSTRUCTIONS (HIGHEST PRIORITY - LAST) ===
  // Placed last to leverage recency bias in LLMs
  // Wrapped with explicit override directive
  // Skip for incognito blank slate mode
  if (customInstructions?.enabled && !isBlankSlate) {
    const {
      aboutUser,
      responseStyle,
      baseStyleAndTone,
      nickname,
      occupation,
      moreAboutYou,
    } = customInstructions;

    // Build personalization sections
    const sections: string[] = [];

    // User identity section
    const identityParts: string[] = [];
    if (nickname) identityParts.push(`Name: ${nickname}`);
    if (occupation) identityParts.push(`Role: ${occupation}`);
    if (identityParts.length > 0) {
      sections.push(`### User Identity\n${identityParts.join("\n")}`);
    }

    // About the user
    if (aboutUser || moreAboutYou) {
      const aboutSections: string[] = [];
      if (aboutUser) aboutSections.push(aboutUser);
      if (moreAboutYou) aboutSections.push(moreAboutYou);
      sections.push(`### About the User\n${aboutSections.join("\n\n")}`);
    }

    // Response style (custom instructions from user)
    if (responseStyle) {
      sections.push(`### Response Style Instructions\n${responseStyle}`);
    }

    // Base style and tone directive
    if (baseStyleAndTone && baseStyleAndTone !== "default") {
      const toneDescriptions: Record<string, string> = {
        professional:
          "Be polished and precise. Use formal language and structured responses.",
        friendly:
          "Be warm and chatty. Use casual language and show enthusiasm.",
        candid:
          "Be direct and encouraging. Get straight to the point while being supportive.",
        quirky:
          "Be playful and imaginative. Use creative language and unexpected analogies.",
        efficient: "Be concise and plain. Minimize words, maximize clarity.",
        nerdy:
          "Be exploratory and enthusiastic. Dive deep into technical details.",
        cynical:
          "Be critical and sarcastic. Question assumptions, use dry humor.",
      };
      const toneDirective = toneDescriptions[baseStyleAndTone];
      if (toneDirective) {
        sections.push(`### Tone Directive\n${toneDirective}`);
      }
    }

    if (sections.length > 0) {
      // Wrap with explicit override directive for maximum priority
      const userPreferencesContent = `<user_preferences priority="highest">
## User Personalization Settings
**IMPORTANT**: These are the user's explicitly configured preferences. They take absolute priority over any default behavior or tone guidelines defined earlier.

${sections.join("\n\n")}

**Reminder**: Always honor these preferences. The user has specifically configured these settings.
</user_preferences>`;

      systemMessages.push({
        role: "system",
        content: userPreferencesContent,
      });
    }
  }

  return { messages: systemMessages, memoryContent: memoryContentForTracking };
}
