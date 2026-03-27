import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import AdmZip from "adm-zip";
import { describe, expect, it, vi } from "vitest";
import { listTablesInZip, readJsonl, readTableFromZip } from "./reader";

function createTempJsonl(lines: string[]): string {
  const tmpDir = os.tmpdir();
  const filePath = path.join(tmpDir, `test-${Date.now()}.jsonl`);
  fs.writeFileSync(filePath, `${lines.join("\n")}\n`);
  return filePath;
}

function createTempZip(tables: Record<string, string[]>): string {
  const zip = new AdmZip();
  for (const [tableName, lines] of Object.entries(tables)) {
    zip.addFile(`${tableName}.jsonl`, Buffer.from(`${lines.join("\n")}\n`));
  }
  const tmpDir = os.tmpdir();
  const zipPath = path.join(tmpDir, `test-${Date.now()}.zip`);
  zip.writeZip(zipPath);
  return zipPath;
}

describe("readJsonl", () => {
  it("reads all documents from a JSONL file", async () => {
    const filePath = createTempJsonl([
      JSON.stringify({ _id: "1", name: "Alice" }),
      JSON.stringify({ _id: "2", name: "Bob" }),
    ]);

    const docs = await readJsonl(filePath);
    expect(docs).toHaveLength(2);
    expect(docs[0]).toEqual({ _id: "1", name: "Alice" });
    expect(docs[1]).toEqual({ _id: "2", name: "Bob" });

    fs.unlinkSync(filePath);
  });

  it("returns empty array for empty file", async () => {
    const filePath = createTempJsonl([]);
    const docs = await readJsonl(filePath);
    expect(docs).toHaveLength(0);
    fs.unlinkSync(filePath);
  });

  it("skips malformed lines and logs a warning", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const filePath = createTempJsonl([
      JSON.stringify({ _id: "1", name: "Alice" }),
      "not valid json {{{",
      JSON.stringify({ _id: "3", name: "Charlie" }),
    ]);

    const docs = await readJsonl(filePath);
    expect(docs).toHaveLength(2);
    expect(docs[0]._id).toBe("1");
    expect(docs[1]._id).toBe("3");
    expect(warnSpy).toHaveBeenCalledOnce();

    warnSpy.mockRestore();
    fs.unlinkSync(filePath);
  });

  it("skips empty lines", async () => {
    const filePath = createTempJsonl([
      JSON.stringify({ _id: "1" }),
      "",
      "  ",
      JSON.stringify({ _id: "2" }),
    ]);

    const docs = await readJsonl(filePath);
    expect(docs).toHaveLength(2);

    fs.unlinkSync(filePath);
  });
});

describe("readTableFromZip", () => {
  it("reads documents for a specific table from a ZIP", async () => {
    const zipPath = createTempZip({
      users: [
        JSON.stringify({ _id: "u1", name: "Alice" }),
        JSON.stringify({ _id: "u2", name: "Bob" }),
      ],
      conversations: [JSON.stringify({ _id: "c1", title: "Chat 1" })],
    });

    const users = await readTableFromZip(zipPath, "users");
    expect(users).toHaveLength(2);
    expect(users[0]._id).toBe("u1");

    const convos = await readTableFromZip(zipPath, "conversations");
    expect(convos).toHaveLength(1);

    fs.unlinkSync(zipPath);
  });

  it("returns empty array when table not found in ZIP", async () => {
    const zipPath = createTempZip({
      users: [JSON.stringify({ _id: "u1" })],
    });

    const docs = await readTableFromZip(zipPath, "nonexistent");
    expect(docs).toHaveLength(0);

    fs.unlinkSync(zipPath);
  });
});

describe("listTablesInZip", () => {
  it("lists all table names from a ZIP", () => {
    const zipPath = createTempZip({
      users: [JSON.stringify({ _id: "u1" })],
      messages: [JSON.stringify({ _id: "m1" })],
      conversations: [JSON.stringify({ _id: "c1" })],
    });

    const tables = listTablesInZip(zipPath);
    expect(tables.sort()).toEqual(
      ["conversations", "messages", "users"].sort(),
    );

    fs.unlinkSync(zipPath);
  });

  it("returns empty array for empty ZIP", () => {
    const zip = new AdmZip();
    const tmpDir = os.tmpdir();
    const zipPath = path.join(tmpDir, `empty-${Date.now()}.zip`);
    zip.writeZip(zipPath);

    const tables = listTablesInZip(zipPath);
    expect(tables).toEqual([]);

    fs.unlinkSync(zipPath);
  });
});
