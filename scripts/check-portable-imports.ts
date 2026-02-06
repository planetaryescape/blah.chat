import { spawnSync } from "node:child_process";

const targets = [
  "apps/cli/src",
  "apps/raycast/src",
  "apps/mobile/app",
  "apps/mobile/components",
  "apps/mobile/lib",
];
const pattern = "@blah-chat/backend/convex/_generated";

const result = spawnSync("rg", ["-n", pattern, ...targets], {
  encoding: "utf8",
});

if (result.status === 0) {
  console.error("Portable client import guard failed.");
  console.error(
    "Found forbidden backend-generated imports in distributable clients:\n",
  );
  process.stderr.write(result.stdout);
  process.exit(1);
}

if (result.status !== 1) {
  console.error(result.stderr || "Failed to execute ripgrep for import guard");
  process.exit(result.status ?? 1);
}

console.log("Portable client import guard passed.");
