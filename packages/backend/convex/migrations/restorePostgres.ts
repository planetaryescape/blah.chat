import type { WithoutSystemFields } from "convex/server";
import { v } from "convex/values";
import type { Doc } from "../_generated/dataModel";
import {
  internalMutation,
  internalQuery,
  type MutationCtx,
} from "../_generated/server";
import {
  object,
  type RestorePlan,
  setPath,
  TABLES,
  type TargetTable,
} from "./restorePostgresPlan";

export const MAX_BATCH_BYTES = 350_000;
export const MAX_BATCH_ROWS = 40;
const targetValidator = v.union(
  ...Object.values(TABLES).map((table) => v.literal(table)),
);
const planValidator = v.object({
  sourceTable: v.string(),
  sourceKey: v.string(),
  action: v.union(
    v.literal("insert"),
    v.literal("patch"),
    v.literal("blocked"),
    v.literal("retained"),
  ),
  targetTable: v.optional(targetValidator),
  targetSource: v.optional(v.object({ table: v.string(), key: v.string() })),
  data: v.any(),
  references: v.array(
    v.object({
      path: v.array(v.string()),
      sourceTable: v.string(),
      sourceKey: v.string(),
      required: v.boolean(),
    }),
  ),
  warnings: v.array(v.string()),
  reason: v.optional(v.string()),
});
const identityArgs = {
  namespace: v.string(),
  snapshotHash: v.string(),
  planHash: v.string(),
};

async function mapping(
  ctx: MutationCtx,
  namespace: string,
  table: string,
  key: string,
) {
  return ctx.db
    .query("postgresRestoreRows")
    .withIndex("by_source", (q) =>
      q
        .eq("namespace", namespace)
        .eq("sourceTable", table)
        .eq("sourceKey", key),
    )
    .unique();
}
async function requireRun(
  ctx: MutationCtx,
  args: { namespace: string; snapshotHash: string; planHash: string },
) {
  const run = await ctx.db
    .query("postgresRestoreRuns")
    .withIndex("by_namespace", (q) => q.eq("namespace", args.namespace))
    .unique();
  if (
    !run ||
    run.snapshotHash !== args.snapshotHash ||
    run.planHash !== args.planHash
  )
    throw new Error("restore_run_identity_mismatch");
  return run;
}

export const begin = internalMutation({
  args: { ...identityArgs, expectedRows: v.number() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("postgresRestoreRuns")
      .withIndex("by_namespace", (q) => q.eq("namespace", args.namespace))
      .unique();
    if (existing) {
      if (
        existing.snapshotHash !== args.snapshotHash ||
        existing.planHash !== args.planHash ||
        existing.expectedRows !== args.expectedRows
      )
        throw new Error("restore_run_identity_mismatch");
      return { resumed: true };
    }
    await ctx.db.insert("postgresRestoreRuns", {
      ...args,
      createdAt: Date.now(),
    });
    return { resumed: false };
  },
});

async function resolveReference(
  ctx: MutationCtx,
  namespace: string,
  table: string,
  key: string,
) {
  const found = await mapping(ctx, namespace, table, key);
  if (!found?.targetId) throw new Error("unresolved_legacy_reference");
  return found.targetId;
}

async function apply(
  ctx: MutationCtx,
  namespace: string,
  pass: 1 | 2,
  fingerprint: string,
  plan: RestorePlan,
) {
  const existing = await mapping(
    ctx,
    namespace,
    plan.sourceTable,
    plan.sourceKey,
  );
  if (existing && existing.fingerprint !== fingerprint)
    throw new Error("restore_row_fingerprint_mismatch");
  if (
    existing &&
    (["imported", "converted", "retained"].includes(existing.status) ||
      (existing.status === "blocked" &&
        existing.reason !== "target_validation_or_reference_failed"))
  )
    return existing.status;
  const record: Omit<
    WithoutSystemFields<Doc<"postgresRestoreRows">>,
    "status" | "targetId"
  > = {
    namespace,
    sourceTable: plan.sourceTable,
    sourceKey: plan.sourceKey,
    fingerprint,
    warnings: plan.warnings,
    updatedAt: Date.now(),
  };
  if (plan.targetTable) record.targetTable = plan.targetTable;
  if (plan.reason) record.reason = plan.reason;
  if (plan.action === "blocked" || plan.action === "retained") {
    if (!existing)
      await ctx.db.insert("postgresRestoreRows", {
        ...record,
        status: plan.action,
      });
    return plan.action;
  }
  if (plan.action === "patch" && pass === 1) return "deferred";
  if (!plan.targetTable) throw new Error("missing_target_table");
  if (pass === 1 && existing?.targetId) return existing.status;
  const data = object(JSON.parse(JSON.stringify(plan.data)));
  for (const reference of plan.references) {
    if (pass === 1 && !reference.required) {
      // Optional arrays contain unresolved placeholders; omit the entire array
      // until pass 2. Optional nested scalar IDs were omitted by the planner.
      if (Array.isArray(data[reference.path[0]]))
        delete data[reference.path[0]];
      continue;
    }
    const id = await resolveReference(
      ctx,
      namespace,
      reference.sourceTable,
      reference.sourceKey,
    );
    if (plan.sourceTable !== "message_edges") setPath(data, reference.path, id);
  }
  let targetId = existing?.targetId;
  if (plan.action === "patch") {
    if (!plan.targetSource) throw new Error("missing_patch_identity");
    targetId = await resolveReference(
      ctx,
      namespace,
      plan.targetSource.table,
      plan.targetSource.key,
    );
  }
  // This is the one dynamic database boundary: table is a closed validator union,
  // the planner checks its existing schema, and Convex enforces the actual table
  // schema at insert/patch. No broadening of application validators is permitted.
  if (!targetId) {
    if (pass !== 1) throw new Error("first_pass_not_complete");
    try {
      targetId = await ctx.db.insert(
        plan.targetTable,
        // SAFETY: the closed table union and existing Convex schema validate this
        // dynamic document at the write boundary; the atomic rejection is tested.
        data as WithoutSystemFields<Doc<TargetTable>>,
      );
    } catch {
      // Convex validation messages can contain the complete rejected document.
      // Throw a new code without a cause so it cannot reach logs or RPC output.
      throw new Error("restore_target_schema_rejected");
    }
  } else {
    const normalized = ctx.db.normalizeId(plan.targetTable, targetId);
    if (!normalized || !(await ctx.db.get(normalized)))
      throw new Error("mapped_document_missing");
    if (plan.sourceTable === "message_edges") {
      const childId = ctx.db.normalizeId("messages", targetId);
      const child = childId ? await ctx.db.get(childId) : null;
      const parentRef = plan.references[0];
      const parentId = parentRef
        ? await resolveReference(
            ctx,
            namespace,
            parentRef.sourceTable,
            parentRef.sourceKey,
          )
        : undefined;
      if (!parentId || !child?.parentMessageIds?.some((id) => id === parentId))
        throw new Error("edge_not_restored_in_child_parent_array");
    } else {
      try {
        await ctx.db.patch(normalized, data);
      } catch {
        throw new Error("restore_target_schema_rejected");
      }
    }
  }
  const status =
    pass === 1
      ? "inserted"
      : plan.action === "patch"
        ? "converted"
        : "imported";
  if (existing)
    await ctx.db.patch(existing._id, {
      ...record,
      targetId,
      status,
      reason: plan.reason,
    });
  else
    await ctx.db.insert("postgresRestoreRows", { ...record, targetId, status });
  return status;
}

export const batch = internalMutation({
  args: {
    ...identityArgs,
    pass: v.union(v.literal(1), v.literal(2)),
    items: v.array(v.object({ fingerprint: v.string(), plan: planValidator })),
  },
  handler: async (ctx, args) => {
    await requireRun(ctx, args);
    if (
      args.items.length > MAX_BATCH_ROWS ||
      new TextEncoder().encode(JSON.stringify(args.items)).length >
        MAX_BATCH_BYTES
    )
      throw new Error("restore_batch_too_large");
    const statuses: string[] = [];
    for (const item of args.items)
      statuses.push(
        await apply(
          ctx,
          args.namespace,
          args.pass,
          item.fingerprint,
          item.plan,
        ),
      );
    return statuses;
  },
});

// A failed transaction is retried one row at a time by the runner. Only sanitized
// codes are recorded; never persist a Convex validator error containing row data.
export const block = internalMutation({
  args: {
    ...identityArgs,
    fingerprint: v.string(),
    plan: planValidator,
    reason: v.union(
      v.literal("target_validation_or_reference_failed"),
      v.literal("row_exceeds_batch_byte_limit"),
    ),
  },
  handler: async (ctx, args) => {
    await requireRun(ctx, args);
    if (new TextEncoder().encode(JSON.stringify(args)).length > MAX_BATCH_BYTES)
      throw new Error("restore_batch_too_large");
    const existing = await mapping(
      ctx,
      args.namespace,
      args.plan.sourceTable,
      args.plan.sourceKey,
    );
    if (existing && existing.fingerprint !== args.fingerprint)
      throw new Error("restore_row_fingerprint_mismatch");
    if (existing?.status === "inserted") {
      await ctx.db.patch(existing._id, {
        status: "blocked",
        reason: args.reason,
        updatedAt: Date.now(),
      });
      return;
    }
    await apply(ctx, args.namespace, 2, args.fingerprint, {
      ...args.plan,
      action: "blocked",
      data: {},
      references: [],
      reason: args.reason,
    });
  },
});

export const audit = internalQuery({
  args: { namespace: v.string(), cursor: v.union(v.string(), v.null()) },
  handler: async (ctx, args) => {
    const page = await ctx.db
      .query("postgresRestoreRows")
      .withIndex("by_namespace", (q) => q.eq("namespace", args.namespace))
      .paginate({ cursor: args.cursor, numItems: 100 });
    return {
      ...page,
      page: page.page.map(
        ({
          sourceTable,
          sourceKey,
          status,
          reason,
          warnings,
          targetTable,
          targetId,
        }) => ({
          sourceTable,
          sourceKey,
          status,
          reason,
          warnings,
          targetTable,
          targetId,
        }),
      ),
    };
  },
});
