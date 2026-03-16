import {
  buildAttachmentObjectKey,
  buildDraftObjectKey,
  conversations,
  createSignedReadUrl,
  createSignedUploadUrl,
} from "@blah-chat/persistence-postgres";
import { and, eq } from "drizzle-orm";
import { ensureCurrentPersistenceUser } from "@/lib/persistence/current-user";
import { getPersistenceDb } from "@/lib/persistence/server";
import {
  getPersistenceEnv,
  getPersistenceR2Client,
} from "@/lib/persistence/storage";
import { formatEntity, formatEntityList } from "@/lib/utils/formatEntity";
import "server-only";

async function assertOwnedConversation(userId: string, conversationId: string) {
  const db = getPersistenceDb();
  const user = await ensureCurrentPersistenceUser(userId);
  const conversation = await db.query.conversations.findFirst({
    where: and(
      eq(conversations.id, conversationId),
      eq(conversations.userId, user.id),
    ),
  });

  if (!conversation) {
    throw new Error("Conversation not found");
  }

  return { db, user, conversation };
}

export const filesDAL = {
  async createUploadUrl(
    userId: string,
    input: {
      conversationId?: string;
      fileName: string;
      contentType: string;
    },
  ) {
    const user = await ensureCurrentPersistenceUser(userId);
    const env = getPersistenceEnv();
    const key = input.conversationId
      ? buildAttachmentObjectKey({
          userId: user.id,
          conversationId: (
            await assertOwnedConversation(userId, input.conversationId)
          ).conversation.id,
          fileName: input.fileName,
        })
      : buildDraftObjectKey({
          userId: user.id,
          fileName: input.fileName,
        });
    const uploadUrl = await createSignedUploadUrl({
      client: getPersistenceR2Client(),
      bucket: env.r2.bucket,
      key,
      contentType: input.contentType,
    });

    return formatEntity(
      {
        uploadUrl,
        storageId: key,
        method: "PUT",
      },
      "file.upload",
      key,
    );
  },

  async getFileUrl(userId: string, storageId: string) {
    const user = await ensureCurrentPersistenceUser(userId);
    if (!storageId.startsWith(`users/${user.id}/`)) {
      throw new Error("File not found");
    }

    const env = getPersistenceEnv();
    const url = await createSignedReadUrl({
      client: getPersistenceR2Client(),
      bucket: env.r2.bucket,
      key: storageId,
    });

    return formatEntity(
      {
        storageId,
        url,
      },
      "file",
      storageId,
    );
  },

  async getAttachmentUrls(userId: string, storageIds: string[]) {
    const user = await ensureCurrentPersistenceUser(userId);
    const filteredIds = storageIds.filter((storageId) =>
      storageId.startsWith(`users/${user.id}/`),
    );

    const env = getPersistenceEnv();
    const urls = await Promise.all(
      filteredIds.map(async (storageId) => ({
        storageId,
        url: await createSignedReadUrl({
          client: getPersistenceR2Client(),
          bucket: env.r2.bucket,
          key: storageId,
        }),
      })),
    );

    return formatEntityList(urls, "file");
  },
};
