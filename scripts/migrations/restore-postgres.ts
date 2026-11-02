/** Admin-only offline planner / resumable importer. Never connects to Postgres. */
import { createDecipheriv, createHash } from "node:crypto";
import {
  chmodSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildPlans,
  isEmptyByokSettings,
  object,
  parseSnapshot,
  type RestorePlan,
  type Row,
  sourceKey,
} from "../../packages/backend/convex/migrations/restorePostgresPlan";

const MAX_BYTES = 350_000;
const MAX_ROWS = 40;
const hash = (value: string) =>
  createHash("sha256").update(value).digest("hex");
const bytes = (items: Item[]) => Buffer.byteLength(JSON.stringify(items));
type Item = { fingerprint: string; plan: RestorePlan };
class FunctionFailure extends Error {}

export function createAdminRpc(
  target: URL,
  adminKey: string,
  request: typeof fetch = fetch,
) {
  return async (
    functionName: string,
    args: Row,
    query = false,
  ): Promise<unknown> => {
    // Match ConvexHttpClient's admin wire protocol without printing its debug
    // logLines or errorMessage, which can include application row payloads.
    const response = await request(
      `${target.origin}/api/${query ? "query" : "mutation"}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Convex ${adminKey}`,
        },
        body: JSON.stringify({
          path: `migrations/restorePostgres:${functionName}`,
          args: [args],
          format: "convex_encoded_json",
        }),
        signal: AbortSignal.timeout(90_000),
      },
    );
    if (!response.ok && response.status !== 560)
      throw new Error(`restore_rpc_http_${response.status}`);
    const result = object(await response.json());
    if (result.status !== "success")
      throw new FunctionFailure("restore_rpc_function_failed");
    return result.value;
  };
}

export function verifyByok(
  row: Row,
  sourceKeyMaterial?: string,
  targetKeyMaterial?: string,
): boolean {
  if (isEmptyByokSettings(row)) return true;
  if (!sourceKeyMaterial || !targetKeyMaterial) return false;
  if (
    [sourceKeyMaterial, targetKeyMaterial].some(
      (value) => value.length === 64 && !/^[a-f0-9]{64}$/i.test(value),
    )
  )
    return false;
  const key = (value: string) =>
    /^[a-f0-9]{64}$/i.test(value)
      ? Buffer.from(value, "hex")
      : createHash("sha256").update(value).digest();
  const source = key(sourceKeyMaterial);
  if (!source.equals(key(targetKeyMaterial))) return false;
  if (
    typeof row.encryption_ivs !== "string" ||
    typeof row.auth_tags !== "string"
  )
    return false;
  const ivs = row.encryption_ivs.split(":");
  const tags = row.auth_tags.split(":");
  if (ivs.length !== 4 || tags.length !== 4) return false;
  const fields = [
    "encrypted_vercel_gateway_key",
    "encrypted_open_router_key",
    "encrypted_groq_key",
    "encrypted_deepgram_key",
  ];
  let encryptedCount = 0;
  try {
    fields.forEach((field, i) => {
      const ciphertext = row[field];
      if (!ciphertext) {
        if (ivs[i] || tags[i]) throw new Error("orphan_encryption_metadata");
        return;
      }
      if (
        typeof ciphertext !== "string" ||
        !/^(?:[a-f0-9]{2})+$/i.test(ciphertext) ||
        !/^[a-f0-9]{32}$/i.test(ivs[i]) ||
        !/^[a-f0-9]{32}$/i.test(tags[i])
      )
        throw new Error("invalid_ciphertext_format");
      const decipher = createDecipheriv(
        "aes-256-gcm",
        source,
        Buffer.from(ivs[i], "hex"),
      );
      decipher.setAuthTag(Buffer.from(tags[i], "hex"));
      // Authentication only. Plaintext is never returned, logged or written.
      decipher.update(Buffer.from(ciphertext, "hex"));
      decipher.final();
      encryptedCount++;
    });
    return encryptedCount > 0 || row.byok_enabled === false;
  } catch {
    return false;
  }
}

export function batches(items: Item[]): Item[][] {
  const result: Item[][] = [];
  let current: Item[] = [];
  for (const item of items) {
    if (bytes([item]) > MAX_BYTES) {
      if (current.length) result.push(current);
      current = [];
      result.push([item]);
      continue;
    }
    if (current.length >= MAX_ROWS || bytes([...current, item]) > MAX_BYTES) {
      result.push(current);
      current = [];
    }
    current.push(item);
  }
  if (current.length) result.push(current);
  return result;
}

function argument(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index < 0 ? undefined : process.argv[index + 1];
}

async function main() {
  const input = argument("--snapshot");
  const reportPath = argument("--report");
  const namespace = argument("--namespace");
  if (!input || !reportPath || !namespace)
    throw new Error(
      "required_flags: --snapshot PATH --report PRIVATE_PATH --namespace NAME [--apply]",
    );
  const apply = process.argv.includes("--apply");
  const snapshotText = readFileSync(input, "utf8");
  const snapshot = parseSnapshot(JSON.parse(snapshotText));
  const verifiedByokKeys = new Set(
    (snapshot.tables.user_api_keys ?? [])
      .filter((row) =>
        verifyByok(
          row,
          process.env.MIGRATION_SOURCE_ENCRYPTION_KEY,
          process.env.BYOD_ENCRYPTION_KEY,
        ),
      )
      .map((row) => sourceKey("user_api_keys", row)),
  );
  const plans = buildPlans(snapshot, { verifiedByokKeys });
  const items = plans.map((plan) => ({
    plan,
    fingerprint: hash(JSON.stringify(plan)),
  }));
  const snapshotHash = hash(snapshotText);
  const planHash = hash(JSON.stringify(items.map((item) => item.fingerprint)));
  const identity = { namespace, snapshotHash, planHash };
  const counts: Record<string, Record<string, number>> = {};
  for (const plan of plans) {
    counts[plan.sourceTable] ??= {};
    const table = counts[plan.sourceTable];
    table[plan.action] = (table[plan.action] ?? 0) + 1;
  }
  const report: Row = {
    ...identity,
    mode: apply ? "apply" : "dry-run",
    expectedRows: items.length,
    sourceCounts: Object.fromEntries(
      Object.entries(snapshot.tables).map(([table, rows]) => [
        table,
        rows.length,
      ]),
    ),
    plannedCounts: counts,
    derivedCounts: Object.fromEntries(
      Object.entries(counts).filter(([table]) => table.startsWith("derived_")),
    ),
    retainedTelemetryRows:
      snapshot.tables.provider_health_snapshots?.length ?? 0,
    // Private report contains legacy identifiers, never source payloads or secrets.
    rows: plans.map(({ sourceTable, sourceKey, action, reason, warnings }) => ({
      sourceTable,
      sourceKey,
      action,
      reason,
      warnings,
    })),
  };
  const privateReport = resolve(reportPath);
  const root = resolve(fileURLToPath(new URL("../../", import.meta.url)));
  if (privateReport === resolve(input) || privateReport.startsWith(`${root}/`))
    throw new Error(
      "report_must_be_private_and_outside_repository_not_snapshot",
    );
  if (!existsSync(dirname(privateReport)))
    mkdirSync(dirname(privateReport), { recursive: true, mode: 0o700 });
  const save = () => {
    writeFileSync(privateReport, JSON.stringify(report, null, 2), {
      mode: 0o600,
    });
    chmodSync(privateReport, 0o600);
  };
  save();
  console.log(
    JSON.stringify({
      mode: report.mode,
      expectedRows: items.length,
      counts,
      retainedTelemetryRows: report.retainedTelemetryRows,
    }),
  );
  if (!apply) return;
  const url = process.env.RESTORE_CONVEX_URL;
  const adminKey = process.env.RESTORE_CONVEX_ADMIN_KEY;
  if (!url || !adminKey)
    throw new Error("RESTORE_CONVEX_URL_and_RESTORE_CONVEX_ADMIN_KEY_required");
  const target = new URL(url);
  if (
    target.protocol !== "https:" ||
    !target.hostname.endsWith(".convex.cloud")
  )
    throw new Error("expected_https_convex_cloud_target");
  // Explicit acknowledgement prevents an accidental environment-target mixup.
  if (argument("--confirm-target") !== target.hostname)
    throw new Error("confirm_target_hostname_required");
  const rpc = createAdminRpc(target, adminKey);
  await rpc("begin", { ...identity, expectedRows: items.length });
  const failures: Row[] = [];
  const markBlocked = async (
    pass: 1 | 2,
    item: Item,
    reason:
      | "row_exceeds_batch_byte_limit"
      | "target_validation_or_reference_failed",
  ) => {
    const safePlan = { ...item.plan, data: {}, references: [] };
    await rpc("block", {
      ...identity,
      fingerprint: item.fingerprint,
      plan: safePlan,
      reason,
    });
    failures.push({
      sourceTable: item.plan.sourceTable,
      sourceKey: item.plan.sourceKey,
      pass,
      reason,
    });
  };
  const send = async (pass: 1 | 2, batch: Item[]) => {
    if (batch.length === 1 && bytes(batch) > MAX_BYTES) {
      await markBlocked(pass, batch[0], "row_exceeds_batch_byte_limit");
      return;
    }
    try {
      await rpc("batch", { ...identity, pass, items: batch });
    } catch (error) {
      if (!(error instanceof FunctionFailure)) throw error;
      // A Convex mutation is atomic: retries cannot duplicate committed inserts.
      for (const item of batch) {
        try {
          await rpc("batch", { ...identity, pass, items: [item] });
        } catch (error) {
          if (!(error instanceof FunctionFailure)) throw error;
          await markBlocked(
            pass,
            item,
            "target_validation_or_reference_failed",
          );
        }
      }
    }
  };
  for (const pass of [1, 2] as const) {
    for (const batch of batches(items)) await send(pass, batch);
    report.completedPass = pass;
    report.failures = failures;
    save();
    console.log(
      JSON.stringify({ completedPass: pass, failures: failures.length }),
    );
  }
  const auditRows: Row[] = [];
  let cursor: string | null = null;
  do {
    const page = object(await rpc("audit", { namespace, cursor }, true));
    if (!Array.isArray(page.page)) throw new Error("invalid_audit_page");
    auditRows.push(...page.page.map(object));
    cursor = page.isDone ? null : String(page.continueCursor);
  } while (cursor);
  report.audit = auditRows;
  const complete =
    auditRows.length === items.length &&
    !auditRows.some((row) => row.status === "inserted");
  report.accountingComplete = complete;
  save();
  const blocked = auditRows.filter((row) => row.status === "blocked").length;
  console.log(
    JSON.stringify({
      accountingComplete: complete,
      auditedRows: auditRows.length,
      blocked,
    }),
  );
  if (!complete || blocked) process.exitCode = 2;
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  main().catch(() => {
    // Intentionally discard exceptions: source values can occur in parser errors.
    console.error(
      "Restore stopped safely; inspect the private report and deployment diagnostics. No source database was modified.",
    );
    process.exitCode = 1;
  });
