import { expect, test } from "bun:test";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  collectCheckRuns,
  promoteVerifiedDeployment,
  requireCleanStageSource,
  requireProductionBranchPolicy,
  requireProtectedMainSource,
  requireSuccessfulChecks,
  verifyProductionBranchPolicy,
} from "../scripts/promote";

const url = "https://blah-chat-build123.vercel.app";
const sha = "a".repeat(40);
const expected = { projectId: "prj_expected", sha };
const deployment = {
  id: "dpl_immutable123",
  url: "blah-chat-build123.vercel.app",
  projectId: expected.projectId,
  gitSource: { sha },
  readyState: "READY",
  target: "production",
};

// Real CLI deployments omit gitSource; these fields are returned by Vercel's API.
const cliDeployment = {
  id: "dpl_immutable123",
  url: "blah-chat-build123.vercel.app",
  projectId: expected.projectId,
  readyState: "READY",
  target: "production",
  meta: { gitCommitSha: sha, sourceCommit: sha, gitDirty: "0" },
};

test("a clean CLI deployment with both attested SHAs promotes its immutable ID", async () => {
  const promoted: string[] = [];
  await promoteVerifiedDeployment(
    url,
    expected,
    async () => cliDeployment,
    async (id) => {
      promoted.push(id);
    },
  );
  expect(promoted).toEqual(["dpl_immutable123"]);
});

test("the observed dirty production artifact is rejected even with matching source SHAs", async () => {
  const deployedSha = "ad8436cec4187a78bd4a10e7ea8a24bf33abeb0f";
  const projectId = "prj_c1ywZnHhingrT82QKqZSTlqKbavl";
  let promoted = false;
  await expect(
    promoteVerifiedDeployment(
      "https://blah-chat-57bmrxm64-planetaryescape.vercel.app",
      { projectId, sha: deployedSha },
      async () => ({
        id: "dpl_7459Sr6pJERwJDC86fNkwZfP9BTm",
        url: "blah-chat-57bmrxm64-planetaryescape.vercel.app",
        projectId,
        readyState: "READY",
        target: "production",
        meta: {
          gitCommitSha: deployedSha,
          sourceCommit: deployedSha,
          gitDirty: "1",
        },
      }),
      async () => {
        promoted = true;
      },
    ),
  ).rejects.toThrow();
  expect(promoted).toBe(false);
});

for (const patch of [
  { meta: { ...cliDeployment.meta, gitDirty: "1" } },
  { meta: { ...cliDeployment.meta, gitDirty: false } },
  { meta: { gitCommitSha: sha, sourceCommit: sha } },
  { meta: { gitCommitSha: sha, gitDirty: "0" } },
  { meta: { sourceCommit: sha, gitDirty: "0" } },
  { meta: { ...cliDeployment.meta, gitCommitSha: "b".repeat(40) } },
  { meta: { ...cliDeployment.meta, sourceCommit: "b".repeat(40) } },
  { meta: undefined },
  { gitSource: { sha: "b".repeat(40) } },
  { gitSource: null },
]) {
  test(`CLI provenance fails closed: ${JSON.stringify(patch)}`, async () => {
    let promoted = false;
    await expect(
      promoteVerifiedDeployment(
        url,
        expected,
        async () => ({ ...cliDeployment, ...patch }),
        async () => {
          promoted = true;
        },
      ),
    ).rejects.toThrow();
    expect(promoted).toBe(false);
  });
}

function stageFixture(ignoreRules = "ignored-output\n") {
  const directory = mkdtempSync(join(tmpdir(), "blah-chat-cli-stage-"));
  const git = (args: string[]) =>
    execFileSync("git", args, {
      cwd: directory,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
  git(["init", "--quiet"]);
  writeFileSync(join(directory, "tracked.txt"), "committed source\n");
  writeFileSync(join(directory, ".gitignore"), ignoreRules);
  git(["add", "."]);
  git([
    "-c",
    "user.name=Stage Fixture",
    "-c",
    "user.email=stage@example.invalid",
    "-c",
    "commit.gpgsign=false",
    "-c",
    "core.hooksPath=/dev/null",
    "commit",
    "--quiet",
    "-m",
    "fixture",
  ]);
  return { directory, git, sha: git(["rev-parse", "HEAD"]).trim() };
}

test("staging accepts the exact committed checkout and ignored build outputs", () => {
  const fixture = stageFixture();
  writeFileSync(join(fixture.directory, "ignored-output"), "generated\n");
  expect(() => requireCleanStageSource(fixture.sha, fixture.git)).not.toThrow();
});

test("repository ignores admit backend build exports without global Git ignores", () => {
  const fixture = stageFixture(
    readFileSync(new URL("../../../.gitignore", import.meta.url), "utf8"),
  );
  fixture.git(["config", "core.excludesFile", "/dev/null"]);
  for (const name of ["ai", "shared", "auto-router", "cognitive-memory"]) {
    const directory = join(fixture.directory, "packages", name, "dist");
    mkdirSync(directory, { recursive: true });
    writeFileSync(join(directory, "index.js"), "// generated export\n");
  }
  expect(() => requireCleanStageSource(fixture.sha, fixture.git)).not.toThrow();

  const sourceDirectory = join(fixture.directory, "packages", "ai", "src");
  mkdirSync(sourceDirectory, { recursive: true });
  writeFileSync(
    join(sourceDirectory, "unexpected.ts"),
    "// unreviewed source\n",
  );
  expect(() => requireCleanStageSource(fixture.sha, fixture.git)).toThrow(
    "packages/ai/src/unexpected.ts",
  );
});

test("staging reports escaped untracked paths without reading their contents", () => {
  const fixture = stageFixture();
  const filename = 'unexpected-"line\nbreak\u007f\u0085.txt';
  const contents = "PRIVATE_FILE_CONTENT_MUST_NOT_BE_LOGGED";
  writeFileSync(join(fixture.directory, filename), contents);
  let message = "";
  try {
    requireCleanStageSource(fixture.sha, fixture.git);
  } catch (error) {
    if (!(error instanceof Error)) throw error;
    message = error.message;
  }
  expect(message).toContain('unexpected-\\"line\\nbreak\\u007f\\u0085.txt');
  expect(message).not.toContain(contents);
  expect(message).not.toContain("\n");
  expect(message).not.toContain("\u007f");
  expect(message).not.toContain("\u0085");
});

test("staging bounds the filename diagnostic without accepting omitted paths", () => {
  const fixture = stageFixture();
  for (let index = 0; index < 21; index++) {
    writeFileSync(
      join(fixture.directory, `extra-${String(index).padStart(2, "0")}.txt`),
      "not committed\n",
    );
  }
  let message = "";
  try {
    requireCleanStageSource(fixture.sha, fixture.git);
  } catch (error) {
    if (!(error instanceof Error)) throw error;
    message = error.message;
  }
  expect(message).toContain("untracked nonignored files (21)");
  expect(message).toContain("extra-19.txt");
  expect(message).not.toContain("extra-20.txt");
});

for (const dirty of ["tracked", "index", "untracked", "wrong-sha"]) {
  test(`staging refuses ${dirty} source before upload`, () => {
    const fixture = stageFixture();
    if (dirty === "tracked" || dirty === "index")
      writeFileSync(
        join(fixture.directory, "tracked.txt"),
        "changed generated binding\n",
      );
    if (dirty === "index") fixture.git(["add", "tracked.txt"]);
    if (dirty === "untracked")
      writeFileSync(
        join(fixture.directory, "untracked.txt"),
        "not in commit\n",
      );
    expect(() =>
      requireCleanStageSource(
        dirty === "wrong-sha" ? "b".repeat(40) : fixture.sha,
        fixture.git,
      ),
    ).toThrow();
  });
}

const successfulChecks = [
  "Lint & Typecheck",
  "Unit & Integration Tests",
  "Build",
].map((name, id) => ({
  id,
  name,
  head_sha: sha,
  app: { slug: "github-actions" },
  status: "completed",
  conclusion: "success",
}));
test("promotion requires the existing successful CI checks for the exact source commit", () => {
  expect(() =>
    requireSuccessfulChecks({ check_runs: successfulChecks }, sha),
  ).not.toThrow();
  for (const patch of [
    { conclusion: "failure" },
    { status: "in_progress" },
    { head_sha: "b".repeat(40) },
    { app: { slug: "untrusted-app" } },
  ]) {
    expect(() =>
      requireSuccessfulChecks(
        {
          check_runs: [
            { ...successfulChecks[0], ...patch },
            ...successfulChecks.slice(1),
          ],
        },
        sha,
      ),
    ).toThrow();
  }
  expect(() =>
    requireSuccessfulChecks(
      {
        check_runs: [
          ...successfulChecks,
          { ...successfulChecks[0], id: 10, conclusion: "failure" },
        ],
      },
      sha,
    ),
  ).toThrow();
  expect(() => requireSuccessfulChecks({ check_runs: [] }, sha)).toThrow();
});

test("promotion uses the immutable verified deployment ID, never the supplied URL", async () => {
  const promoted: string[] = [];
  await promoteVerifiedDeployment(
    url,
    expected,
    async (hostname) => {
      expect(hostname).toBe("blah-chat-build123.vercel.app");
      return deployment;
    },
    async (id) => {
      promoted.push(id);
    },
  );
  expect(promoted).toEqual(["dpl_immutable123"]);
});

test("promotion requires protected main and uses the checked-out source SHA", () => {
  const source = {
    eventName: "workflow_dispatch",
    ref: "refs/heads/main",
    defaultBranch: "main",
    refProtected: "true",
    sourceSha: sha,
  };
  expect(requireProtectedMainSource(source)).toBe(sha);
  expect(
    requireProtectedMainSource({ ...source, sourceSha: "b".repeat(40) }),
  ).toBe("b".repeat(40));
  for (const patch of [
    { ref: "refs/heads/feature" },
    { ref: "refs/tags/main" },
    { defaultBranch: "other" },
    { refProtected: "false" },
    { sourceSha: "" },
    { eventName: "push" },
  ]) {
    expect(() => requireProtectedMainSource({ ...source, ...patch })).toThrow();
  }
});

test("unavailable environment policy reads fail closed", async () => {
  await expect(
    verifyProductionBranchPolicy(async () => {
      throw new Error("GitHub promotion preflight failed (403)");
    }),
  ).rejects.toThrow("403");
});

test("custom branch policy is rejected without requesting the unsupported listing API", async () => {
  const paths: string[] = [];
  await expect(
    verifyProductionBranchPolicy(async (path) => {
      paths.push(path);
      if (path === "/environments/production")
        return {
          deployment_branch_policy: {
            protected_branches: false,
            custom_branch_policies: true,
          },
        };
      throw new Error("Unsupported branch-policy listing was requested");
    }),
  ).rejects.toThrow("protected branches");
  expect(paths).toEqual(["/environments/production"]);
});

test("production policy supports only server-side protected branches", () => {
  expect(() =>
    requireProductionBranchPolicy({
      deployment_branch_policy: {
        protected_branches: true,
        custom_branch_policies: false,
      },
    }),
  ).not.toThrow();
  for (const environment of [
    { protection_rules: [], deployment_branch_policy: null },
    {},
    {
      deployment_branch_policy: {
        protected_branches: false,
        custom_branch_policies: true,
      },
    },
    {
      deployment_branch_policy: {
        protected_branches: true,
        custom_branch_policies: true,
      },
    },
    {
      deployment_branch_policy: {
        protected_branches: false,
        custom_branch_policies: false,
      },
    },
  ]) {
    expect(() => requireProductionBranchPolicy(environment)).toThrow();
  }
});

test("required checks after the first 100 are included before admission", async () => {
  const calls: number[] = [];
  const checks = await collectCheckRuns(async (page) => {
    calls.push(page);
    return {
      check_runs:
        page === 1
          ? Array.from({ length: 100 }, (_, id) => ({ id, name: "other" }))
          : successfulChecks,
    };
  });
  expect(calls).toEqual([1, 2]);
  expect(() => requireSuccessfulChecks(checks, sha)).not.toThrow();
});

test("a later failed rerun cannot be hidden behind successful first-page checks", async () => {
  const checks = await collectCheckRuns(async (page) => ({
    check_runs:
      page === 1
        ? [
            ...successfulChecks,
            ...Array.from({ length: 97 }, () => ({ name: "other" })),
          ]
        : [{ ...successfulChecks[0], id: 1000, conclusion: "failure" }],
  }));
  expect(() => requireSuccessfulChecks(checks, sha)).toThrow();
});

test("failed or malformed later pages reject instead of accepting partial checks", async () => {
  for (const failure of ["http", "json", "malformed"]) {
    await expect(
      collectCheckRuns(async (page) => {
        if (page === 1)
          return {
            check_runs: Array.from({ length: 100 }, () => successfulChecks[0]),
          };
        if (failure === "http")
          throw new Error("Commit check lookup failed (403)");
        if (failure === "json") throw new SyntaxError("Invalid JSON");
        return { check_runs: null };
      }),
    ).rejects.toThrow();
  }
});

test("endless pagination fails closed at the documented 100-page limit", async () => {
  let pages = 0;
  await expect(
    collectCheckRuns(async () => {
      pages++;
      return {
        check_runs: Array.from({ length: 100 }, () => successfulChecks[0]),
      };
    }),
  ).rejects.toThrow("page limit");
  expect(pages).toBe(100);
});
for (const invalid of [
  "--scope=other",
  "http://blah.vercel.app",
  "https://evil.test",
  "https://blah.vercel.app/extra",
  "https://blah.vercel.app?x=1",
  "https://user@blah.vercel.app",
  "https://blah.vercel.app:443",
  "https://blah.vercel.app\n--yes",
]) {
  test(`rejects invalid deployment URL before inspection: ${JSON.stringify(invalid)}`, async () => {
    let inspected = false;
    let promoted = false;
    await expect(
      promoteVerifiedDeployment(
        invalid,
        expected,
        async () => {
          inspected = true;
          return deployment;
        },
        async () => {
          promoted = true;
        },
      ),
    ).rejects.toThrow();
    expect(inspected).toBe(false);
    expect(promoted).toBe(false);
  });
}
for (const patch of [
  { projectId: "prj_other" },
  { gitSource: { sha: "b".repeat(40) } },
  { gitSource: undefined },
  { id: "--yes" },
  { url: "different.vercel.app" },
  { readyState: "BUILDING" },
  { target: "preview" },
]) {
  test(`rejects mismatched deployment metadata: ${JSON.stringify(patch)}`, async () => {
    let promoted = false;
    await expect(
      promoteVerifiedDeployment(
        url,
        expected,
        async () => ({ ...deployment, ...patch }),
        async () => {
          promoted = true;
        },
      ),
    ).rejects.toThrow();
    expect(promoted).toBe(false);
  });
}
