import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
import { ArtifactList } from "./ArtifactList";

const { cacheRows } = vi.hoisted(() => ({
  cacheRows: { rows: [] as unknown[] },
}));
vi.mock("@/hooks/useCacheSync", () => ({
  useCachedToolCalls: () => cacheRows.rows,
}));
vi.mock("./ArtifactCard", () => ({
  ArtifactCard: ({
    title,
    documentId,
  }: {
    title: string;
    documentId: string;
  }) => createElement("button", { "data-document-id": documentId }, title),
}));

it("renders normalized cached document rows and suppresses the failure row", () => {
  cacheRows.rows = [
    {
      _id: "row-1",
      toolCallId: "call-1",
      toolName: "createDocument",
      args: { title: "Saved plan" },
      result: { success: true, documentId: "doc-1" },
    },
    {
      _id: "row-2",
      toolCallId: "call-2",
      toolName: "createDocument",
      args: { title: "Failed plan" },
      result: { success: false, error: "denied" },
    },
  ];

  const html = renderToStaticMarkup(
    createElement(ArtifactList, { messageId: "message-1" as never }),
  );
  expect(html).toContain("Saved plan");
  expect(html).toContain('data-document-id="doc-1"');
  expect(html).not.toContain("Failed plan");
});

it("retains legacy projected fields through the component boundary", () => {
  cacheRows.rows = [
    {
      id: "legacy-call",
      name: "createDocument",
      arguments: JSON.stringify({ title: "Legacy plan" }),
      result: JSON.stringify({ success: true, documentId: "legacy-doc" }),
    },
  ];
  const html = renderToStaticMarkup(
    createElement(ArtifactList, { messageId: "message-1" as never }),
  );
  expect(html).toContain("Legacy plan");
  expect(html).toContain('data-document-id="legacy-doc"');
});
