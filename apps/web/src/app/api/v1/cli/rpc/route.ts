import { api } from "@blah-chat/backend/convex/_generated/api";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getConvexClient } from "@/lib/api/convex";
import { withApiKeyAuth } from "@/lib/api/middleware/apiKeyAuth";
import { withErrorHandling } from "@/lib/api/middleware/errors";
import logger from "@/lib/logger";
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

async function handler(
  req: NextRequest,
  {
    apiKey,
    user,
  }: {
    params: Promise<Record<string, string | string[]>>;
    apiKey: string;
    user: {
      userId: string;
      email: string;
      name: string;
    };
  },
) {
  const startTime = Date.now();
  const body = bodySchema.parse(await req.json());
  const params = body.params ?? {};
  const convex = getConvexClient();

  const runQuery = async (
    reference: unknown,
    args: Record<string, unknown>,
  ) => {
    return (convex.query as any)(reference, {
      apiKey,
      ...args,
    });
  };

  const runMutation = async (
    reference: unknown,
    args: Record<string, unknown>,
  ) => {
    return (convex.mutation as any)(reference, {
      apiKey,
      ...args,
    });
  };

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
      result = await runQuery(api.cliAuth.listConversations, {
        limit: params.limit,
      });
      break;
    }
    case "getConversation": {
      result = await runQuery(api.cliAuth.getConversation, {
        conversationId: params.conversationId,
      });
      break;
    }
    case "listMessages": {
      result = await runQuery(api.cliAuth.listMessages, {
        conversationId: params.conversationId,
      });
      break;
    }
    case "listModels": {
      result = await runQuery(api.cliAuth.listModels, {});
      break;
    }
    case "getUserDefaultModel": {
      result = await runQuery(api.cliAuth.getUserDefaultModel, {});
      break;
    }
    case "searchConversations": {
      result = await runQuery(api.cliAuth.searchConversations, {
        searchQuery: params.query,
        limit: params.limit,
      });
      break;
    }
    case "sendMessage": {
      result = await runMutation(api.cliAuth.sendMessage, {
        conversationId: params.conversationId,
        content: params.content,
        modelId: params.modelId,
      });
      break;
    }
    case "createConversation": {
      result = await runMutation(api.cliAuth.createConversation, {
        title: params.title,
        model: params.model,
      });
      break;
    }
    case "archiveConversation": {
      await runMutation(api.cliAuth.archiveConversation, {
        conversationId: params.conversationId,
      });
      result = { success: true };
      break;
    }
    case "deleteConversation": {
      await runMutation(api.cliAuth.deleteConversation, {
        conversationId: params.conversationId,
      });
      result = { success: true };
      break;
    }
    case "updateConversationModel": {
      await runMutation(api.cliAuth.updateConversationModel, {
        conversationId: params.conversationId,
        model: params.model,
      });
      result = { success: true };
      break;
    }
    case "renameConversation": {
      await runMutation(api.cliAuth.renameConversation, {
        conversationId: params.conversationId,
        title: params.title,
      });
      result = { success: true };
      break;
    }
    case "createBookmark": {
      result = await runMutation(api.cliAuth.createBookmark, {
        messageId: params.messageId,
        conversationId: params.conversationId,
        note: params.note,
      });
      break;
    }
    case "listMemories": {
      result = await runQuery(api.cliAuth.listMemories, {
        limit: params.limit,
      });
      break;
    }
    case "listProjects": {
      result = await runQuery(api.cliAuth.listProjects, {
        limit: params.limit,
      });
      break;
    }
    case "listBookmarks": {
      result = await runQuery(api.cliAuth.listBookmarks, {
        limit: params.limit,
      });
      break;
    }
    case "listTemplates": {
      result = await runQuery(api.cliAuth.listTemplates, {
        limit: params.limit,
      });
      break;
    }
    case "listTasks": {
      result = await runQuery(api.cliAuth.listTasks, {
        status: params.status,
        limit: params.limit,
      });
      break;
    }
    case "createTask": {
      result = await runMutation(api.cliAuth.createTask, {
        title: params.title,
        description: params.description,
        urgency: params.urgency,
        deadline: params.deadline,
        deadlineSource: params.deadlineSource,
        projectId: params.projectId,
      });
      break;
    }
    case "updateTask": {
      await runMutation(api.cliAuth.updateTask, {
        taskId: params.taskId,
        title: params.title,
        description: params.description,
        status: params.status,
        urgency: params.urgency,
        deadline: params.deadline,
      });
      result = { success: true };
      break;
    }
    case "completeTask": {
      await runMutation(api.cliAuth.completeTask, {
        taskId: params.taskId,
      });
      result = { success: true };
      break;
    }
    case "deleteTask": {
      await runMutation(api.cliAuth.deleteTask, {
        taskId: params.taskId,
      });
      result = { success: true };
      break;
    }
    case "listNotes": {
      result = await runQuery(api.cliAuth.listNotes, {
        limit: params.limit,
      });
      break;
    }
    case "createNote": {
      result = await runMutation(api.cliAuth.createCliNote, {
        content: params.content,
        title: params.title,
        sourceMessageId: params.sourceMessageId,
        sourceConversationId: params.sourceConversationId,
        projectId: params.projectId,
      });
      break;
    }
    case "updateNote": {
      await runMutation(api.cliAuth.updateCliNote, {
        noteId: params.noteId,
        title: params.title,
        content: params.content,
        isPinned: params.isPinned,
      });
      result = { success: true };
      break;
    }
    case "deleteNote": {
      await runMutation(api.cliAuth.deleteCliNote, {
        noteId: params.noteId,
      });
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
