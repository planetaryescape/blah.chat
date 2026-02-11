import ttest from "ttest";

function mean(xs: number[]): number {
  if (xs.length === 0) return 0;
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

function stdev(xs: number[]): number {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  const v = xs.reduce((acc, x) => acc + (x - m) * (x - m), 0) / (xs.length - 1);
  return Math.sqrt(v);
}

export type PairedTestResult = {
  n: number;
  meanDiff: number;
  t: number;
  pValue: number;
  df: number;
  ci95: { low: number; high: number };
  effectSizeDz: number;
};

export function pairedTTest(diffs: number[]): PairedTestResult {
  const n = diffs.length;
  const mu = 0;
  const test = ttest(diffs, mu);

  const m = mean(diffs);
  const sd = stdev(diffs);
  const dz = sd === 0 ? 0 : m / sd;

  const ci = test.confidence?.() ?? [m, m];
  const low = Array.isArray(ci) ? ci[0] : m;
  const high = Array.isArray(ci) ? ci[1] : m;

  return {
    n,
    meanDiff: m,
    t: typeof test.testValue === "function" ? test.testValue() : Number.NaN,
    pValue:
      typeof test.pValue === "function"
        ? test.pValue()
        : typeof test.pValue === "number"
          ? test.pValue
          : Number.NaN,
    df: n - 1,
    ci95: { low, high },
    effectSizeDz: dz,
  };
}
