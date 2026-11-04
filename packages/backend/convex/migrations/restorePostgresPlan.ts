import type { ValidatorJSON } from "convex/values";
import {
  getHistoricalPreferenceCategory,
  PREFERENCE_CATEGORIES,
} from "../../../shared/src/preferences";
import { normalizeTagSlug } from "../../../shared/src/utils/tagUtils";
import schema from "../schema";

export type Row = Record<string, unknown>;
export type Snapshot = { exportedAt: string; tables: Record<string, Row[]> };
export type Reference = {
  path: string[];
  sourceTable: string;
  sourceKey: string;
  required: boolean;
};
export type RestorePlan = {
  sourceTable: string;
  sourceKey: string;
  action: "insert" | "patch" | "blocked" | "retained";
  targetTable?: TargetTable;
  targetSource?: { table: string; key: string };
  data: Row;
  references: Reference[];
  warnings: string[];
  reason?: string;
};

export const TABLES = {
  users: "users",
  projects: "projects",
  conversations: "conversations",
  messages: "messages",
  memory_embeddings: "memories",
  notes: "notes",
  tasks: "tasks",
  templates: "templates",
  user_preferences: "userPreferences",
  bookmarks: "bookmarks",
  comparison_votes: "votes",
  source_metadata: "sourceMetadata",
  message_sources: "sources",
  message_tool_calls: "toolCalls",
  usage_records: "usageRecords",
  composio_connections: "composioConnections",
  cli_api_keys: "cliApiKeys",
  user_api_keys: "userApiKeys",
  knowledge_sources: "knowledgeSources",
  feedback_entries: "feedback",
  user_onboarding: "userOnboarding",
  shares: "shares",
  notifications: "notifications",
  admin_settings: "adminSettings",
  derived_project_conversations: "projectConversations",
  derived_project_notes: "projectNotes",
  derived_tags: "tags",
  derived_note_tags: "noteTags",
  derived_task_tags: "taskTags",
  derived_bookmark_tags: "bookmarkTags",
} as const;
export type TargetTable = (typeof TABLES)[keyof typeof TABLES];
const TARGET_BY_SOURCE = new Map<string, TargetTable>(Object.entries(TABLES));
const SOURCE_BY_TARGET = Object.fromEntries(
  Object.entries(TABLES).map(([source, target]) => [target, source]),
);
const OPERATIONAL = new Set([
  "provider_health_snapshots",
  "generation_requests",
  "generation_sessions",
  "generation_checkpoints",
  "generation_request_integrations",
  "conversation_integration_events",
  "routing_candidate_scores",
  "routing_decisions",
  "routing_feedback",
  "routing_outcomes",
  "routing_policies",
  "routing_examples",
  "auto_router_config",
  "starter_suggestion_caches",
]);

export function object(value: unknown): Row {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("expected_object");
  }
  // SAFETY: this guard establishes only a dictionary; its values intentionally
  // remain unknown until conversion against the destination table validator.
  return value as Row;
}
export function text(value: unknown): string {
  if (typeof value !== "string" || !value)
    throw new Error("expected_identifier");
  return value;
}
export function parseSnapshot(value: unknown): Snapshot {
  const root = object(value);
  const tables: Snapshot["tables"] = {};
  for (const [table, rows] of Object.entries(object(root.tables))) {
    if (!Array.isArray(rows)) throw new Error("invalid_snapshot_table");
    tables[table] = rows.map(object);
  }
  return { exportedAt: text(root.exportedAt), tables };
}

const ENCRYPTED_KEY_FIELDS = [
  "encrypted_vercel_gateway_key",
  "encrypted_open_router_key",
  "encrypted_groq_key",
  "encrypted_deepgram_key",
] as const;
export function isEmptyByokSettings(row: Row): boolean {
  const emptySlots = (value: unknown) =>
    value == null || value === "" || value === ":::";
  return (
    ENCRYPTED_KEY_FIELDS.every(
      (field) => row[field] == null || row[field] === "",
    ) &&
    emptySlots(row.encryption_ivs) &&
    emptySlots(row.auth_tags)
  );
}

function convertAdminSettings(
  row: Row,
  tables: Snapshot["tables"],
  plan: RestorePlan,
): Row {
  const settings = object(row.value);
  const limits = object(settings.limits ?? {});
  const memory = object(settings.memory ?? {});
  const search = object(settings.search ?? {});
  const proTier = object(settings.proTier ?? {});
  const transcript = object(settings.transcriptProvider ?? {});
  const admins = (tables.user_admin_settings ?? []).filter(
    (admin) => admin.is_admin === true,
  );
  const actorId =
    row.updated_by ?? (admins.length === 1 ? admins[0].user_id : undefined);
  const actor = (tables.users ?? []).find((user) => user.id === actorId);
  if (!actor) throw new Error("settings_admin_identity_missing_or_ambiguous");
  if (row.updated_by == null)
    plan.warnings.push(
      "missing_settings_updated_by_attributed_to_only_source_admin",
    );
  if (settings.alertEmail == null)
    plan.warnings.push(
      "missing_alert_recipient_defaulted_to_source_admin_email",
    );
  const represented: Record<string, string[]> = {
    limits: [
      "defaultMonthlyBudget",
      "defaultBudgetAlertThreshold",
      "budgetHardLimitEnabled",
      "defaultDailyMessageLimit",
      "defaultMaxIntegrations",
    ],
    memory: ["autoExtractionEnabled", "extractEveryNMessages"],
    search: ["hybridEnabled"],
    proTier: [
      "proModelsEnabled",
      "tier1DailyProModelLimit",
      "tier2MonthlyProModelLimit",
    ],
    transcriptProvider: ["provider", "costPerMinute"],
  };
  for (const [group, value] of Object.entries(settings)) {
    if (group === "alertEmail") continue;
    const fields = represented[group] ?? [];
    for (const field of Object.keys(object(value))) {
      if (!fields.includes(field))
        plan.warnings.push(`unrepresented_setting:${group}.${field}`);
    }
  }
  return {
    autoMemoryExtractEnabled: memory.autoExtractionEnabled,
    autoMemoryExtractInterval: memory.extractEveryNMessages,
    enableHybridSearch: search.hybridEnabled,
    defaultMonthlyBudget: limits.defaultMonthlyBudget,
    defaultBudgetAlertThreshold: limits.defaultBudgetAlertThreshold,
    budgetHardLimitEnabled: limits.budgetHardLimitEnabled,
    defaultDailyMessageLimit: limits.defaultDailyMessageLimit,
    maxActiveIntegrations: limits.defaultMaxIntegrations,
    proModelsEnabled: proTier.proModelsEnabled,
    tier1DailyProModelLimit: proTier.tier1DailyProModelLimit,
    tier2MonthlyProModelLimit: proTier.tier2MonthlyProModelLimit,
    transcriptProvider: transcript.provider,
    transcriptCostPerMinute: transcript.costPerMinute,
    alertEmail: settings.alertEmail ?? actor.email,
    updatedBy: actorId,
    updatedAt: row.updated_at,
  };
}
const camel = (key: string) =>
  key.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
export function sourceKey(table: string, row: Row): string {
  if (table === "message_edges") {
    return JSON.stringify([
      row.child_message_id,
      row.parent_message_id,
      row.edge_type,
    ]);
  }
  if (table === "user_preferences")
    return JSON.stringify([row.user_id, row.key]);
  return text(row.id ?? row.user_id ?? row.key);
}

export function vector(value: unknown): number[] {
  let parsed: unknown = value;
  if (typeof value === "string") {
    try {
      parsed = JSON.parse(value);
    } catch {
      throw new Error("invalid_embedding_serialization");
    }
  }
  if (
    !Array.isArray(parsed) ||
    parsed.length !== 1536 ||
    !parsed.every((x) => typeof x === "number" && Number.isFinite(x))
  ) {
    throw new Error("embedding_dimension_or_value_mismatch");
  }
  return parsed;
}

/** Match the target contract; omit SQL null only when an optional type disallows it. */
function convertTargetValue(
  value: unknown,
  validator: ValidatorJSON,
  plan: RestorePlan,
  path: string[] = [],
  optional = false,
): unknown {
  if (value === null || value === undefined) {
    if (
      value === null &&
      (validator.type === "null" ||
        validator.type === "any" ||
        (validator.type === "union" &&
          validator.value.some(
            (member) => member.type === "null" || member.type === "any",
          )))
    )
      return null;
    if (optional) return undefined;
    throw new Error(`required_field:${path.join(".")}`);
  }
  switch (validator.type) {
    case "id": {
      if (
        validator.tableName === "_storage" ||
        validator.tableName === "_scheduled_functions"
      ) {
        throw new Error(
          "external_storage_or_scheduler_id_requires_manual_restore",
        );
      }
      const source = SOURCE_BY_TARGET[validator.tableName];
      if (!source) throw new Error("unsupported_reference_table");
      plan.references.push({
        path,
        sourceTable: source,
        sourceKey: text(value),
        required: !optional,
      });
      return undefined;
    }
    case "object": {
      const input = object(value);
      const output: Row = {};
      for (const key of Object.keys(input)) {
        if (!(key in validator.value))
          plan.warnings.push(`unrepresented_field:${[...path, key].join(".")}`);
      }
      for (const [key, field] of Object.entries(validator.value)) {
        const result = convertTargetValue(
          input[key],
          field.fieldType,
          plan,
          [...path, key],
          field.optional,
        );
        if (result !== undefined) output[key] = result;
      }
      return output;
    }
    case "array": {
      if (!Array.isArray(value))
        throw new Error(`invalid_array:${path.join(".")}`);
      return value.map(
        (item, i) =>
          convertTargetValue(
            item,
            validator.value,
            plan,
            [...path, String(i)],
            optional,
          ) ?? null,
      );
    }
    case "union": {
      for (const member of validator.value) {
        const refs = plan.references.length;
        const warnings = plan.warnings.length;
        try {
          return convertTargetValue(value, member, plan, path, optional);
        } catch {
          plan.references.length = refs;
          plan.warnings.length = warnings;
        }
      }
      throw new Error(`invalid_union:${path.join(".")}`);
    }
    case "any":
      return value;
    case "string":
      if (typeof value === "string") return value;
      break;
    case "boolean":
      if (typeof value === "boolean") return value;
      break;
    case "number":
      if (typeof value === "number" && Number.isFinite(value)) return value;
      break;
    case "literal":
      if (value === validator.value) return value;
      break;
    case "null":
      if (value === null) return value;
      break;
  }
  throw new Error(`invalid_value:${path.join(".")}`);
}

export function targetValidator(table: TargetTable): ValidatorJSON {
  const validator = schema.tables[table].validator;
  // Convex 1.31 exposes this getter at runtime but strips its @internal type
  // from declarations. Keep this version-specific schema introspection here.
  // SAFETY: this getter is implemented by the installed Convex Validator base
  // class; its runtime value is the same schema deployed for write validation.
  return (validator as typeof validator & { readonly json: ValidatorJSON })
    .json;
}

export function setPath(target: Row, path: string[], value: unknown): void {
  let current: Row | unknown[] = target;
  for (const part of path.slice(0, -1)) {
    const next: unknown = Array.isArray(current)
      ? current[Number(part)]
      : current[part];
    if (!next || typeof next !== "object")
      throw new Error("invalid_reference_path");
    current = Array.isArray(next) ? next : object(next);
  }
  const last = path[path.length - 1];
  if (Array.isArray(current)) current[Number(last)] = value;
  else current[last] = value;
}

function deriveRelationshipRows(
  tables: Snapshot["tables"],
): Snapshot["tables"] {
  const derived: Snapshot["tables"] = {
    derived_project_conversations: [],
    derived_project_notes: [],
    derived_tags: [],
    derived_note_tags: [],
    derived_task_tags: [],
    derived_bookmark_tags: [],
  };
  for (const row of tables.conversations ?? []) {
    if (row.project_id != null)
      derived.derived_project_conversations.push({
        id: row.id,
        project_id: row.project_id,
        conversation_id: row.id,
        added_at: row.created_at,
        added_by: row.user_id,
      });
  }
  for (const row of tables.notes ?? []) {
    if (row.project_id != null)
      derived.derived_project_notes.push({
        id: row.id,
        project_id: row.project_id,
        note_id: row.id,
        added_at: row.created_at,
        user_id: row.user_id,
      });
  }
  const tags = new Map<string, Row>();
  for (const [source, junction, entityField] of [
    ["notes", "derived_note_tags", "note_id"],
    ["tasks", "derived_task_tags", "task_id"],
    ["bookmarks", "derived_bookmark_tags", "bookmark_id"],
  ]) {
    for (const row of tables[source] ?? []) {
      if (!Array.isArray(row.tags)) continue;
      const seen = new Set<string>();
      for (const value of row.tags) {
        if (typeof value !== "string" || !value.trim()) continue;
        const slug = normalizeTagSlug(value);
        if (seen.has(slug)) continue;
        seen.add(slug);
        const identity = JSON.stringify([row.user_id, slug]);
        let tag = tags.get(identity);
        if (!tag) {
          // Do not put potentially private tag text into mapping/report keys.
          tag = {
            id: `derived-tag-${tags.size}`,
            user_id: row.user_id,
            slug,
            display_name: value,
            scope: "user",
            path: `/${slug}`,
            depth: 0,
            usage_count: 0,
            created_at: row.created_at,
            updated_at: row.updated_at ?? row.created_at,
          };
          tags.set(identity, tag);
          derived.derived_tags.push(tag);
        }
        tag.usage_count = Number(tag.usage_count) + 1;
        const link: Row = {
          id: JSON.stringify([row.id, tag.id]),
          [entityField]: row.id,
          tag_id: tag.id,
          user_id: row.user_id,
        };
        if (source === "tasks") link.added_at = row.created_at;
        else link.created_at = row.created_at;
        derived[junction].push(link);
      }
    }
  }
  return derived;
}

export function buildPlans(
  snapshot: Snapshot,
  options: { verifiedByokKeys?: Set<string> } = {},
): RestorePlan[] {
  const tables = {
    ...snapshot.tables,
    ...deriveRelationshipRows(snapshot.tables),
  };
  const messages = new Map((tables.messages ?? []).map((r) => [text(r.id), r]));
  const conversations = new Map(
    (tables.conversations ?? []).map((r) => [text(r.id), r]),
  );
  const parents = new Map<string, Row[]>();
  for (const edge of tables.message_edges ?? []) {
    const key = text(edge.child_message_id);
    const list = parents.get(key) ?? [];
    list.push(edge);
    parents.set(key, list);
  }
  for (const list of parents.values())
    list.sort(
      (a, b) =>
        Number(a.position) - Number(b.position) ||
        text(a.parent_message_id).localeCompare(text(b.parent_message_id)),
    );
  const active = new Set<string>();
  const cycleCache = new Map<string, boolean>();
  const hasCyclicAncestry = (
    id: string,
    visiting = new Set<string>(),
  ): boolean => {
    if (visiting.has(id)) return true;
    const known = cycleCache.get(id);
    if (known !== undefined) return known;
    visiting.add(id);
    const cyclic = (parents.get(id) ?? []).some((edge) =>
      hasCyclicAncestry(text(edge.parent_message_id), visiting),
    );
    visiting.delete(id);
    cycleCache.set(id, cyclic);
    return cyclic;
  };
  for (const conv of conversations.values()) {
    let cursor = conv.active_leaf_message_id;
    const visited = new Set<string>();
    while (typeof cursor === "string" && !visited.has(cursor)) {
      visited.add(cursor);
      active.add(cursor);
      cursor = parents.get(cursor)?.[0]?.parent_message_id;
    }
  }
  const plans: RestorePlan[] = [];
  const seen = new Set<string>();
  for (const [table, rows] of Object.entries(tables)) {
    // Disposable telemetry is explicitly counted in the private runner report;
    // retaining 52k health samples must not consume core-import transactions.
    if (table === "provider_health_snapshots") continue;
    for (const [index, row] of rows.entries()) {
      let key: string;
      let invalidKey = false;
      try {
        key = sourceKey(table, row);
      } catch {
        key = `invalid-key-row-${index}`;
        invalidKey = true;
      }
      const plan: RestorePlan = {
        sourceTable: table,
        sourceKey: key,
        action: "insert",
        data: {},
        references: [],
        warnings: [],
      };
      plans.push(plan);
      const identity = JSON.stringify([table, key]);
      if (seen.has(identity))
        throw new Error(`duplicate_source_identity:${table}`);
      seen.add(identity);
      if (invalidKey) {
        plan.action = "blocked";
        plan.reason = "missing_source_identity";
        continue;
      }
      try {
        if (table === "message_edges") {
          const child = messages.get(text(row.child_message_id));
          const parent = messages.get(text(row.parent_message_id));
          if (
            !child ||
            !parent ||
            child.conversation_id !== parent.conversation_id
          )
            throw new Error("invalid_or_cross_conversation_edge");
          if (row.edge_type !== "reply")
            throw new Error("unsupported_edge_type");
          plan.action = "patch";
          plan.targetTable = "messages";
          plan.targetSource = {
            table: "messages",
            key: text(row.child_message_id),
          };
          // The complete ordered parent array lives on the message plan. Each edge
          // still gets its own durable, individually verified conversion record.
          plan.references = [
            {
              path: ["parentMessageId"],
              sourceTable: "messages",
              sourceKey: text(row.parent_message_id),
              required: true,
            },
          ];
          plan.reason = "edge_represented_in_message_parent_array";
          if (row.created_at != null)
            plan.warnings.push("edge_timestamp_retained_in_snapshot_only");
          continue;
        }
        if (
          ["message_embeddings", "note_embeddings", "task_embeddings"].includes(
            table,
          )
        ) {
          const entity = table.replace("_embeddings", "s");
          plan.action = "patch";
          plan.targetTable = TARGET_BY_SOURCE.get(entity);
          if (!plan.targetTable)
            throw new Error("unsupported_embedding_entity");
          plan.targetSource = {
            table: entity,
            key: text(
              row[
                table === "message_embeddings"
                  ? "message_id"
                  : table === "note_embeddings"
                    ? "note_key"
                    : "task_key"
              ],
            ),
          };
          plan.data = { embedding: vector(row.embedding) };
          plan.reason = "embedding_attached_without_regeneration";
          continue;
        }
        if (table === "user_admin_settings") {
          plan.action = "patch";
          plan.targetTable = "users";
          plan.targetSource = { table: "users", key: text(row.user_id) };
          plan.data = { tier: row.tier, isAdmin: row.is_admin };
          continue;
        }
        if (OPERATIONAL.has(table)) {
          plan.action = "retained";
          plan.reason =
            "operational_or_configuration_history_retained_in_private_snapshot_and_postgres";
          continue;
        }
        if (table === "tts_cache")
          throw new Error("object_storage_cache_not_convex_storage");
        const target = TARGET_BY_SOURCE.get(table);
        if (!target)
          throw new Error("no_target_contract_manual_conversion_required");
        plan.targetTable = target;
        const data: Row = {};
        const validator = targetValidator(target);
        if (validator.type !== "object")
          throw new Error("invalid_target_schema");
        for (const [sourceField, value] of Object.entries(row)) {
          if (sourceField === "id") continue;
          const field =
            sourceField === "encryption_ivs"
              ? "encryptionIVs"
              : camel(sourceField);
          if (field in validator.value) data[field] = value;
          else if (value !== null)
            plan.warnings.push(`unrepresented_field:${sourceField}`);
        }
        if (table === "admin_settings") {
          Object.assign(data, convertAdminSettings(row, tables, plan));
          plan.warnings = plan.warnings.filter(
            (warning) => warning !== "unrepresented_field:value",
          );
        }
        if (table === "conversations") {
          const history = [...messages.values()].filter(
            (m) => m.conversation_id === row.id,
          );
          data.lastMessageAt = Math.max(
            Number(row.created_at),
            ...history.map((m) => Number(m.created_at)),
          );
          data.messageCount = history.length;
          data.branchCount = history.filter(
            (m) => Number(m.sibling_index) > 0,
          ).length;
          if (
            row.active_leaf_message_id != null &&
            messages.get(text(row.active_leaf_message_id))?.conversation_id !==
              row.id
          )
            throw new Error("invalid_active_leaf");
          if (
            data.modelRecommendation &&
            object(object(data.modelRecommendation).estimatedSavings)
              .costReduction == null
          ) {
            delete data.modelRecommendation;
            plan.warnings.push(
              "incomplete_cached_model_recommendation_retained_in_snapshot",
            );
          }
          if (row.thinking_effort === "none")
            plan.warnings = plan.warnings.filter(
              (w) => w !== "unrepresented_field:thinking_effort",
            );
        }
        if (table === "messages") {
          if (hasCyclicAncestry(text(row.id)))
            throw new Error("message_tree_cycle");
          const ancestry = parents.get(text(row.id)) ?? [];
          const ids = [
            ...new Set(ancestry.map((e) => text(e.parent_message_id))),
          ];
          for (const id of ids) {
            if (messages.get(id)?.conversation_id !== row.conversation_id)
              throw new Error("invalid_or_cross_conversation_edge");
          }
          let cursor = text(row.id);
          const visited = new Set<string>();
          while (parents.get(cursor)?.length) {
            if (visited.has(cursor)) throw new Error("message_tree_cycle");
            visited.add(cursor);
            cursor = text(parents.get(cursor)?.[0]?.parent_message_id);
          }
          data.parentMessageIds = ids;
          // getChildren uses the array path only when the legacy scalar is absent.
          // For merges, writing the scalar would hide children of other parents.
          if (ids.length === 1) data.parentMessageId = ids[0];
          data.rootMessageId = row.root_message_id ?? cursor;
          if (
            messages.get(text(data.rootMessageId))?.conversation_id !==
            row.conversation_id
          )
            throw new Error("invalid_root_message");
          data.isActiveBranch = active.has(text(row.id));
          if (["pending", "generating"].includes(String(data.status))) {
            data.status = "stopped";
            plan.warnings.push(
              "interrupted_generation_marked_stopped_no_replay",
            );
          }
          if (row.role === "assistant" && !row.model)
            plan.warnings.push("historical_assistant_model_missing_preserved");
        }
        if (table === "user_preferences") {
          const key = text(row.key);
          data.category = Object.hasOwn(PREFERENCE_CATEGORIES, key)
            ? PREFERENCE_CATEGORIES[key]
            : getHistoricalPreferenceCategory(key);
          if (!data.category) throw new Error("unknown_preference_category");
        }
        if (table === "memory_embeddings") {
          data.embedding = vector(row.embedding);
          data.metadata = {
            ...object(row.metadata ?? {}),
            category: row.category,
          };
          plan.warnings = plan.warnings.filter(
            (w) =>
              ![
                "unrepresented_field:category",
                "unrepresented_field:search_tsv",
                "unrepresented_field:search_document",
              ].includes(w),
          );
        }
        if (table === "comparison_votes" && row.winner_message_id != null) {
          data.winnerId = row.winner_message_id;
          plan.warnings = plan.warnings.filter(
            (warning) => warning !== "unrepresented_field:winner_message_id",
          );
        }
        if (table === "usage_records" && row.operation_type === "completion") {
          data.operationType = "text";
          plan.warnings.push("completion_operation_normalized_to_text");
        }
        if (table === "source_metadata" && row.error != null) {
          data.enrichmentError = row.error;
          plan.warnings = plan.warnings.filter(
            (warning) => warning !== "unrepresented_field:error",
          );
        }
        if (table === "knowledge_sources" && row.storage_key != null)
          throw new Error("knowledge_file_requires_object_storage_transfer");
        if (table === "user_api_keys") {
          if (isEmptyByokSettings(row)) {
            for (const field of ENCRYPTED_KEY_FIELDS) delete data[camel(field)];
            delete data.encryptionIVs;
            delete data.authTags;
            plan.warnings.push(
              "empty_byok_settings_restored_without_provider_credentials",
            );
          } else if (!options.verifiedByokKeys?.has(key))
            throw new Error(
              "byok_format_and_matching_encryption_key_not_verified",
            );
        }
        if (table === "feedback_entries" && row.screenshot_key != null)
          plan.warnings.push(
            "screenshot_retained_in_postgres_object_storage_only",
          );
        plan.data = object(convertTargetValue(data, validator, plan));
      } catch (error) {
        plan.action = "blocked";
        plan.reason =
          error instanceof Error ? error.message : "conversion_failed";
        plan.data = {};
        plan.references = [];
      }
    }
  }
  // Required dependencies first; optional/cyclic references are patched in pass 2.
  const order = Object.keys(TABLES);
  return plans.sort((a, b) => {
    const rank = (p: RestorePlan) =>
      p.action === "insert" ? order.indexOf(p.sourceTable) : order.length;
    return rank(a) - rank(b);
  });
}
