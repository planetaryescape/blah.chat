import { createCipheriv } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import {
  batches,
  createAdminRpc,
  verifyByok,
} from "../../../../scripts/migrations/restore-postgres";
import { buildPlans, type RestorePlan, type Row } from "./restorePostgresPlan";

function encryptedRow(): Row {
  const key = Buffer.alloc(32, 1);
  const iv = Buffer.alloc(16, 2);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([
    cipher.update("synthetic-credential"),
    cipher.final(),
  ]);
  return {
    id: "fixture-key",
    user_id: "fixture-user",
    byok_enabled: true,
    encrypted_vercel_gateway_key: encrypted.toString("hex"),
    encryption_ivs: `${iv.toString("hex")}:::`,
    auth_tags: `${cipher.getAuthTag().toString("hex")}:::`,
    created_at: 1,
    updated_at: 2,
  };
}

describe("restore admin runner", () => {
  it("uses Convex's admin request protocol and redacts remote validation bodies", async () => {
    const request = vi.fn<typeof fetch>();
    request.mockResolvedValueOnce(
      new Response(
        JSON.stringify({ status: "success", value: { resumed: false } }),
      ),
    );
    const rpc = createAdminRpc(
      new URL("https://fixture.convex.cloud"),
      "synthetic-admin-key",
      request,
    );
    await expect(rpc("begin", { namespace: "fixture" })).resolves.toEqual({
      resumed: false,
    });
    const [url, init] = request.mock.calls[0];
    expect(url).toBe("https://fixture.convex.cloud/api/mutation");
    expect(init?.headers).toMatchObject({
      Authorization: "Convex synthetic-admin-key",
    });
    expect(JSON.parse(String(init?.body))).toEqual({
      path: "migrations/restorePostgres:begin",
      args: [{ namespace: "fixture" }],
      format: "convex_encoded_json",
    });
    request.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          status: "error",
          errorMessage: "synthetic-private-payload",
        }),
        { status: 560 },
      ),
    );
    await expect(rpc("batch", {})).rejects.toThrow(
      /^restore_rpc_function_failed$/,
    );
    request.mockResolvedValueOnce(
      new Response("synthetic-private-payload", { status: 503 }),
    );
    await expect(rpc("batch", {})).rejects.toThrow(/^restore_rpc_http_503$/);
  });

  it("requires matching key material, authenticated ciphertext, and the exact four-field format", () => {
    const row = encryptedRow();
    const key = Buffer.alloc(32, 1).toString("hex");
    expect(verifyByok(row, key, key)).toBe(true);
    expect(verifyByok(row, key, Buffer.alloc(32, 3).toString("hex"))).toBe(
      false,
    );
    expect(verifyByok(row, key)).toBe(false);
    expect(
      verifyByok({ ...row, auth_tags: `${"0".repeat(32)}:::` }, key, key),
    ).toBe(false);
    expect(verifyByok({ ...row, encryption_ivs: null }, key, key)).toBe(false);
    expect(verifyByok({ ...row, encryption_ivs: "" }, key, key)).toBe(false);
    const plan = buildPlans(
      { exportedAt: "synthetic", tables: { user_api_keys: [row] } },
      { verifiedByokKeys: new Set(["fixture-key"]) },
    )[0];
    expect(plan.action).toBe("insert");
    expect(plan.data.encryptionIVs).toBe(row.encryption_ivs);
    expect(
      verifyByok({
        encrypted_vercel_gateway_key: "",
        encryption_ivs: null,
        auth_tags: ":::",
      }),
    ).toBe(true);
  });

  it("bounds batches by UTF-8 bytes as well as rows", () => {
    const plan: RestorePlan = {
      action: "blocked",
      sourceTable: "fixture",
      sourceKey: "fixture",
      data: {},
      references: [],
      warnings: [],
    };
    expect(
      batches(
        Array.from({ length: 41 }, () => ({ plan, fingerprint: "fixture" })),
      ).map((batch) => batch.length),
    ).toEqual([40, 1]);
    const large = { ...plan, data: { content: "界".repeat(120_000) } };
    const result = batches(
      [large, large].map((plan) => ({ plan, fingerprint: "fixture" })),
    );
    expect(result).toHaveLength(2);
    expect(
      result.every(
        (batch) => Buffer.byteLength(JSON.stringify(batch)) <= 650_000,
      ),
    ).toBe(true);
    const retainedToolOutput = {
      ...plan,
      data: { result: "x".repeat(575_000) },
    };
    const single = batches([
      { plan: retainedToolOutput, fingerprint: "fixture" },
    ]);
    expect(single).toHaveLength(1);
    expect(Buffer.byteLength(JSON.stringify(single[0]))).toBeLessThan(650_000);
  });
});
