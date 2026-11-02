import { createHash } from "node:crypto";
import { makeFunctionReference } from "convex/server";
import { describe, expect, it } from "vitest";
import { convexTest } from "../../__tests__/testSetup";
import schema from "../schema";
import {
  buildPlans,
  type RestorePlan,
  type Row,
  type Snapshot,
  vector,
} from "./restorePostgresPlan";

const identity = {
  namespace: "synthetic-restore",
  snapshotHash: "snapshot",
  planHash: "plan",
};
const begin = makeFunctionReference<"mutation">(
  "migrations/restorePostgres:begin",
);
const batch = makeFunctionReference<"mutation">(
  "migrations/restorePostgres:batch",
);
const block = makeFunctionReference<"mutation">(
  "migrations/restorePostgres:block",
);
const audit = makeFunctionReference<"query">(
  "migrations/restorePostgres:audit",
);
const user: Row = {
  id: "user-legacy",
  clerk_id: "synthetic-clerk",
  email: "synthetic@example.invalid",
  name: "Synthetic",
  created_at: 1,
  updated_at: 2,
  image_url: null,
};
const conversation: Row = {
  id: "conversation-legacy",
  user_id: user.id,
  title: "Fixture",
  model: "fixture-model",
  pinned: false,
  starred: false,
  archived: false,
  created_at: 1,
  updated_at: 5,
  active_leaf_message_id: "child",
};
const message = (id: string, createdAt: number, overrides: Row = {}): Row => ({
  id,
  conversation_id: conversation.id,
  user_id: user.id,
  role: "assistant",
  model: "fixture-model",
  status: "complete",
  content: `Synthetic ${id}`,
  created_at: createdAt,
  updated_at: createdAt,
  root_message_id: "root",
  ...overrides,
});
function fixture(extra: Record<string, Row[]> = {}): Snapshot {
  return {
    exportedAt: "synthetic",
    tables: {
      // Deliberately reverse both table and child/parent order.
      message_edges: [
        {
          child_message_id: "child",
          parent_message_id: "root",
          edge_type: "reply",
          position: 0,
          created_at: 4,
        },
      ],
      messages: [
        message("child", 4),
        message("root", 2, { role: "user", model: null }),
      ],
      conversations: [conversation],
      users: [user],
      ...extra,
    },
  };
}
const item = (plan: RestorePlan) => ({
  plan,
  fingerprint: createHash("sha256").update(JSON.stringify(plan)).digest("hex"),
});

describe("Postgres restore planner", () => {
  it("keeps merge-parent order without a legacy scalar and rejects cycles through secondary parents", () => {
    const edges = [
      {
        child_message_id: "child",
        parent_message_id: "root",
        edge_type: "reply",
        position: 1,
      },
      {
        child_message_id: "child",
        parent_message_id: "root-two",
        edge_type: "reply",
        position: 0,
      },
    ];
    const snapshot = fixture({
      messages: [
        message("child", 4),
        message("root", 2),
        message("root-two", 3, { root_message_id: "root-two" }),
      ],
      message_edges: edges,
    });
    const plan = buildPlans(snapshot).find((p) => p.sourceKey === "child");
    expect(plan?.data).not.toHaveProperty("parentMessageId");
    expect(
      plan?.references
        .filter((ref) => ref.path[0] === "parentMessageIds")
        .map((ref) => ref.sourceKey),
    ).toEqual(["root-two", "root"]);
    snapshot.tables.message_edges.push({
      child_message_id: "root",
      parent_message_id: "child",
      edge_type: "reply",
      position: 0,
    });
    expect(
      buildPlans(snapshot).find((p) => p.sourceKey === "child"),
    ).toMatchObject({ action: "blocked", reason: "message_tree_cycle" });
  });

  it("uses dependency order without source Convex IDs and retains ordered tree references", () => {
    const plans = buildPlans(fixture());
    expect(plans.map((p) => p.sourceTable)).toEqual([
      "users",
      "conversations",
      "messages",
      "messages",
      "message_edges",
    ]);
    const child = plans.find((p) => p.sourceKey === "child");
    expect(child?.references).toContainEqual({
      path: ["parentMessageIds", "0"],
      sourceTable: "messages",
      sourceKey: "root",
      required: false,
    });
    expect(child?.data).toMatchObject({
      status: "complete",
      model: "fixture-model",
      isActiveBranch: true,
    });
    expect(
      plans.find((p) => p.sourceTable === "conversations")?.data,
    ).toMatchObject({ lastMessageAt: 4, messageCount: 2 });
  });

  it("rejects duplicate identities instead of silently overwriting mapping entries", () => {
    expect(() => buildPlans(fixture({ users: [user, user] }))).toThrow(
      "duplicate_source_identity:users",
    );
  });

  it("omits SQL optional nulls, preserves false/zero/empty strings, and does not fabricate required fields", () => {
    const plans = buildPlans(
      fixture({
        users: [{ ...user, daily_message_count: 0, is_admin: false, name: "" }],
      }),
    );
    expect(plans[0].data).toMatchObject({
      dailyMessageCount: 0,
      isAdmin: false,
      name: "",
    });
    expect(plans[0].data).not.toHaveProperty("imageUrl");
    const invalid = buildPlans(
      fixture({ users: [{ ...user, email: null }] }),
    ).find((p) => p.sourceTable === "users");
    expect(invalid).toMatchObject({
      action: "blocked",
      reason: "required_field:email",
    });
    const preference = buildPlans(
      fixture({
        user_preferences: [
          {
            user_id: user.id,
            key: "theme",
            value: null,
            created_at: 1,
            updated_at: 2,
          },
        ],
      }),
    ).find((p) => p.sourceTable === "user_preferences");
    expect(preference?.action).toBe("insert");
    expect(preference?.data.value).toBeNull();
  });

  it("preserves historical usage and tool results without replay; stops interrupted generation", () => {
    const plans = buildPlans(
      fixture({
        messages: [
          message("root", 2, { status: "generating" }),
          message("child", 4),
        ],
        usage_records: [
          {
            id: "usage",
            user_id: user.id,
            date: "2026-01-01",
            model: "fixture-model",
            input_tokens: 0,
            output_tokens: 13,
            cost: 0.012,
            message_count: 1,
            operation_type: "completion",
          },
        ],
        message_tool_calls: [
          {
            id: "tool",
            message_id: "child",
            conversation_id: conversation.id,
            user_id: user.id,
            tool_call_id: "historic-call",
            tool_name: "synthetic",
            args: { x: 1 },
            result: { historical: true },
            is_partial: false,
            timestamp: 4,
            created_at: 4,
          },
        ],
      }),
    );
    expect(plans.find((p) => p.sourceKey === "root")?.data.status).toBe(
      "stopped",
    );
    expect(plans.find((p) => p.sourceKey === "usage")?.data).toMatchObject({
      cost: 0.012,
      outputTokens: 13,
      operationType: "text",
    });
    expect(plans.find((p) => p.sourceKey === "tool")?.data.result).toEqual({
      historical: true,
    });
  });

  it("normalizes pgvector serialization but rejects incorrect dimensions/nonfinite values", () => {
    expect(vector(JSON.stringify(Array(1536).fill(0.125)))).toHaveLength(1536);
    expect(() => vector([1, 2])).toThrow(
      "embedding_dimension_or_value_mismatch",
    );
    expect(() => vector(Array(1536).fill(Number.NaN))).toThrow(
      "embedding_dimension_or_value_mismatch",
    );
  });

  it("blocks storage IDs, unverified BYOK and cross-conversation edges individually", () => {
    const plans = buildPlans(
      fixture({
        knowledge_sources: [
          { id: "file", storage_key: "legacy-object", type: "file" },
        ],
        user_api_keys: [
          {
            id: "secret-row",
            user_id: user.id,
            encrypted_vercel_gateway_key: "incompatible-ciphertext",
          },
        ],
        message_edges: [
          {
            child_message_id: "child",
            parent_message_id: "missing",
            edge_type: "reply",
            position: 0,
          },
        ],
      }),
    );
    expect(plans.find((p) => p.sourceKey === "file")?.reason).toBe(
      "knowledge_file_requires_object_storage_transfer",
    );
    expect(plans.find((p) => p.sourceKey === "secret-row")?.reason).toBe(
      "byok_format_and_matching_encryption_key_not_verified",
    );
    expect(plans.find((p) => p.sourceTable === "message_edges")?.action).toBe(
      "blocked",
    );
    expect(plans.find((p) => p.sourceKey === "child")?.action).toBe("blocked");
  });

  it("keeps conversations with incomplete cached recommendation metadata", () => {
    const plans = buildPlans(
      fixture({
        conversations: [
          {
            ...conversation,
            model_recommendation: { estimatedSavings: { percentSaved: 50 } },
          },
        ],
      }),
    );
    const plan = plans.find((p) => p.sourceTable === "conversations");
    expect(plan?.action).toBe("insert");
    expect(plan?.data).not.toHaveProperty("modelRecommendation");
    expect(plan?.warnings).toContain(
      "incomplete_cached_model_recommendation_retained_in_snapshot",
    );
  });
});

describe("Postgres restore internal mutations", () => {
  it("folds admin role/tier and serialized settings into remapped admin records", async () => {
    const t = convexTest(schema);
    const plans = buildPlans(
      fixture({
        user_admin_settings: [
          { user_id: user.id, is_admin: true, tier: "tier2" },
        ],
        admin_settings: [
          {
            id: "settings",
            updated_by: null,
            updated_at: 20,
            value: {
              limits: {
                defaultMonthlyBudget: 10,
                budgetHardLimitEnabled: true,
                defaultMaxIntegrations: 5,
                defaultDailyMessageLimit: 50,
                defaultBudgetAlertThreshold: 0.8,
              },
              memory: {
                autoExtractionEnabled: true,
                extractEveryNMessages: 5,
                maxMemoriesPerUser: 1000,
              },
              search: { hybridEnabled: true },
              proTier: {
                proModelsEnabled: true,
                tier1DailyProModelLimit: 1,
                tier2MonthlyProModelLimit: 50,
              },
              transcriptProvider: {
                provider: "fixture-transcript",
                costPerMinute: 0.0067,
              },
            },
          },
        ],
        user_api_keys: [
          {
            id: "empty-byok",
            user_id: user.id,
            byok_enabled: true,
            encrypted_vercel_gateway_key: "",
            encryption_ivs: null,
            auth_tags: ":::",
            created_at: 1,
            updated_at: 2,
          },
        ],
      }),
    );
    expect(plans.filter((plan) => plan.action === "blocked")).toHaveLength(0);
    await t.mutation(begin, { ...identity, expectedRows: plans.length });
    for (const pass of [1, 2])
      await t.mutation(batch, { ...identity, pass, items: plans.map(item) });
    const restored = await t.run(async (ctx) => ({
      user: await ctx.db.query("users").unique(),
      settings: await ctx.db.query("adminSettings").unique(),
      byok: await ctx.db.query("userApiKeys").unique(),
    }));
    expect(restored.user).toMatchObject({ isAdmin: true, tier: "tier2" });
    expect(restored.settings).toMatchObject({
      updatedBy: restored.user?._id,
      alertEmail: user.email,
      autoMemoryExtractInterval: 5,
      enableHybridSearch: true,
      defaultMonthlyBudget: 10,
      defaultDailyMessageLimit: 50,
      maxActiveIntegrations: 5,
      updatedAt: 20,
    });
    expect(restored.byok).toMatchObject({
      userId: restored.user?._id,
      byokEnabled: true,
    });
    expect(restored.byok).not.toHaveProperty("encryptedVercelGatewayKey");
    expect(
      plans.find((plan) => plan.sourceTable === "admin_settings")?.warnings,
    ).toContain("missing_settings_updated_by_attributed_to_only_source_admin");
  });

  it("restores project junctions and deduplicated user-scoped centralized tags", async () => {
    const t = convexTest(schema);
    const plans = buildPlans(
      fixture({
        projects: [
          {
            id: "project",
            user_id: user.id,
            name: "Synthetic project",
            created_at: 1,
            updated_at: 2,
          },
        ],
        conversations: [{ ...conversation, project_id: "project" }],
        notes: [
          {
            id: "note",
            user_id: user.id,
            project_id: "project",
            title: "Synthetic note",
            content: "Synthetic fixture",
            is_pinned: false,
            tags: ["Work", "work", "Other"],
            created_at: 1,
            updated_at: 2,
          },
        ],
        tasks: [
          {
            id: "task",
            user_id: user.id,
            title: "Synthetic task",
            status: "confirmed",
            tags: ["work"],
            created_at: 1,
            updated_at: 2,
          },
        ],
      }),
    );
    expect(plans.filter((plan) => plan.action === "blocked")).toHaveLength(0);
    await t.mutation(begin, { ...identity, expectedRows: plans.length });
    for (const pass of [1, 2])
      await t.mutation(batch, { ...identity, pass, items: plans.map(item) });
    const result = await t.run(async (ctx) => ({
      projectConversations: await ctx.db
        .query("projectConversations")
        .collect(),
      projectNotes: await ctx.db.query("projectNotes").collect(),
      tags: await ctx.db.query("tags").collect(),
      noteTags: await ctx.db.query("noteTags").collect(),
      taskTags: await ctx.db.query("taskTags").collect(),
    }));
    expect(result.projectConversations).toHaveLength(1);
    expect(result.projectNotes).toHaveLength(1);
    expect(result.tags).toHaveLength(2);
    expect(result.tags.find((tag) => tag.slug === "work")?.usageCount).toBe(2);
    expect(result.noteTags).toHaveLength(2);
    expect(result.taskTags).toHaveLength(1);
  });

  it("imports in two passes, resolves parent/active leaf to fresh IDs, and reruns without duplicates", async () => {
    const t = convexTest(schema);
    const plans = buildPlans(
      fixture({
        user_admin_settings: [
          { user_id: user.id, is_admin: true, tier: "tier1" },
        ],
      }),
    );
    await t.mutation(begin, { ...identity, expectedRows: plans.length });
    for (const pass of [1, 2, 1, 2])
      await t.mutation(batch, { ...identity, pass, items: plans.map(item) });
    const result = await t.run(async (ctx) => ({
      users: await ctx.db.query("users").collect(),
      conversations: await ctx.db.query("conversations").collect(),
      messages: await ctx.db.query("messages").collect(),
      mappings: await ctx.db.query("postgresRestoreRows").collect(),
    }));
    expect(result.users).toHaveLength(1);
    expect(result.users[0]).toMatchObject({ isAdmin: true, tier: "tier1" });
    expect(result.messages).toHaveLength(2);
    const child = result.messages.find((m) => m.content === "Synthetic child");
    const root = result.messages.find((m) => m.content === "Synthetic root");
    expect(child?.parentMessageIds).toEqual([root?._id]);
    expect(child?.parentMessageId).toBe(root?._id);
    expect(child?.rootMessageId).toBe(root?._id);
    expect(result.conversations[0].activeLeafMessageId).toBe(child?._id);
    expect(child?._id).not.toBe("child");
    expect(result.mappings).toHaveLength(plans.length);
    expect(
      result.mappings.every((r) =>
        ["imported", "converted"].includes(r.status),
      ),
    ).toBe(true);
  });

  it("lets Convex reject invalid target data atomically and records a sanitized blocked row", async () => {
    const t = convexTest(schema);
    const plan = buildPlans(fixture())[0];
    await t.mutation(begin, { ...identity, expectedRows: 2 });
    const invalid = {
      ...plan,
      sourceKey: "rejected-user",
      data: { ...plan.data, unexpected: "not permitted" },
    };
    await expect(
      t.mutation(batch, {
        ...identity,
        pass: 1,
        items: [item(plan), item(invalid)],
      }),
    ).rejects.toThrow("restore_target_schema_rejected");
    expect(await t.run((ctx) => ctx.db.query("users").collect())).toHaveLength(
      0,
    );
    await t.mutation(block, {
      ...identity,
      ...item(invalid),
      reason: "target_validation_or_reference_failed",
    });
    const page = await t.query(audit, {
      namespace: identity.namespace,
      cursor: null,
    });
    expect(page.page[0]).toMatchObject({
      status: "blocked",
      reason: "target_validation_or_reference_failed",
    });
  });

  it("refuses changed run identity, changed row fingerprints, and oversized batches", async () => {
    const t = convexTest(schema);
    const plan = buildPlans(fixture())[0];
    await t.mutation(begin, { ...identity, expectedRows: 1 });
    await expect(
      t.mutation(begin, {
        ...identity,
        snapshotHash: "different",
        expectedRows: 1,
      }),
    ).rejects.toThrow("restore_run_identity_mismatch");
    await t.mutation(batch, { ...identity, pass: 1, items: [item(plan)] });
    await expect(
      t.mutation(batch, {
        ...identity,
        pass: 1,
        items: [{ ...item(plan), fingerprint: "changed" }],
      }),
    ).rejects.toThrow("restore_row_fingerprint_mismatch");
    await expect(
      t.mutation(batch, {
        ...identity,
        pass: 1,
        items: Array(41).fill(item(plan)),
      }),
    ).rejects.toThrow("restore_batch_too_large");
  });
});
