import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import AdmZip from "adm-zip";
import { describe, expect, it } from "vitest";
import { runPipeline } from "../load/pipeline";
import { createTestDb } from "../test-helpers";
import { checkParity } from "./parity";

function createFixtureZip(): string {
  const zip = new AdmZip();
  zip.addFile(
    "users.jsonl",
    Buffer.from(
      `${JSON.stringify({
        _id: "u1",
        _creationTime: 1700000000000,
        clerkId: "clerk_1",
        email: "a@t.com",
        name: "A",
        createdAt: 1700000000000,
        updatedAt: 1700000000000,
      })}\n`,
    ),
  );
  // Empty tables for remaining
  for (const t of [
    "conversations",
    "messages",
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
  const zipPath = path.join(os.tmpdir(), `parity-${Date.now()}.zip`);
  zip.writeZip(zipPath);
  return zipPath;
}

describe("checkParity", () => {
  it("reports matching counts after migration", async () => {
    const db = await createTestDb();
    const zipPath = createFixtureZip();

    await runPipeline(db, { inputZip: zipPath, bucket: "b" });

    const report = await checkParity(db, zipPath, ["users"]);
    expect(report.results[0].convexCount).toBe(1);
    expect(report.results[0].pgCount).toBe(1);
    expect(report.results[0].match).toBe(true);
    expect(report.passed).toBe(1);

    fs.unlinkSync(zipPath);
  });
});
