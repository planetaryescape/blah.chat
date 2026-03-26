/**
 * @vitest-environment node
 */
import {
  cliApiKeys,
  conversations,
  createUserRepository,
  messages,
  notes,
  projects,
  tasks,
  userApiKeys,
  userPreferences,
  users,
} from "@blah-chat/persistence-postgres";
import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMockRequest, unwrapData } from "@/lib/test/api-helpers";
import { createTestPersistenceDb } from "../../../../../../../packages/persistence-postgres/src/testing/pglite";

const authMock = vi.fn();
const currentUserMock = vi.fn();
const deleteClerkUserMock = vi.fn(async () => undefined);
const composioAuthConfigsListMock = vi.fn();
const composioAuthConfigsCreateMock = vi.fn();
const composioConnectedAccountsInitiateMock = vi.fn();
const composioConnectedAccountsDeleteMock = vi.fn();
let db: Awaited<ReturnType<typeof createTestPersistenceDb>>;

vi.mock("@clerk/nextjs/server", () => ({
  auth: authMock,
  currentUser: currentUserMock,
  clerkClient: vi.fn(async () => ({
    users: {
      deleteUser: deleteClerkUserMock,
    },
  })),
}));

vi.mock("@composio/core", () => ({
  Composio: class {
    authConfigs = {
      list: composioAuthConfigsListMock,
      create: composioAuthConfigsCreateMock,
    };

    connectedAccounts = {
      initiate: composioConnectedAccountsInitiateMock,
      delete: composioConnectedAccountsDeleteMock,
    };
  },
}));

vi.mock("@/lib/persistence/server", () => ({
  getPersistenceDb: () => db,
}));

vi.mock("@/lib/logger", () => ({
  default: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock("server-only", () => ({}));

describe("settings rewrite routes with Clerk + Postgres", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();

    db = await createTestPersistenceDb();

    authMock.mockResolvedValue({
      userId: "clerk_settings",
      getToken: vi.fn(async () => null),
    });

    currentUserMock.mockResolvedValue({
      id: "clerk_settings",
      primaryEmailAddress: { emailAddress: "settings@example.com" },
      fullName: "Settings User",
      firstName: "Settings",
      lastName: "User",
      imageUrl: "https://example.com/settings.png",
      publicMetadata: {},
    });

    deleteClerkUserMock.mockClear();
    composioAuthConfigsListMock.mockReset();
    composioAuthConfigsCreateMock.mockReset();
    composioConnectedAccountsInitiateMock.mockReset();
    composioConnectedAccountsDeleteMock.mockReset();
  });

  it("creates, lists, and revokes CLI API keys through rewrite-native routes", async () => {
    const users = createUserRepository(db);
    await users.upsertFromClerk({
      clerkId: "clerk_settings",
      email: "settings@example.com",
      name: "Settings User",
      imageUrl: "https://example.com/settings.png",
    });

    const keysRoute = await import("../cli/api-keys/route");
    const keyItemRoute = await import("../cli/api-keys/[id]/route");

    const createResponse = await keysRoute.POST(
      createMockRequest("/api/v1/cli/api-keys", {
        method: "POST",
        body: {
          name: "Mobile CLI Key",
        },
      }),
      { params: Promise.resolve({}) },
    );

    expect(createResponse.status).toBe(201);
    const created = unwrapData<{
      key: string;
      keyPrefix: string;
      email: string;
      name: string;
    }>((await createResponse.json()) as any);
    expect(created.key.startsWith("blah_")).toBe(true);
    expect(created.keyPrefix.length).toBeGreaterThan(4);
    expect(created.email).toBe("settings@example.com");

    const listResponse = await keysRoute.GET(
      createMockRequest("/api/v1/cli/api-keys"),
      { params: Promise.resolve({}) },
    );

    expect(listResponse.status).toBe(200);
    const listed = unwrapData<Array<{ data: { _id: string; name: string } }>>(
      (await listResponse.json()) as any,
    );
    expect(listed).toEqual([
      expect.objectContaining({
        data: expect.objectContaining({
          name: "Mobile CLI Key",
        }),
      }),
    ]);

    const keyId = listed[0]?.data._id;
    expect(keyId).toBeTruthy();

    const revokeResponse = await keyItemRoute.DELETE(
      createMockRequest(`/api/v1/cli/api-keys/${keyId}`, {
        method: "DELETE",
      }),
      { params: Promise.resolve({ id: keyId as string }) },
    );

    expect(revokeResponse.status).toBe(200);
    expect(
      unwrapData<{ revoked: boolean; keyId: string }>(
        (await revokeResponse.json()) as any,
      ),
    ).toEqual({
      revoked: true,
      keyId,
    });

    const [persisted] = await db
      .select()
      .from(cliApiKeys)
      .where(eq(cliApiKeys.id, keyId as string));
    expect(persisted?.revokedAt).toBeTypeOf("number");
  });

  it("saves BYOK keys, exposes safe config, enables BYOK, and disables it when the gateway key is removed", async () => {
    const users = createUserRepository(db);
    await users.upsertFromClerk({
      clerkId: "clerk_settings",
      email: "settings@example.com",
      name: "Settings User",
      imageUrl: "https://example.com/settings.png",
    });

    process.env.BYOD_ENCRYPTION_KEY =
      "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

    const fetchMock = vi.fn(async () => new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const byokRoute = await import("../byok/route");
    const byokKeysRoute = await import("../byok/keys/route");
    const byokEnableRoute = await import("../byok/enable/route");

    const saveResponse = await byokKeysRoute.POST(
      createMockRequest("/api/v1/byok/keys", {
        method: "POST",
        body: {
          keyType: "vercelGateway",
          apiKey: "vercel_gateway_key_value",
        },
      }),
      { params: Promise.resolve({}) },
    );

    expect(saveResponse.status).toBe(200);
    expect(
      unwrapData<{ success: boolean }>((await saveResponse.json()) as any),
    ).toEqual({ success: true });

    const configResponse = await byokRoute.GET(
      createMockRequest("/api/v1/byok"),
      { params: Promise.resolve({}) },
    );

    expect(configResponse.status).toBe(200);
    expect(
      unwrapData<{
        hasVercelGatewayKey: boolean;
        byokEnabled: boolean;
      }>((await configResponse.json()) as any),
    ).toMatchObject({
      hasVercelGatewayKey: true,
      byokEnabled: false,
    });

    const enableResponse = await byokEnableRoute.POST(
      createMockRequest("/api/v1/byok/enable", {
        method: "POST",
      }),
      { params: Promise.resolve({}) },
    );

    expect(enableResponse.status).toBe(200);
    expect(
      unwrapData<{ success: boolean }>((await enableResponse.json()) as any),
    ).toEqual({ success: true });

    const [storedConfig] = await db.select().from(userApiKeys);
    expect(storedConfig?.encryptedVercelGatewayKey).toBeTruthy();
    expect(storedConfig?.encryptedVercelGatewayKey).not.toBe(
      "vercel_gateway_key_value",
    );
    expect(storedConfig?.byokEnabled).toBe(true);

    const removeResponse = await byokKeysRoute.DELETE(
      createMockRequest("/api/v1/byok/keys", {
        method: "DELETE",
        body: {
          keyType: "vercelGateway",
        },
      }),
      { params: Promise.resolve({}) },
    );

    expect(removeResponse.status).toBe(200);
    expect(
      unwrapData<{ success: boolean }>((await removeResponse.json()) as any),
    ).toEqual({ success: true });

    const [removedConfig] = await db.select().from(userApiKeys);
    expect(removedConfig?.byokEnabled).toBe(false);
    expect(removedConfig?.encryptedVercelGatewayKey).toBe("");

    vi.unstubAllGlobals();
  });

  it("exports rewrite-native user data, deletes data while keeping the account, and deletes the account on request", async () => {
    const usersRepo = createUserRepository(db);
    const user = await usersRepo.upsertFromClerk({
      clerkId: "clerk_settings",
      email: "settings@example.com",
      name: "Settings User",
      imageUrl: "https://example.com/settings.png",
    });

    await db.insert(conversations).values({
      id: "conv_export",
      userId: user.id,
      title: "Export Chat",
      model: "openai:gpt-5-mini",
      createdAt: 1000,
      updatedAt: 1000,
    });

    await db.insert(messages).values({
      id: "msg_export",
      conversationId: "conv_export",
      userId: user.id,
      role: "user",
      content: "Export this",
      status: "complete",
      siblingIndex: 0,
      createdAt: 1001,
      updatedAt: 1001,
    });

    await db.insert(projects).values({
      id: "proj_export",
      userId: user.id,
      name: "Rewrite Project",
      createdAt: 1002,
      updatedAt: 1002,
    });

    await db.insert(notes).values({
      id: "note_export",
      userId: user.id,
      title: "Export Note",
      content: "Keep me",
      createdAt: 1003,
      updatedAt: 1003,
    });

    await db.insert(tasks).values({
      id: "task_export",
      userId: user.id,
      title: "Export Task",
      status: "in_progress",
      createdAt: 1004,
      updatedAt: 1004,
    });

    await db.insert(userPreferences).values({
      userId: user.id,
      key: "defaultModel",
      value: "openai:gpt-5-mini",
      createdAt: 1005,
      updatedAt: 1005,
    });

    const exportRoute = await import("../user/export/route");
    const deleteDataRoute = await import("../user/delete-data/route");
    const deleteAccountRoute = await import("../user/delete-account/route");

    const exportResponse = await exportRoute.GET(
      createMockRequest("/api/v1/user/export"),
      { params: Promise.resolve({}) },
    );

    expect(exportResponse.status).toBe(200);
    const exportPayload = unwrapData<Record<string, any>>(
      (await exportResponse.json()) as any,
    );
    expect(exportPayload.conversations).toEqual([
      expect.objectContaining({ id: "conv_export", title: "Export Chat" }),
    ]);
    expect(exportPayload.notes).toEqual([
      expect.objectContaining({ id: "note_export", title: "Export Note" }),
    ]);
    expect(exportPayload.tasks).toEqual([
      expect.objectContaining({ id: "task_export", title: "Export Task" }),
    ]);
    expect(exportPayload.preferences).toEqual({
      defaultModel: "openai:gpt-5-mini",
    });

    const deleteDataResponse = await deleteDataRoute.POST(
      createMockRequest("/api/v1/user/delete-data", {
        method: "POST",
        body: {
          confirmationText: "DELETE MY DATA",
        },
      }),
      { params: Promise.resolve({}) },
    );

    expect(deleteDataResponse.status).toBe(200);
    expect(
      unwrapData<{ success: boolean }>(
        (await deleteDataResponse.json()) as any,
      ),
    ).toEqual({ success: true });

    const remainingUsersAfterDataDelete = await db.select().from(users);
    const remainingConversationsAfterDataDelete = await db
      .select()
      .from(conversations);
    const remainingNotesAfterDataDelete = await db.select().from(notes);
    const remainingTasksAfterDataDelete = await db.select().from(tasks);
    expect(remainingUsersAfterDataDelete).toHaveLength(1);
    expect(remainingConversationsAfterDataDelete).toHaveLength(0);
    expect(remainingNotesAfterDataDelete).toHaveLength(0);
    expect(remainingTasksAfterDataDelete).toHaveLength(0);

    await db.insert(conversations).values({
      id: "conv_delete_account",
      userId: user.id,
      title: "Delete Account Chat",
      model: "openai:gpt-5-mini",
      createdAt: 2000,
      updatedAt: 2000,
    });

    const deleteAccountResponse = await deleteAccountRoute.POST(
      createMockRequest("/api/v1/user/delete-account", {
        method: "POST",
        body: {
          confirmationText: "DELETE MY ACCOUNT",
        },
      }),
      { params: Promise.resolve({}) },
    );

    expect(deleteAccountResponse.status).toBe(200);
    expect(
      unwrapData<{ success: boolean }>(
        (await deleteAccountResponse.json()) as any,
      ),
    ).toEqual({ success: true });

    expect(await db.select().from(users)).toHaveLength(0);
    expect(deleteClerkUserMock).toHaveBeenCalledWith("clerk_settings");
  });

  it("lists, initiates, and revokes Composio integrations through rewrite-native routes", async () => {
    const usersRepo = createUserRepository(db);
    await usersRepo.upsertFromClerk({
      clerkId: "clerk_settings",
      email: "settings@example.com",
      name: "Settings User",
      imageUrl: "https://example.com/settings.png",
    });

    process.env.COMPOSIO_API_KEY = "composio_test_key";
    composioAuthConfigsListMock.mockResolvedValue({ items: [] });
    composioAuthConfigsCreateMock.mockResolvedValue({ id: "auth_config_1" });
    composioConnectedAccountsInitiateMock.mockResolvedValue({
      id: "conn_1",
      redirectUrl: "https://composio.example/connect",
    });
    composioConnectedAccountsDeleteMock.mockResolvedValue(undefined);

    const integrationsRoute = await import("../integrations/composio/route");

    const initiateResponse = await integrationsRoute.POST(
      createMockRequest("/api/v1/integrations/composio", {
        method: "POST",
        body: {
          integrationId: "github",
          redirectUrl: "blahchat://composio/callback",
        },
      }),
      { params: Promise.resolve({}) },
    );

    expect(initiateResponse.status).toBe(200);
    const initiated = unwrapData<{
      redirectUrl?: string;
      connectionId: string;
      state?: string;
    }>((await initiateResponse.json()) as any);
    expect(initiated).toMatchObject({
      redirectUrl: "https://composio.example/connect",
      connectionId: "conn_1",
    });
    expect(initiated.state).toEqual(expect.any(String));

    const listResponse = await integrationsRoute.GET(
      createMockRequest("/api/v1/integrations/composio"),
      { params: Promise.resolve({}) },
    );

    expect(listResponse.status).toBe(200);
    const listed = unwrapData<
      Array<{ data: { integrationId: string; status: string } }>
    >((await listResponse.json()) as any);
    expect(listed).toEqual([
      expect.objectContaining({
        data: expect.objectContaining({
          integrationId: "github",
          status: "initiated",
        }),
      }),
    ]);

    const revokeResponse = await integrationsRoute.DELETE(
      createMockRequest("/api/v1/integrations/composio", {
        method: "DELETE",
        body: {
          integrationId: "github",
        },
      }),
      { params: Promise.resolve({}) },
    );

    expect(revokeResponse.status).toBe(200);
    expect(
      unwrapData<{ success: boolean }>((await revokeResponse.json()) as any),
    ).toEqual({ success: true });
    expect(composioConnectedAccountsDeleteMock).toHaveBeenCalledWith("conn_1");
  });
});
