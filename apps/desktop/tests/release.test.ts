import { expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import path from "node:path";

const root = new URL("../../../", import.meta.url);
const json = async (file: string) =>
  JSON.parse(await readFile(new URL(file, root), "utf8"));

test("desktop bundle points to a committed square PNG and versions remain aligned", async () => {
  const config = await json("apps/desktop/src-tauri/tauri.conf.json");
  const pkg = await json("apps/desktop/package.json");
  const cargo = await readFile(
    new URL("apps/desktop/src-tauri/Cargo.toml", root),
    "utf8",
  );
  expect(config.version).toBe("0.1.0");
  expect(pkg.version).toBe(config.version);
  expect(cargo).toContain(`version = "${config.version}"`);
  for (const icon of config.bundle.icon) {
    const bytes = await readFile(
      new URL(path.join("apps/desktop/src-tauri", icon), root),
    );
    if (icon.endsWith(".icns")) {
      expect(bytes.subarray(0, 4).toString()).toBe("icns");
      expect(bytes.readUInt32BE(4)).toBe(bytes.length);
    } else if (icon.endsWith(".ico")) {
      expect(bytes.subarray(0, 4).toString("hex")).toBe("00000100");
    } else {
      expect(bytes.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
      expect(bytes.readUInt32BE(16)).toBe(bytes.readUInt32BE(20));
      expect(bytes.readUInt32BE(16)).toBeGreaterThanOrEqual(512);
    }
  }
});

test("desktop automatic releases stay suspended instead of producing empty drafts", async () => {
  const config = await json(".release-please-config.json");
  const manifest = await json(".release-please-manifest.json");
  expect(config.packages["apps/desktop"]).toBeUndefined();
  expect(manifest["apps/desktop"]).toBeUndefined();
});

test("rollback and promotion serialize, and health-only staging cannot promote", async () => {
  const release = Bun.YAML.parse(
    await readFile(new URL(".github/workflows/release.yml", root), "utf8"),
  );
  const rollback = Bun.YAML.parse(
    await readFile(new URL(".github/workflows/rollback.yml", root), "utf8"),
  );
  expect(release.concurrency).toEqual({
    group: "production-deploy",
    "cancel-in-progress": false,
  });
  expect(rollback.concurrency).toEqual(release.concurrency);
  expect(
    release.jobs["deploy-production"].steps.some((step: { run?: string }) =>
      step.run?.includes("vercel promote"),
    ),
  ).toBe(false);
  const promotion = release.jobs["promote-production"];
  expect(promotion.if).toContain("github.event_name == 'workflow_dispatch'");
  expect(promotion.if).toContain("inputs.promote_deployment != ''");
  expect(promotion.steps[0].run).toBe(
    'test "$ACKNOWLEDGE_USER_JOURNEYS" = "true"',
  );
  expect(promotion.steps.at(-1).run).toBe(
    'vercel promote "$DEPLOYMENT_URL" --yes',
  );
});
