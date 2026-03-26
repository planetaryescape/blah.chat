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

async function handler(req: NextRequest, context: ApiKeyAuthContext) {
  const { user } = context;
  const startTime = Date.now();
  const body = bodySchema.parse(await req.json());
  const params = body.params ?? {};

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
      const db = getPersistenceDb();
      const limit = typeof params.limit === "number" ? params.limit : 50;
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
      const db = getPersistenceDb();
      const conversation = await db.query.conversations.findFirst({
        where: and(
          eq(conversations.id, params.conversationId as string),
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
      result = await cliChatDAL.listMessages(
        identity,
        params.conversationId as string,
      );
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
      result = await searchMessages(clerkId, {
        query: params.query as string,
        limit: typeof params.limit === "number" ? params.limit : 20,
      });
      break;
    }
    case "sendMessage": {
      result = await cliChatDAL.sendMessage(
        identity,
        params.conversationId as string,
        {
          content: params.content as string,
          modelId: params.modelId as string | undefined,
        },
      );
      break;
    }
    case "createConversation": {
      const db = getPersistenceDb();
      const now = Date.now();
      const [conversation] = await db
        .insert(conversations)
        .values({
          userId: user.userId,
          title: (params.title as string) || "New Chat",
          model: (params.model as string) || "gpt-4o",
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
      const db = getPersistenceDb();
      await db
        .update(conversations)
        .set({ archived: true, updatedAt: Date.now() })
        .where(
          and(
            eq(conversations.id, params.conversationId as string),
            eq(conversations.userId, user.userId),
          ),
        );
      result = { success: true };
      break;
    }
    case "deleteConversation": {
      const db = getPersistenceDb();
      await db
        .delete(conversations)
        .where(
          and(
            eq(conversations.id, params.conversationId as string),
            eq(conversations.userId, user.userId),
          ),
        );
      result = { success: true };
      break;
    }
    case "updateConversationModel": {
      const db = getPersistenceDb();
      await db
        .update(conversations)
        .set({ model: params.model as string, updatedAt: Date.now() })
        .where(
          and(
            eq(conversations.id, params.conversationId as string),
            eq(conversations.userId, user.userId),
          ),
        );
      result = { success: true };
      break;
    }
    case "renameConversation": {
      const db = getPersistenceDb();
      await db
        .update(conversations)
        .set({ title: params.title as string, updatedAt: Date.now() })
        .where(
          and(
            eq(conversations.id, params.conversationId as string),
            eq(conversations.userId, user.userId),
          ),
        );
      result = { success: true };
      break;
    }
    case "createBookmark": {
      result = await createBookmark(clerkId, {
        messageId: params.messageId as string,
        conversationId: params.conversationId as string,
        note: params.note as string | undefined,
      });
      break;
    }
    case "listMemories": {
      result = await listMemories(clerkId, {
        limit: typeof params.limit === "number" ? params.limit : undefined,
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
      result = await createTask(clerkId, {
        title: params.title as string,
        description: params.description as string | undefined,
        urgency: params.urgency as
          | "low"
          | "medium"
          | "high"
          | "urgent"
          | undefined,
        deadline: params.deadline as number | undefined,
        deadlineSource: params.deadlineSource as string | undefined,
        projectId: params.projectId as string | undefined,
      });
      break;
    }
    case "updateTask": {
      await updateTask(clerkId, params.taskId as string, {
        title: params.title as string | undefined,
        description: params.description as string | undefined,
        status: params.status as
          | "suggested"
          | "confirmed"
          | "in_progress"
          | "completed"
          | "cancelled"
          | undefined,
        urgency: params.urgency as
          | "low"
          | "medium"
          | "high"
          | "urgent"
          | undefined,
        deadline: params.deadline as number | undefined,
      });
      result = { success: true };
      break;
    }
    case "completeTask": {
      await updateTask(clerkId, params.taskId as string, {
        status: "completed",
      });
      result = { success: true };
      break;
    }
    case "deleteTask": {
      await deleteTask(clerkId, params.taskId as string);
      result = { success: true };
      break;
    }
    case "listNotes": {
      result = await listNotes(clerkId);
      break;
    }
    case "createNote": {
      result = await createNote(clerkId, {
        content: params.content as string | undefined,
        title: params.title as string | undefined,
        sourceMessageId: params.sourceMessageId as string | undefined,
        sourceConversationId: params.sourceConversationId as string | undefined,
        projectId: params.projectId as string | undefined,
      });
      break;
    }
    case "updateNote": {
      await updateNote(clerkId, params.noteId as string, {
        title: params.title as string | undefined,
        content: params.content as string | undefined,
        isPinned: params.isPinned as boolean | undefined,
      });
      result = { success: true };
      break;
    }
    case "deleteNote": {
      await deleteNote(clerkId, params.noteId as string);
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
