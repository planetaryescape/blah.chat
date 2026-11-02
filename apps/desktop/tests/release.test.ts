import { expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import path from "node:path";

const root = new URL("../../../", import.meta.url);
const json = async (file: string) =>
  JSON.parse(await readFile(new URL(file, root), "utf8"));

type Workflow = {
  concurrency: unknown;
  jobs: Record<
    string,
    {
      if: string;
      needs?: string;
      environment?: string;
      env?: Record<string, string>;
      steps: Array<{
        run?: string;
        uses?: string;
        with?: { ref?: string };
        env?: Record<string, string>;
      }>;
    }
  >;
};

async function workflow(file: string): Promise<Workflow> {
  // SAFETY: these are repo-owned workflow fixtures, not external input. The
  // assertions below fail if the security-relevant expected structure changes.
  return Bun.YAML.parse(
    await readFile(new URL(file, root), "utf8"),
  ) as Workflow;
}

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
  const release = await workflow(".github/workflows/release.yml");
  const rollback = await workflow(".github/workflows/rollback.yml");
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
  expect(promotion.if).toContain("github.ref == 'refs/heads/main'");
  expect(promotion.if).toContain(
    "github.event.repository.default_branch == 'main'",
  );
  expect(promotion.if).toContain("github.ref_protected");
  expect(promotion.needs).toBe("promotion-preflight");
  const preflight = release.jobs["promotion-preflight"];
  expect(preflight.environment).toBeUndefined();
  expect(
    preflight.steps.find(
      (step: { uses?: string }) => step.uses === "actions/checkout@v6",
    )?.with?.ref,
  ).toBe("refs/heads/main");
  expect(preflight.steps[0].run).toContain('test "$REF_PROTECTED" = "true"');
  expect(preflight.steps.at(-1)?.run).toBe(
    "bun apps/desktop/scripts/promote.ts --preflight",
  );
  expect(JSON.stringify(preflight)).not.toContain("secrets.");
  expect(
    promotion.steps.find(
      (step: { uses?: string }) => step.uses === "actions/checkout@v6",
    )?.with?.ref,
  ).toBe(`\${{ needs.promotion-preflight.outputs.sha }}`);
  expect(promotion.env?.PROMOTION_SOURCE_SHA).toBe(
    `\${{ needs.promotion-preflight.outputs.sha }}`,
  );
  expect(promotion.env?.VERCEL_TOKEN).toBeUndefined();
  expect(promotion.steps.at(-1)?.env?.VERCEL_TOKEN).toBe(
    `\${{ secrets.VERCEL_TOKEN }}`,
  );
  expect(
    promotion.steps
      .slice(0, -1)
      .every(
        (step: { env?: { VERCEL_TOKEN?: string } }) => !step.env?.VERCEL_TOKEN,
      ),
  ).toBe(true);
  expect(promotion.steps[0].run).toBe(
    'test "$ACKNOWLEDGE_USER_JOURNEYS" = "true"',
  );
  expect(promotion.steps.at(-1)?.run).toBe(
    "bun apps/desktop/scripts/promote.ts",
  );
});
