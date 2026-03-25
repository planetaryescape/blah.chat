import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

describe("drizzle migrations", () => {
  test("includes a generated SQL migration for the expanded rewrite schema", async () => {
    const drizzleDir = path.resolve(import.meta.dirname, "..", "drizzle");
    const files = await readdir(drizzleDir);
    const sqlFiles = files.filter((file) => file.endsWith(".sql")).sort();

    expect(sqlFiles.length).toBeGreaterThan(0);
    const allMigrations = await Promise.all(
      sqlFiles.map((file) => readFile(path.join(drizzleDir, file), "utf8")),
    );
    expect(allMigrations.join("\n")).toContain(
      'CREATE TABLE "routing_policies"',
    );
    expect(allMigrations.join("\n")).toContain(
      'CREATE TABLE "provider_health_snapshots"',
    );
    expect(allMigrations.join("\n")).toContain(
      'CREATE TABLE "routing_examples"',
    );
    expect(allMigrations.join("\n")).toContain('CREATE TABLE "bookmarks"');
    expect(allMigrations.join("\n")).toContain(
      'ALTER TABLE "messages" ADD COLUMN "client_message_id" text;',
    );
    expect(allMigrations.join("\n")).toContain('CREATE TABLE "notes"');
    expect(allMigrations.join("\n")).toContain('CREATE TABLE "tasks"');
    expect(allMigrations.join("\n")).toContain('CREATE TABLE "projects"');
    expect(allMigrations.join("\n")).toContain('CREATE TABLE "templates"');
    expect(allMigrations.join("\n")).toContain(
      'CREATE TABLE "starter_suggestion_caches"',
    );
    expect(allMigrations.join("\n")).toContain('CREATE TABLE "cli_api_keys"');
    expect(allMigrations.join("\n")).toContain('CREATE TABLE "user_api_keys"');
    expect(allMigrations.join("\n")).toContain(
      'CREATE TABLE "composio_connections"',
    );
  });
});
