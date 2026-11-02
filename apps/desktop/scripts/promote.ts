type PromotionTarget = { projectId: string; sha: string };

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
    !("gitSource" in deployment) ||
    !deployment.gitSource ||
    typeof deployment.gitSource !== "object" ||
    !("sha" in deployment.gitSource) ||
    deployment.gitSource.sha !== expected.sha
  ) {
    throw new Error(
      "Deployment ID, project, immutable URL, readiness, target or source commit did not match",
    );
  }
  await promote(deployment.id);
}

if (import.meta.main) {
  const input = process.env.DEPLOYMENT_URL ?? "";
  validatePromotionUrl(input);
  const projectId = process.env.VERCEL_PROJECT_ID ?? "";
  const sha = process.env.GITHUB_SHA ?? "";
  if (process.env.ACKNOWLEDGE_USER_JOURNEYS !== "true")
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
  const checks = await fetch(
    `https://api.github.com/repos/${repository}/commits/${sha}/check-runs?per_page=100`,
    {
      headers: {
        Authorization: `Bearer ${githubToken}`,
        Accept: "application/vnd.github+json",
      },
    },
  );
  if (!checks.ok)
    throw new Error(`Commit check lookup failed (${checks.status})`);
  requireSuccessfulChecks(await checks.json(), sha);
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
