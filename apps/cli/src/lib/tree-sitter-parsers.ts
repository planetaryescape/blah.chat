import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { addDefaultParsers } from "@opentui/core";

const __dirname = dirname(fileURLToPath(import.meta.url));
const binDir = dirname(process.execPath);
const isCompiled = __dirname.startsWith("/$bunfs/");

const assetsDir = isCompiled
  ? resolve(binDir, "assets/tree-sitter")
  : resolve(__dirname, "../../assets/tree-sitter");

function wasmPath(lang: string): string {
  if (isCompiled)
    return resolve(binDir, `assets/tree-sitter-wasms/tree-sitter-${lang}.wasm`);
  return require.resolve(`tree-sitter-wasms/out/tree-sitter-${lang}.wasm`);
}

function highlightsPath(lang: string): string {
  return resolve(assetsDir, lang, "highlights.scm");
}

type Parser = {
  filetype: string;
  queries: { highlights: string[] };
  wasm: string;
};

const languages = [
  "python",
  "bash",
  "css",
  "json",
  "go",
  "rust",
  "java",
  "html",
  "toml",
  "tsx",
  "c",
  "ruby",
] as const;

const parsers: Parser[] = languages.map((lang) => ({
  filetype: lang,
  queries: { highlights: [highlightsPath(lang)] },
  wasm: wasmPath(lang),
}));

addDefaultParsers(parsers);
