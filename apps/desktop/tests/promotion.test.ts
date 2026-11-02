import { expect, test } from "bun:test";
import {
  promoteVerifiedDeployment,
  requireSuccessfulChecks,
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
    async () => deployment,
    async (id) => {
      promoted.push(id);
    },
  );
  expect(promoted).toEqual(["dpl_immutable123"]);
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
