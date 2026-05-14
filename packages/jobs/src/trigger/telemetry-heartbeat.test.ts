import {
  createConversationRepository,
  createMessageRepository,
  createUserRepository,
} from "@blah-chat/persistence-postgres";
import { describe, expect, it } from "vitest";
import { createTestPersistenceDb } from "../../../persistence-postgres/src/testing/pglite";
import { gatherStats } from "./telemetry-heartbeat";

describe("telemetryHeartbeat", () => {
  it("gathers correct stats from postgres", async () => {
    const db = await createTestPersistenceDb();
    const now = Date.now();
    const users = createUserRepository(db);
    const convos = createConversationRepository(db);
    const msgs = createMessageRepository(db);

    const user = await users.upsertFromClerk({
      clerkId: "clerk_telemetry",
      email: "telemetry@example.com",
      name: "Telemetry User",
    });

    const conversation = await convos.create({
      userId: user.id,
      title: "Test",
      model: "openai:gpt-5-mini",
    });

    // Create messages within the last 24h
    for (let i = 0; i < 3; i++) {
      await msgs.create({
        conversationId: conversation.id,
        userId: user.id,
        role: i % 2 === 0 ? "user" : "assistant",
        content: `Message ${i}`,
        parentMessageIds: [],
        siblingIndex: 0,
      });
    }

    const stats = await gatherStats({ db, now });

    expect(stats.totalUsers).toBe(1);
    expect(stats.messagesLast24h).toBe(3);
    expect(stats.activeUsersLast24h).toBe(1);
  });

  it("returns zeros for empty database", async () => {
    const db = await createTestPersistenceDb();
    const now = Date.now();

    const stats = await gatherStats({ db, now });

    expect(stats.totalUsers).toBe(0);
    expect(stats.messagesLast24h).toBe(0);
    expect(stats.activeUsersLast24h).toBe(0);
  });
});
