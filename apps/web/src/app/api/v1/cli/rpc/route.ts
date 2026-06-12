import "server-only";
import { MODEL_CONFIG } from "@blah-chat/ai/models";
import { conversations, messages } from "@blah-chat/persistence-postgres";
import { and, desc, eq, sql } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { cliChatDAL } from "@/lib/api/dal/cliChat";
import {
  type ApiKeyAuthContext,
  withApiKeyAuth,
} from "@/lib/api/middleware/apiKeyAuth";
import { withErrorHandling } from "@/lib/api/middleware/errors";
import { enforceRateLimit } from "@/lib/api/rate-limit";
import logger from "@/lib/logger";
import { createBookmark, listBookmarks } from "@/lib/persistence/bookmarks";
import { toApiConversation } from "@/lib/persistence/mappers";
import { listMemories } from "@/lib/persistence/memories";
import {
  createNote,
  deleteNote,
  listNotes,
  updateNote,
} from "@/lib/persistence/notes";
import { listProjects } from "@/lib/persistence/projects";
import { searchMessages } from "@/lib/persistence/search";
import { getPersistenceDb } from "@/lib/persistence/server";
import {
  createTask,
  deleteTask,
  listTasks,
  updateTask,
} from "@/lib/persistence/tasks";
import { listTemplates } from "@/lib/persistence/templates";
import { formatEntity } from "@/lib/utils/formatEntity";

const methodSchema = z.enum([
  "validateApiKey",
  "listConversations",
  "getConversation",
  "listMessages",
  "listModels",
  "getUserDefaultModel",
  "searchConversations",
  "sendMessage",
  "createConversation",
  "archiveConversation",
  "deleteConversation",
  "updateConversationModel",
  "renameConversation",
  "createBookmark",
  "listMemories",
  "listProjects",
  "listBookmarks",
  "listTemplates",
  "listTasks",
  "createTask",
  "updateTask",
  "completeTask",
  "deleteTask",
  "listNotes",
  "createNote",
  "updateNote",
  "deleteNote",
]);

const bodySchema = z.object({
  method: methodSchema,
  params: z.record(z.string(), z.unknown()).optional(),
});

// Per-method parameter schemas: bound every client-supplied string/number so
// the RPC surface can't smuggle unbounded payloads past validation.
const idSchema = z.string().min(1);
const limitSchema = z.number().int().min(1).max(100);
const taskUrgencySchema = z.enum(["low", "medium", "high", "urgent"]);
const taskStatusSchema = z.enum([
  "suggested",
  "confirmed",
  "in_progress",
  "completed",
  "cancelled",
]);

const rpcParams = {
  listConversations: z.object({ limit: limitSchema.optional() }),
  getConversation: z.object({ conversationId: idSchema }),
  listMessages: z.object({ conversationId: idSchema }),
  searchConversations: z.object({
    query: z.string().min(1).max(500),
    limit: limitSchema.optional(),
  }),
  sendMessage: z.object({
    conversationId: idSchema,
    content: z.string().min(1).max(64_000),
    modelId: z.string().max(200).optional(),
  }),
  createConversation: z.object({
    title: z.string().max(200).optional(),
    model: z.string().max(200).optional(),
  }),
  archiveConversation: z.object({ conversationId: idSchema }),
  deleteConversation: z.object({ conversationId: idSchema }),
  updateConversationModel: z.object({
    conversationId: idSchema,
    model: z.string().min(1).max(200),
  }),
  renameConversation: z.object({
    conversationId: idSchema,
    title: z.string().min(1).max(200),
  }),
  createBookmark: z.object({
    messageId: idSchema,
    conversationId: idSchema,
    note: z.string().max(10_000).optional(),
  }),
  listMemories: z.object({ limit: limitSchema.optional() }),
  createTask: z.object({
    title: z.string().min(1).max(500),
    description: z.string().max(64_000).optional(),
    urgency: taskUrgencySchema.optional(),
    deadline: z.number().int().optional(),
    deadlineSource: z.string().max(200).optional(),
    projectId: idSchema.optional(),
  }),
  updateTask: z.object({
    taskId: idSchema,
    title: z.string().min(1).max(500).optional(),
    description: z.string().max(64_000).optional(),
    status: taskStatusSchema.optional(),
    urgency: taskUrgencySchema.optional(),
    deadline: z.number().int().optional(),
  }),
  completeTask: z.object({ taskId: idSchema }),
  deleteTask: z.object({ taskId: idSchema }),
  createNote: z.object({
    content: z.string().max(512_000).optional(),
    title: z.string().max(500).optional(),
    sourceMessageId: idSchema.optional(),
    sourceConversationId: idSchema.optional(),
    projectId: idSchema.optional(),
  }),
  updateNote: z.object({
    noteId: idSchema,
    title: z.string().max(500).optional(),
    content: z.string().max(512_000).optional(),
    isPinned: z.boolean().optional(),
  }),
  deleteNote: z.object({ noteId: idSchema }),
} as const;

async function handler(req: NextRequest, context: ApiKeyAuthContext) {
  const { user } = context;
  const startTime = Date.now();
  const body = bodySchema.parse(await req.json());
  const rawParams: unknown = body.params ?? {};

  const clerkId = user.clerkId;
  const identity = { clerkId, email: user.email, name: user.name };

  let result: unknown;

  switch (body.method) {
    case "validateApiKey": {
      result = {
        userId: user.userId,
        email: user.email,
        name: user.name,
      };
      break;
    }
    case "listConversations": {
      const p = rpcParams.listConversations.parse(rawParams);
      const db = getPersistenceDb();
      const limit = p.limit ?? 50;
      const rows = await db
        .select({
          conversation: conversations,
          messageCount: sql<number>`count(${messages.id})::int`,
          lastMessageAt: sql<number | null>`max(${messages.createdAt})`,
        })
        .from(conversations)
        .leftJoin(messages, eq(messages.conversationId, conversations.id))
        .where(
          and(
            eq(conversations.userId, user.userId),
            eq(conversations.archived, false),
          ),
        )
        .groupBy(conversations.id)
        .orderBy(
          desc(
            sql`coalesce(max(${messages.createdAt}), ${conversations.updatedAt})`,
          ),
        )
        .limit(limit);
      result = rows.map((row) =>
        toApiConversation({
          ...row.conversation,
          messageCount: row.messageCount,
          lastMessageAt: row.lastMessageAt,
        }),
      );
      break;
    }
    case "getConversation": {
      const p = rpcParams.getConversation.parse(rawParams);
      const db = getPersistenceDb();
      const conversation = await db.query.conversations.findFirst({
        where: and(
          eq(conversations.id, p.conversationId),
          eq(conversations.userId, user.userId),
        ),
      });
      if (!conversation) {
        result = null;
        break;
      }
      const [stats] = await db
        .select({
          messageCount: sql<number>`count(*)::int`,
          lastMessageAt: sql<number | null>`max(${messages.createdAt})`,
        })
        .from(messages)
        .where(eq(messages.conversationId, conversation.id));
      result = toApiConversation({
        ...conversation,
        messageCount: stats?.messageCount ?? 0,
        lastMessageAt: stats?.lastMessageAt ?? conversation.updatedAt,
      });
      break;
    }
    case "listMessages": {
      const p = rpcParams.listMessages.parse(rawParams);
      result = await cliChatDAL.listMessages(identity, p.conversationId);
      break;
    }
    case "listModels": {
      result = Object.values(MODEL_CONFIG).map((m) => ({
        id: m.id,
        name: m.name,
        provider: m.provider,
      }));
      break;
    }
    case "getUserDefaultModel": {
      const { createPreferenceRepository } = await import(
        "@blah-chat/persistence-postgres"
      );
      const prefRepo = createPreferenceRepository(getPersistenceDb());
      const defaultModel = await prefRepo.getForClerkId(
        clerkId,
        "defaultModel",
      );
      result = {
        model: typeof defaultModel === "string" ? defaultModel : null,
      };
      break;
    }
    case "searchConversations": {
      const p = rpcParams.searchConversations.parse(rawParams);
      result = await searchMessages(clerkId, {
        query: p.query,
        limit: p.limit ?? 20,
      });
      break;
    }
    case "sendMessage": {
      // Shares the per-user send bucket with the web send path.
      const limited = await enforceRateLimit(
        { prefix: "messages", limit: 60, window: "1 h" },
        clerkId,
      );
      if (limited) return limited;

      const p = rpcParams.sendMessage.parse(rawParams);
      result = await cliChatDAL.sendMessage(identity, p.conversationId, {
        content: p.content,
        modelId: p.modelId,
      });
      break;
    }
    case "createConversation": {
      const p = rpcParams.createConversation.parse(rawParams);
      const db = getPersistenceDb();
      const now = Date.now();
      const [conversation] = await db
        .insert(conversations)
        .values({
          userId: user.userId,
          title: p.title || "New Chat",
          model: p.model || "gpt-4o",
          createdAt: now,
          updatedAt: now,
        })
        .returning();
      result = conversation
        ? toApiConversation({
            ...conversation,
            messageCount: 0,
            lastMessageAt: conversation.updatedAt,
          })
        : null;
      break;
    }
    case "archiveConversation": {
      const p = rpcParams.archiveConversation.parse(rawParams);
      const db = getPersistenceDb();
      await db
        .update(conversations)
        .set({ archived: true, updatedAt: Date.now() })
        .where(
          and(
            eq(conversations.id, p.conversationId),
            eq(conversations.userId, user.userId),
          ),
        );
      result = { success: true };
      break;
    }
    case "deleteConversation": {
      const p = rpcParams.deleteConversation.parse(rawParams);
      const db = getPersistenceDb();
      await db
        .delete(conversations)
        .where(
          and(
            eq(conversations.id, p.conversationId),
            eq(conversations.userId, user.userId),
          ),
        );
      result = { success: true };
      break;
    }
    case "updateConversationModel": {
      const p = rpcParams.updateConversationModel.parse(rawParams);
      const db = getPersistenceDb();
      await db
        .update(conversations)
        .set({ model: p.model, updatedAt: Date.now() })
        .where(
          and(
            eq(conversations.id, p.conversationId),
            eq(conversations.userId, user.userId),
          ),
        );
      result = { success: true };
      break;
    }
    case "renameConversation": {
      const p = rpcParams.renameConversation.parse(rawParams);
      const db = getPersistenceDb();
      await db
        .update(conversations)
        .set({ title: p.title, updatedAt: Date.now() })
        .where(
          and(
            eq(conversations.id, p.conversationId),
            eq(conversations.userId, user.userId),
          ),
        );
      result = { success: true };
      break;
    }
    case "createBookmark": {
      const p = rpcParams.createBookmark.parse(rawParams);
      result = await createBookmark(clerkId, {
        messageId: p.messageId,
        conversationId: p.conversationId,
        note: p.note,
      });
      break;
    }
    case "listMemories": {
      const p = rpcParams.listMemories.parse(rawParams);
      result = await listMemories(clerkId, {
        limit: p.limit,
      });
      break;
    }
    case "listProjects": {
      result = await listProjects(clerkId);
      break;
    }
    case "listBookmarks": {
      result = await listBookmarks(clerkId);
      break;
    }
    case "listTemplates": {
      result = await listTemplates(clerkId);
      break;
    }
    case "listTasks": {
      result = await listTasks(clerkId);
      break;
    }
    case "createTask": {
      const p = rpcParams.createTask.parse(rawParams);
      result = await createTask(clerkId, {
        title: p.title,
        description: p.description,
        urgency: p.urgency,
        deadline: p.deadline,
        deadlineSource: p.deadlineSource,
        projectId: p.projectId,
      });
      break;
    }
    case "updateTask": {
      const p = rpcParams.updateTask.parse(rawParams);
      await updateTask(clerkId, p.taskId, {
        title: p.title,
        description: p.description,
        status: p.status,
        urgency: p.urgency,
        deadline: p.deadline,
      });
      result = { success: true };
      break;
    }
    case "completeTask": {
      const p = rpcParams.completeTask.parse(rawParams);
      await updateTask(clerkId, p.taskId, {
        status: "completed",
      });
      result = { success: true };
      break;
    }
    case "deleteTask": {
      const p = rpcParams.deleteTask.parse(rawParams);
      await deleteTask(clerkId, p.taskId);
      result = { success: true };
      break;
    }
    case "listNotes": {
      result = await listNotes(clerkId);
      break;
    }
    case "createNote": {
      const p = rpcParams.createNote.parse(rawParams);
      result = await createNote(clerkId, {
        content: p.content,
        title: p.title,
        sourceMessageId: p.sourceMessageId,
        sourceConversationId: p.sourceConversationId,
        projectId: p.projectId,
      });
      break;
    }
    case "updateNote": {
      const p = rpcParams.updateNote.parse(rawParams);
      await updateNote(clerkId, p.noteId, {
        title: p.title,
        content: p.content,
        isPinned: p.isPinned,
      });
      result = { success: true };
      break;
    }
    case "deleteNote": {
      const p = rpcParams.deleteNote.parse(rawParams);
      await deleteNote(clerkId, p.noteId);
      result = { success: true };
      break;
    }
  }

  if (result === null) {
    return NextResponse.json(
      {
        status: "error",
        sys: { entity: "error" },
        error: { message: "Resource not found", code: "NOT_FOUND" },
      },
      { status: 404 },
    );
  }

  logger.info(
    {
      method: body.method,
      userId: user.userId,
      duration: Date.now() - startTime,
    },
    "CLI RPC request",
  );

  return NextResponse.json(
    formatEntity(result ?? { success: true }, `cli.${body.method}`),
  );
}

export const POST = withErrorHandling(withApiKeyAuth(handler));
export const dynamic = "force-dynamic";
