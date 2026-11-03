import { execFileSync } from "node:child_process";

type PromotionTarget = { projectId: string; sha: string };

export function requireCleanStageSource(
  expectedSha: string,
  git: (args: string[]) => string = (args) =>
    execFileSync("git", args, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }),
): void {
  if (
    !/^[a-f0-9]{40}$/.test(expectedSha) ||
    git(["rev-parse", "HEAD"]).trim() !== expectedSha
  )
    throw new Error("Staging checkout does not match the trusted source SHA");
  git(["diff", "--quiet", "--no-ext-diff", "--ignore-submodules=none", "--"]);
  git([
    "diff",
    "--cached",
    "--quiet",
    "--no-ext-diff",
    "--ignore-submodules=none",
    "--",
  ]);
  const untracked = git(["ls-files", "--others", "--exclude-standard", "-z"]);
  if (untracked.length > 0) {
    // Report filenames only, escaping control characters; never read contents.
    const paths = untracked.split("\0").filter(Boolean);
    const preview = paths.slice(0, 20).map((path) => path.slice(0, 512));
    throw new Error(
      `Staging source contains untracked nonignored files (${paths.length}): ${JSON.stringify(preview)}`,
    );
  }
}

export function requireProtectedMainSource(source: {
  eventName: string;
  ref: string;
  defaultBranch: string;
  refProtected: string;
  sourceSha: string;
}): string {
  if (
    source.eventName !== "workflow_dispatch" ||
    source.ref !== "refs/heads/main" ||
    source.defaultBranch !== "main" ||
    source.refProtected !== "true" ||
    !/^[a-f0-9]{40}$/.test(source.sourceSha)
  ) {
    throw new Error(
      "Promotion requires protected default branch main and its checked-out source SHA",
    );
  }
  return source.sourceSha;
}

export function requireProductionBranchPolicy(environment: unknown): void {
  if (
    !environment ||
    typeof environment !== "object" ||
    !("deployment_branch_policy" in environment) ||
    !environment.deployment_branch_policy ||
    typeof environment.deployment_branch_policy !== "object"
  )
    throw new Error(
      "Production environment deployment branch policy is not configured",
    );
  const policy = environment.deployment_branch_policy;
  if (
    "protected_branches" in policy &&
    policy.protected_branches === true &&
    "custom_branch_policies" in policy &&
    policy.custom_branch_policies === false
  )
    return;
  throw new Error(
    "Production environment must restrict deployments to protected branches; custom branch policies are unsupported by this workflow token",
  );
}

export async function verifyProductionBranchPolicy(
  read: (path: string) => Promise<unknown>,
): Promise<void> {
  const environment = await read("/environments/production");
  requireProductionBranchPolicy(environment);
}

/** Read every page before admission; never accept a successful partial result. */
export async function collectCheckRuns(
  readPage: (page: number) => Promise<unknown>,
): Promise<{ check_runs: unknown[] }> {
  const checkRuns: unknown[] = [];
  for (let page = 1; page <= 100; page++) {
    const result = await readPage(page);
    if (
      !result ||
      typeof result !== "object" ||
      !("check_runs" in result) ||
      !Array.isArray(result.check_runs) ||
      result.check_runs.length > 100
    )
      throw new Error("Malformed commit check page");
    checkRuns.push(...result.check_runs);
    if (result.check_runs.length < 100) return { check_runs: checkRuns };
  }
  throw new Error("Commit check pagination exceeded the 100-page limit");
}

export function requireSuccessfulChecks(payload: unknown, sha: string): void {
  if (
    !payload ||
    typeof payload !== "object" ||
    !("check_runs" in payload) ||
    !Array.isArray(payload.check_runs)
  )
    throw new Error("Missing commit checks");
  for (const name of [
    "Lint & Typecheck",
    "Unit & Integration Tests",
    "Build",
  ]) {
    const latest = payload.check_runs
      .filter(
        (check) =>
          check?.name === name &&
          check.head_sha === sha &&
          check.app?.slug === "github-actions",
      )
      .sort((a, b) => b.id - a.id)[0];
    if (latest?.status !== "completed" || latest.conclusion !== "success")
      throw new Error(`Required commit check has not passed: ${name}`);
  }
}

export function validatePromotionUrl(input: string): URL {
  if (!/^https:\/\/[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.vercel\.app$/.test(input)) {
    throw new Error(
      "Expected an exact HTTPS *.vercel.app deployment URL without path, credentials, port or query",
    );
  }
  return new URL(input);
}

function hasVerifiedSource(deployment: object, expectedSha: string): boolean {
  // Never let CLI metadata override a present (including malformed) gitSource.
  if ("gitSource" in deployment) {
    return (
      !!deployment.gitSource &&
      typeof deployment.gitSource === "object" &&
      "sha" in deployment.gitSource &&
      deployment.gitSource.sha === expectedSha
    );
  }
  // CLI attestation is meaningful only for the protected, clean staging path.
  // It is metadata supplied by that path, not a cryptographic signature.
  if (
    !("meta" in deployment) ||
    !deployment.meta ||
    typeof deployment.meta !== "object"
  )
    return false;
  const meta = deployment.meta;
  return (
    "gitCommitSha" in meta &&
    meta.gitCommitSha === expectedSha &&
    "sourceCommit" in meta &&
    meta.sourceCommit === expectedSha &&
    "gitDirty" in meta &&
    meta.gitDirty === "0"
  );
}

export async function promoteVerifiedDeployment(
  input: string,
  expected: PromotionTarget,
  inspect: (hostname: string) => Promise<unknown>,
  promote: (id: string) => Promise<void>,
): Promise<void> {
  const url = validatePromotionUrl(input);
  if (!expected.projectId || !/^[a-f0-9]{40}$/.test(expected.sha))
    throw new Error("Missing expected project or full source commit");
  const deployment = await inspect(url.hostname);
  if (!deployment || typeof deployment !== "object")
    throw new Error("Missing deployment metadata");
  if (
    !("id" in deployment) ||
    typeof deployment.id !== "string" ||
    !/^dpl_[A-Za-z0-9]+$/.test(deployment.id) ||
    !("projectId" in deployment) ||
    deployment.projectId !== expected.projectId ||
    !("url" in deployment) ||
    deployment.url !== url.hostname ||
    !("readyState" in deployment) ||
    deployment.readyState !== "READY" ||
    !("target" in deployment) ||
    deployment.target !== "production" ||
    !hasVerifiedSource(deployment, expected.sha)
  ) {
    throw new Error(
      "Deployment ID, project, immutable URL, readiness, target or source commit did not match",
    );
  }
  await promote(deployment.id);
}

if (import.meta.main) {
  const sha = requireProtectedMainSource({
    eventName: process.env.GITHUB_EVENT_NAME ?? "",
    ref: process.env.GITHUB_REF ?? "",
    defaultBranch: process.env.PROMOTION_DEFAULT_BRANCH ?? "",
    refProtected: process.env.PROMOTION_REF_PROTECTED ?? "",
    sourceSha: process.env.PROMOTION_SOURCE_SHA ?? "",
  });
  if (process.argv[2] === "--verify-stage-source") {
    requireCleanStageSource(sha);
    process.exit(0);
  }
  const input = process.env.DEPLOYMENT_URL ?? "";
  const preflight = process.argv[2] === "--preflight";
  // A blank deployment URL requests staging; promotion always needs a URL.
  if (!preflight || input) validatePromotionUrl(input);
  if (input && process.env.ACKNOWLEDGE_USER_JOURNEYS !== "true")
    throw new Error("User journeys must be acknowledged");
  const repository = process.env.GITHUB_REPOSITORY;
  const githubToken = process.env.GITHUB_TOKEN;
  if (
    !repository ||
    !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository) ||
    !githubToken ||
    !/^[a-f0-9]{40}$/.test(sha)
  )
    throw new Error("Missing GitHub source context");
  const readGitHub = async (path: string): Promise<unknown> => {
    const response = await fetch(
      `https://api.github.com/repos/${repository}${path}`,
      {
        headers: {
          Authorization: `Bearer ${githubToken}`,
          Accept: "application/vnd.github+json",
        },
      },
    );
    if (!response.ok)
      throw new Error(`GitHub promotion preflight failed (${response.status})`);
    return response.json();
  };
  await verifyProductionBranchPolicy(readGitHub);
  const checks = await collectCheckRuns((page) =>
    readGitHub(`/commits/${sha}/check-runs?per_page=100&page=${page}`),
  );
  requireSuccessfulChecks(checks, sha);
  // The separate preflight job has no production environment or Vercel secrets.
  if (preflight) process.exit(0);
  const projectId = process.env.VERCEL_PROJECT_ID ?? "";
  await promoteVerifiedDeployment(
    input,
    { projectId, sha },
    async (hostname) => {
      // `vercel inspect --json` omits projectId and gitSource. Use the read-only
      // deployment API for provenance instead; never trust a caller-supplied ID.
      const token = process.env.VERCEL_TOKEN;
      const teamId = process.env.VERCEL_ORG_ID;
      if (!token || !teamId)
        throw new Error("Missing Vercel deployment context");
      const response = await fetch(
        `https://api.vercel.com/v13/deployments/${encodeURIComponent(hostname)}?teamId=${encodeURIComponent(teamId)}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (!response.ok)
        throw new Error(`Deployment inspection failed (${response.status})`);
      return response.json();
    },
    async (id) => {
      const result = await Bun.spawn(["vercel", "promote", id, "--yes"], {
        stdout: "inherit",
        stderr: "inherit",
      }).exited;
      if (result !== 0) throw new Error("Vercel promotion failed");
    },
  );
}
