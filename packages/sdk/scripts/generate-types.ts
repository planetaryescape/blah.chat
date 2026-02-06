import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import openapiTS, { astToString } from "openapi-typescript";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const specPath = resolve(scriptDir, "../openapi/openapi.json");
const outputPath = resolve(scriptDir, "../src/generated/openapi.ts");

const spec = JSON.parse(await readFile(specPath, "utf8"));

const ast = await openapiTS(spec, {
  alphabetize: true,
});

const content = astToString(ast);

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(
  outputPath,
  `/* eslint-disable */\n/* biome-ignore-all lint: generated file */\n${content}`,
  "utf8",
);

console.log(`Generated ${outputPath}`);
