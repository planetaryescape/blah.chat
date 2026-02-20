import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import { parseCommonFlags } from "./utils/cli";
import { fileExists } from "./utils/fs";
import { log } from "./utils/log";
import { resultsPath } from "./utils/paths";

type UiMode = "auto" | "browser" | "tui" | "none";

function parseBool(value: string | undefined): boolean {
  if (!value) return false;
  return value === "1" || value.toLowerCase() === "true";
}

function parseRunFlags(argv: string[]) {
  const common = parseCommonFlags(argv);
  let ui: UiMode = "auto";
  let open = true;

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--ui") {
      const v = argv[++i] as UiMode | undefined;
      if (v === "auto" || v === "browser" || v === "tui" || v === "none")
        ui = v;
    } else if (a.startsWith("--ui=")) {
      const v = a.split("=")[1] as UiMode;
      if (v === "auto" || v === "browser" || v === "tui" || v === "none")
        ui = v;
    } else if (a === "--no-open") {
      open = false;
    } else if (a === "--open") {
      open = true;
    } else if (a.startsWith("--open=")) {
      open = parseBool(a.split("=")[1]);
    }
  }

  return { ...common, ui, open };
}

function commonArgs(flags: ReturnType<typeof parseRunFlags>): string[] {
  const args: string[] = [];
  args.push("--profile", flags.profile ?? "standard");
  if (flags.sample !== undefined) args.push("--sample", String(flags.sample));
  if (flags.force) args.push("--force");
  if (flags.dryRun) args.push("--dry-run");
  if (flags.genConcurrency !== undefined)
    args.push("--gen-concurrency", String(flags.genConcurrency));
  if (flags.seedConcurrency !== undefined)
    args.push("--seed-concurrency", String(flags.seedConcurrency));
  return args;
}

function runCmd(
  cmd: string,
  args: string[],
  cwd: string,
  env: NodeJS.ProcessEnv = process.env,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      cwd,
      stdio: "inherit",
      env,
    });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else
        reject(new Error(`command failed (${code}): ${cmd} ${args.join(" ")}`));
    });
  });
}

async function tryOpenInBrowser(path: string): Promise<boolean> {
  const platform = process.platform;
  if (platform === "darwin") {
    await runCmd("open", [path], process.cwd());
    return true;
  }
  if (platform === "linux") {
    await runCmd("xdg-open", [path], process.cwd());
    return true;
  }
  if (platform === "win32") {
    await runCmd("cmd", ["/c", "start", "", path], process.cwd());
    return true;
  }
  return false;
}

async function showTuiReport(path: string) {
  if (!fileExists(path)) throw new Error(`Missing report: ${path}`);
  const text = await readFile(path, "utf8");
  // eslint-disable-next-line no-console
  console.log(text);
}

async function main() {
  const flags = parseRunFlags(process.argv.slice(2));
  const appCwd = process.cwd();
  const baseArgs = commonArgs(flags);
  const answerJudgeArgs = [...baseArgs];
  if (flags.concurrency !== undefined) {
    answerJudgeArgs.push("--concurrency", String(flags.concurrency));
  }

  const runId = process.env.COGMEM_EVAL_RUN_ID || `run_${Date.now()}`;
  const childEnv = { ...process.env, COGMEM_EVAL_RUN_ID: runId };
  log(
    `run start id=${runId} profile=${flags.profile ?? "standard"} sample=${flags.sample ?? "all"} force=${flags.force} dryRun=${flags.dryRun} concurrency=${flags.concurrency ?? "default"} ui=${flags.ui} open=${flags.open}`,
  );
  if (!flags.dryRun && !process.env.AI_GATEWAY_API_KEY) {
    throw new Error(
      "Missing AI_GATEWAY_API_KEY. Set it once, then rerun: bun --filter=cognitive-memory-eval run run --sample 1 --concurrency 3",
    );
  }

  const phases: Array<{ name: string; script: string; args: string[] }> = [
    { name: "gen", script: "src/generators/index.ts", args: baseArgs },
    { name: "seed", script: "src/seeding/seed-memories.ts", args: baseArgs },
    {
      name: "answer",
      script: "src/test/answer-questions.ts",
      args: answerJudgeArgs,
    },
    {
      name: "judge",
      script: "src/test/judge-answers.ts",
      args: answerJudgeArgs,
    },
    {
      name: "analyze",
      script: "src/analysis/generate-report.ts",
      args: baseArgs,
    },
  ];

  for (const phase of phases) {
    log(`phase start ${phase.name}`);
    await runCmd("bun", ["run", phase.script, ...phase.args], appCwd, childEnv);
    log(`phase done ${phase.name}`);
  }

  const report = resultsPath("report.md");
  const viz = resultsPath("visualizations", "index.html");
  log(`artifacts report=${report}`);
  log(`artifacts viz=${viz}`);

  if (!flags.open || flags.ui === "none") {
    log("run done (open disabled)");
    return;
  }

  if (flags.ui === "tui") {
    await showTuiReport(report);
    log("run done (tui)");
    return;
  }

  try {
    const opened = await tryOpenInBrowser(viz);
    if (opened) {
      log("run done (browser opened)");
      return;
    }
  } catch {
    // browser open failed, fallback below
  }

  if (flags.ui === "browser") {
    throw new Error(
      `Could not open browser automatically. Open manually: ${viz}`,
    );
  }

  await showTuiReport(report);
  log("run done (browser unavailable; showed report)");
}

main().catch((err) => {
  const msg = err instanceof Error ? err.message : String(err);
  // eslint-disable-next-line no-console
  console.error(msg);
  process.exit(1);
});
