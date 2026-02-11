import { join } from "node:path";

export function dataPath(...parts: string[]) {
  return join(process.cwd(), "test-data", ...parts);
}

export function resultsPath(...parts: string[]) {
  return join(process.cwd(), "test-results", ...parts);
}
