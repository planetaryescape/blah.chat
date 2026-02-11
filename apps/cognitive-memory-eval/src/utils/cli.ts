function parseBool(value: string | undefined): boolean {
  if (!value) return false;
  return value === "1" || value.toLowerCase() === "true";
}

export type CommonFlags = {
  sample?: number;
  force: boolean;
  dryRun: boolean;
  concurrency?: number;
};

export function parseCommonFlags(argv: string[]): CommonFlags {
  const out: CommonFlags = { force: false, dryRun: false };

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--sample") out.sample = Number(argv[++i]);
    else if (a.startsWith("--sample=")) out.sample = Number(a.split("=")[1]);
    else if (a === "--force") out.force = true;
    else if (a === "--dry-run") out.dryRun = true;
    else if (a === "--concurrency") out.concurrency = Number(argv[++i]);
    else if (a.startsWith("--concurrency="))
      out.concurrency = Number(a.split("=")[1]);
    else if (a.startsWith("--force=")) out.force = parseBool(a.split("=")[1]);
  }

  return out;
}
