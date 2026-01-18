#!/usr/bin/env bun
/**
 * BYOD Schema Sync
 *
 * Generates packages/byod-schema/ from modular table definitions.
 * Triggered by pre-commit hook or manual: bun run byod:sync
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const VERSION_PATH = join(ROOT, "apps/web/src/lib/byod/version.ts");

const SCHEMA_TRIGGER_FILES = [
  "packages/backend/convex/schema.ts",
  "packages/shared/src/byod/tables.ts",
  "packages/shared/src/byod/excluded-fields.ts",
  "apps/web/src/lib/byod/version.ts",
];
const SCHEMA_TRIGGER_DIRS = ["packages/backend/convex/schema/"];

const TABLE_MODULES: Record<string, { module: string; export: string }> = {
  conversations: { module: "conversations", export: "conversationsTable" },
  conversationParticipants: {
    module: "conversations",
    export: "conversationParticipantsTable",
  },
  conversationTokenUsage: {
    module: "conversations",
    export: "conversationTokenUsageTable",
  },
  messages: { module: "messages", export: "messagesTable" },
  attachments: { module: "messages", export: "attachmentsTable" },
  toolCalls: { module: "messages", export: "toolCallsTable" },
  sourceMetadata: { module: "messages", export: "sourceMetadataTable" },
  sources: { module: "messages", export: "sourcesTable" },
  memories: { module: "memories", export: "memoriesTable" },
  files: { module: "files", export: "filesTable" },
  fileChunks: { module: "files", export: "fileChunksTable" },
  knowledgeSources: { module: "files", export: "knowledgeSourcesTable" },
  knowledgeChunks: { module: "files", export: "knowledgeChunksTable" },
  projects: { module: "projects", export: "projectsTable" },
  projectConversations: {
    module: "projects",
    export: "projectConversationsTable",
  },
  projectNotes: { module: "projects", export: "projectNotesTable" },
  projectFiles: { module: "projects", export: "projectFilesTable" },
  tasks: { module: "tasks", export: "tasksTable" },
  notes: { module: "notes", export: "notesTable" },
  bookmarks: { module: "bookmarks", export: "bookmarksTable" },
  snippets: { module: "bookmarks", export: "snippetsTable" },
  tags: { module: "tags", export: "tagsTable" },
  bookmarkTags: { module: "tags", export: "bookmarkTagsTable" },
  snippetTags: { module: "tags", export: "snippetTagsTable" },
  noteTags: { module: "tags", export: "noteTagsTable" },
  taskTags: { module: "tags", export: "taskTagsTable" },
  shares: { module: "shares", export: "sharesTable" },
  scheduledPrompts: { module: "shares", export: "scheduledPromptsTable" },
  usageRecords: { module: "usage", export: "usageRecordsTable" },
  ttsCache: { module: "usage", export: "ttsCacheTable" },
  templates: { module: "templates", export: "templatesTable" },
  votes: { module: "templates", export: "votesTable" },
  activityEvents: { module: "activity", export: "activityEventsTable" },
  canvasDocuments: { module: "canvas", export: "canvasDocumentsTable" },
  canvasHistory: { module: "canvas", export: "canvasHistoryTable" },
  notifications: { module: "notifications", export: "notificationsTable" },
};

// Derive unique modules from TABLE_MODULES
const MODULE_FILES = [
  ...new Set(Object.values(TABLE_MODULES).map((m) => m.module)),
];

// --- Helpers ---

function parseVersion(): number {
  const content = readFileSync(VERSION_PATH, "utf-8");
  const match = content.match(/export const BYOD_SCHEMA_VERSION = (\d+);/);
  if (!match)
    throw new Error("Could not find BYOD_SCHEMA_VERSION in version.ts");
  return Number.parseInt(match[1], 10);
}

function buildSchemaEntries(tables: readonly string[]): string[] {
  return tables
    .filter((t) => TABLE_MODULES[t])
    .map((t) => `  ${t}: ${TABLE_MODULES[t].export},`);
}

function getStagedFiles(): string[] {
  try {
    return execFileSync("git", ["diff", "--cached", "--name-only"], {
      encoding: "utf-8",
      cwd: ROOT,
    })
      .split("\n")
      .filter(Boolean);
  } catch {
    return [];
  }
}

function shouldTriggerSync(stagedFiles: string[]): boolean {
  return stagedFiles.some(
    (f) =>
      SCHEMA_TRIGGER_FILES.includes(f) ||
      SCHEMA_TRIGGER_DIRS.some((d) => f.startsWith(d)),
  );
}

function incrementVersion(): number {
  const current = parseVersion();
  const next = current + 1;
  const content = readFileSync(VERSION_PATH, "utf-8");
  writeFileSync(
    VERSION_PATH,
    content.replace(
      /export const BYOD_SCHEMA_VERSION = \d+;/,
      `export const BYOD_SCHEMA_VERSION = ${next};`,
    ),
  );
  console.log(`📦 Incremented BYOD_SCHEMA_VERSION: ${current} → ${next}`);
  return next;
}

// --- Schema Generation ---

async function generateBYODSchemaContent(version: number): Promise<string> {
  const { BYOD_TABLES } = await import(
    join(ROOT, "packages/shared/src/byod/tables.ts")
  );

  const moduleImports = new Map<string, string[]>();
  for (const table of BYOD_TABLES) {
    const mapping = TABLE_MODULES[table];
    if (!mapping) {
      console.warn(`⚠️  Unknown table in BYOD_TABLES: ${table}`);
      continue;
    }
    const existing = moduleImports.get(mapping.module) || [];
    existing.push(mapping.export);
    moduleImports.set(mapping.module, existing);
  }

  // Sort imports alphabetically by module name, and exports alphabetically within each import
  // Use case-insensitive sorting to match Biome's behavior
  const sortedEntries = [...moduleImports.entries()]
    .sort(([a], [b]) => a.localeCompare(b, undefined, { sensitivity: "base" }))
    .map(
      ([mod, exports]) =>
        [
          mod,
          exports.sort((a, b) =>
            a.localeCompare(b, undefined, { sensitivity: "base" }),
          ),
        ] as const,
    );

  const imports = sortedEntries.map(([mod, exports]) => {
    // Use single-line format for single exports, multi-line for multiple
    if (exports.length === 1) {
      return `import { ${exports[0]} } from "../../backend/convex/schema/${mod}";`;
    }
    return `import {\n  ${exports.join(",\n  ")},\n} from "../../backend/convex/schema/${mod}";`;
  });

  return `// Auto-generated BYOD schema v${version}
// DO NOT EDIT - Generated by scripts/sync-byod-schema.ts

import { defineSchema } from "convex/server";

${imports.join("\n\n")}

export default defineSchema({
${buildSchemaEntries(BYOD_TABLES).join("\n")}
});
`;
}

async function generateBundledSchemaContent(version: number): Promise<string> {
  const { BYOD_TABLES } = await import(
    join(ROOT, "packages/shared/src/byod/tables.ts")
  );

  let moduleContents = "";
  for (const mod of MODULE_FILES) {
    const modPath = join(ROOT, "packages/backend/convex/schema", `${mod}.ts`);
    const content = readFileSync(modPath, "utf-8");
    const cleaned = content
      .replace(/^import.*$/gm, "")
      .replace(/^\/\*\*[\s\S]*?\*\/\s*/m, "")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
    if (cleaned)
      moduleContents += `// === ${mod.toUpperCase()} ===\n${cleaned}\n\n`;
  }
  // Trim trailing whitespace to avoid extra blank lines before export
  moduleContents = moduleContents.trimEnd();

  return `// Auto-generated BYOD schema v${version}
// DO NOT EDIT - Self-contained schema for standalone deployment

import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

${moduleContents}

export default defineSchema({
${buildSchemaEntries(BYOD_TABLES).join("\n")}
});
`;
}

async function generateSchemaFiles(version: number) {
  const OUTPUT_DIR = join(ROOT, "packages/byod-schema");
  mkdirSync(join(OUTPUT_DIR, "convex"), { recursive: true });

  const schemaContent = await generateBYODSchemaContent(version);
  const bundledSchemaContent = await generateBundledSchemaContent(version);

  const functionsContent = `// BYOD Functions v${version} - DO NOT EDIT
import { query } from "./_generated/server";

export const ping = query({
  args: {},
  handler: async () => ({
    status: "ok",
    version: ${version},
    timestamp: Date.now(),
  }),
});

export const getSystemInfo = query({
  args: {},
  handler: async () => ({
    schemaVersion: ${version},
    provider: "blah.chat",
    type: "byod",
  }),
});
`;

  writeFileSync(join(OUTPUT_DIR, "convex/schema.ts"), schemaContent);
  writeFileSync(
    join(OUTPUT_DIR, "convex/bundled-schema.ts"),
    bundledSchemaContent,
  );
  writeFileSync(
    join(OUTPUT_DIR, "schema-string.ts"),
    `// Auto-generated - DO NOT EDIT\nexport const BUNDLED_SCHEMA_CONTENT = ${JSON.stringify(bundledSchemaContent)};\n`,
  );
  writeFileSync(join(OUTPUT_DIR, "convex/functions.ts"), functionsContent);
  // Add trailing newlines to JSON files for Biome compliance
  writeFileSync(
    join(OUTPUT_DIR, "package.json"),
    `${JSON.stringify(
      {
        name: "@blah-chat/byod-schema",
        version: "1.0.0",
        private: true,
        exports: {
          ".": "./convex/schema.ts",
          "./bundled": "./convex/bundled-schema.ts",
          "./schema-string": "./schema-string.ts",
        },
        dependencies: { convex: "^1.17.0" },
      },
      null,
      2,
    )}\n`,
  );
  writeFileSync(
    join(OUTPUT_DIR, "convex.json"),
    `${JSON.stringify({ functions: "convex/" }, null, 2)}\n`,
  );
  writeFileSync(
    join(OUTPUT_DIR, "tsconfig.json"),
    `${JSON.stringify(
      {
        compilerOptions: {
          target: "ESNext",
          module: "ESNext",
          moduleResolution: "bundler",
          strict: true,
          skipLibCheck: true,
        },
        include: ["convex/**/*"],
      },
      null,
      2,
    )}\n`,
  );

  // Run Biome to ensure consistent formatting
  try {
    execFileSync("bunx", ["biome", "check", "--write", OUTPUT_DIR], {
      cwd: ROOT,
      stdio: "pipe",
    });
  } catch {
    // Biome may exit non-zero if it makes changes, which is fine
  }

  console.log(`✅ Generated BYOD schema v${version} in packages/byod-schema/`);
}

function stageGeneratedFiles() {
  execFileSync("git", ["add", VERSION_PATH], { cwd: ROOT });
  execFileSync("git", ["add", "packages/byod-schema/"], { cwd: ROOT });
  console.log("📝 Staged version.ts and packages/byod-schema/");
}

// --- Main ---

async function main() {
  const args = process.argv.slice(2);

  if (args.includes("--check")) {
    console.log("🔍 Checking BYOD schema sync status...");
    await generateSchemaFiles(parseVersion());
    console.log("✅ BYOD schema check complete");
    return;
  }

  if (args.includes("--force")) {
    console.log("🔄 Force regenerating BYOD schema...");
    const version = incrementVersion();
    await generateSchemaFiles(version);
    stageGeneratedFiles();
    console.log("✅ BYOD schema sync complete!");
    return;
  }

  const stagedFiles = getStagedFiles();
  const nonVersionChanges = stagedFiles.filter(
    (f) => f !== "apps/web/src/lib/byod/version.ts",
  );

  if (!shouldTriggerSync(nonVersionChanges)) {
    console.log("ℹ️  No BYOD schema changes detected, skipping sync");
    process.exit(0);
  }

  console.log("🔄 BYOD schema changes detected, syncing...");
  if (!existsSync(join(ROOT, "packages/byod-schema/convex/schema.ts"))) {
    console.log("📁 First run: creating packages/byod-schema/");
  }

  const version = incrementVersion();
  await generateSchemaFiles(version);
  stageGeneratedFiles();
  console.log("✅ BYOD schema sync complete!");
}

main().catch((err) => {
  console.error("❌ BYOD schema sync failed:", err);
  process.exit(1);
});
