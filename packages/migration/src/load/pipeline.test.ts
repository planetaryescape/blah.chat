import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import AdmZip from "adm-zip";
import { describe, expect, it } from "vitest";
import { createTestDb } from "../test-helpers";
import { runPipeline } from "./pipeline";

function createFixtureZip(): string {
  const zip = new AdmZip();

  const users = [
    JSON.stringify({
      _id: "u1",
      _creationTime: 1700000000000,
      clerkId: "clerk_1",
      email: "alice@test.com",
      name: "Alice",
      createdAt: 1700000000000,
      updatedAt: 1700000000000,
    }),
  ];

  const conversations = [
    JSON.stringify({
      _id: "c1",
      _creationTime: 1700000000000,
      userId: "u1",
      title: "Test Chat",
      model: "gpt-4o",
      pinned: false,
      archived: false,
      starred: false,
      lastMessageAt: 1700000001000,
      activeLeafMessageId: "m2",
      createdAt: 1700000000000,
      updatedAt: 1700000001000,
    }),
  ];

  const messages = [
    JSON.stringify({
      _id: "m1",
      _creationTime: 1700000000000,
      conversationId: "c1",
      userId: "u1",
      role: "user",
      content: "Hello",
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
      content: "Hi there!",
      status: "complete",
      model: "gpt-4o",
      parentMessageIds: ["m1"],
      siblingIndex: 0,
      rootMessageId: "m1",
      createdAt: 1700000001000,
      updatedAt: 1700000001000,
    }),
  ];

  zip.addFile("users.jsonl", Buffer.from(`${users.join("\n")}\n`));
  zip.addFile(
    "conversations.jsonl",
    Buffer.from(`${conversations.join("\n")}\n`),
  );
  zip.addFile("messages.jsonl", Buffer.from(`${messages.join("\n")}\n`));
  // Add empty tables for other entities
  for (const table of [
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
    zip.addFile(`${table}.jsonl`, Buffer.from(""));
  }

  const zipPath = path.join(os.tmpdir(), `fixture-${Date.now()}.zip`);
  zip.writeZip(zipPath);
  return zipPath;
}

describe("runPipeline", () => {
  it("migrates a small fixture dataset end-to-end (dry run)", async () => {
    const zipPath = createFixtureZip();

    const result = await runPipeline(null, {
      inputZip: zipPath,
      bucket: "test-bucket",
      dryRun: true,
    });

    expect(result.counts.users).toBe(1);
    expect(result.counts.conversations).toBe(1);
    expect(result.counts.messages).toBe(2);
    expect(result.counts.messageEdges).toBe(1); // m2 -> m1 edge
    expect(result.idMap.count("users")).toBe(1);
    expect(result.idMap.count("conversations")).toBe(1);
    expect(result.idMap.count("messages")).toBe(2);

    fs.unlinkSync(zipPath);
  });

  it("inserts data into PGlite (live run)", async () => {
    const db = await createTestDb();
    const zipPath = createFixtureZip();

    const result = await runPipeline(db, {
      inputZip: zipPath,
      bucket: "test-bucket",
    });

    expect(result.counts.users).toBe(1);
    expect(result.counts.messages).toBe(2);
    expect(result.errors).toHaveLength(0);

    fs.unlinkSync(zipPath);
  });
});
