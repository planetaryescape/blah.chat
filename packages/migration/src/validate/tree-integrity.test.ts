import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import AdmZip from "adm-zip";
import { describe, expect, it } from "vitest";
import { runPipeline } from "../load/pipeline";
import { createTestDb } from "../test-helpers";
import { checkTreeIntegrity } from "./tree-integrity";

function createTreeFixtureZip(): string {
  const zip = new AdmZip();
  zip.addFile(
    "users.jsonl",
    Buffer.from(
      `${JSON.stringify({
        _id: "u1",
        _creationTime: 1700000000000,
        clerkId: "c1",
        email: "a@t.com",
        name: "A",
        createdAt: 1700000000000,
        updatedAt: 1700000000000,
      })}\n`,
    ),
  );
  zip.addFile(
    "conversations.jsonl",
    Buffer.from(
      `${JSON.stringify({
        _id: "c1",
        _creationTime: 1700000000000,
        userId: "u1",
        title: "T",
        model: "m",
        pinned: false,
        archived: false,
        starred: false,
        lastMessageAt: 1700000001000,
        activeLeafMessageId: "m2",
        createdAt: 1700000000000,
        updatedAt: 1700000001000,
      })}\n`,
    ),
  );
  zip.addFile(
    "messages.jsonl",
    Buffer.from(
      `${[
        JSON.stringify({
          _id: "m1",
          _creationTime: 1700000000000,
          conversationId: "c1",
          userId: "u1",
          role: "user",
          content: "Hi",
          status: "complete",
          createdAt: 1700000000000,
          updatedAt: 1700000000000,
        }),
        JSON.stringify({
          _id: "m2",
          _creationTime: 1700000001000,
          conversationId: "c1",
          userId: "u1",
          role: "assistant",
          content: "Hello",
          status: "complete",
          model: "gpt-4o",
          parentMessageIds: ["m1"],
          siblingIndex: 0,
          rootMessageId: "m1",
          createdAt: 1700000001000,
          updatedAt: 1700000001000,
        }),
      ].join("\n")}\n`,
    ),
  );
  for (const t of [
    "templates",
    "sourceMetadata",
    "projects",
    "userPreferences",
    "cliApiKeys",
    "userApiKeys",
    "composioConnections",
    "chatSuggestionsCache",
    "projectConversations",
    "attachments",
    "toolCalls",
    "sources",
    "bookmarks",
    "votes",
    "notes",
    "tasks",
    "usageRecords",
    "feedback",
    "memories",
    "knowledgeSources",
    "knowledgeChunks",
    "ttsCache",
    "shares",
    "routingExamples",
  ]) {
    zip.addFile(`${t}.jsonl`, Buffer.from(""));
  }
  const zipPath = path.join(os.tmpdir(), `tree-${Date.now()}.zip`);
  zip.writeZip(zipPath);
  return zipPath;
}

describe("checkTreeIntegrity", () => {
  it("passes for a valid tree", async () => {
    const db = await createTestDb();
    const zipPath = createTreeFixtureZip();
    await runPipeline(db, { inputZip: zipPath, bucket: "b" });

    const result = await checkTreeIntegrity(db);
    expect(result.orphanEdges).toBe(0);
    expect(result.invalidActiveLeaf).toBe(0);
    expect(result.passed).toBe(true);

    fs.unlinkSync(zipPath);
  });
});
