/**
 * @vitest-environment node
 */
import {
  composioConnections,
  createConversationRepository,
  createMessageRepository,
  createUserRepository,
  generationRequests,
} from "@blah-chat/persistence-postgres";
import { beforeEach, describe, expect, it } from "vitest";
import { createTestPersistenceDb } from "../../../../../packages/persistence-postgres/src/testing/pglite";
import {
  getConversationSelectedIntegrationIds,
  listConversationIntegrationEvents,
  listGenerationRequestIntegrations,
  setConversationSelectedIntegrations,
  snapshotGenerationRequestIntegrations,
} from "./conversationIntegrations";

describe("conversationIntegrations", () => {
  let db: Awaited<ReturnType<typeof createTestPersistenceDb>>;
  let userId: string;
  let conversationId: string;

  beforeEach(async () => {
    db = await createTestPersistenceDb();
    const user = await createUserRepository(db).upsertFromClerk({
      clerkId: "clerk_integration_test",
      email: "integration@test.com",
      name: "Integration Test",
      imageUrl: undefined,
    });
    userId = user.id;

    const conversation = await createConversationRepository(db).create({
      userId,
      title: "Integration Timeline",
      model: "openai:gpt-5-mini",
    });
    conversationId = conversation.id;
  });

  it("tracks enable and disable events and resolves current selection", async () => {
    await setConversationSelectedIntegrations({
      db,
      conversationId,
      userId,
      selectedIntegrationIds: ["github", "slack"],
    });

    await setConversationSelectedIntegrations({
      db,
      conversationId,
      userId,
      selectedIntegrationIds: ["slack"],
    });

    const events = await listConversationIntegrationEvents(db, conversationId);
    expect(
      events.map((event) => `${event.action}:${event.integrationId}`),
    ).toEqual(["enabled:github", "enabled:slack", "disabled:github"]);

    await expect(
      getConversationSelectedIntegrationIds(db, conversationId),
    ).resolves.toEqual(["slack"]);
  });

  it("snapshots only selected integrations into a generation request", async () => {
    await db.insert(composioConnections).values([
      {
        userId,
        composioConnectionId: "conn_github",
        integrationId: "github",
        integrationName: "GitHub",
        status: "active",
        scopes: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      {
        userId,
        composioConnectionId: "conn_slack",
        integrationId: "slack",
        integrationName: "Slack",
        status: "active",
        scopes: [],
        createdAt: Date.now() + 1,
        updatedAt: Date.now() + 1,
      },
    ]);

    const userMessage = await createMessageRepository(db).create({
      conversationId,
      userId,
      role: "user",
      content: "Use GitHub",
      parentMessageIds: [],
      siblingIndex: 0,
    });

    const [request] = await db
      .insert(generationRequests)
      .values({
        conversationId,
        userMessageId: userMessage.id,
        requestedModels: ["openai:gpt-5-mini"],
        status: "pending",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      })
      .returning();

    expect(request).toBeTruthy();

    await snapshotGenerationRequestIntegrations({
      db,
      requestId: request!.id,
      userId,
      selectedIntegrationIds: ["github"],
    });

    const integrations = await listGenerationRequestIntegrations(
      db,
      request!.id,
    );
    expect(integrations).toHaveLength(1);
    expect(integrations[0]?.integrationId).toBe("github");
    expect(integrations[0]?.composioConnectionId).toBe("conn_github");
  });
});
