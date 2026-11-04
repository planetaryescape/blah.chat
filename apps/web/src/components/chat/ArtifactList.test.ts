import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { ArtifactList, getDocumentArtifacts } from "./ArtifactList";

const { cachedRows } = vi.hoisted(() => ({
  cachedRows: { value: [] as unknown[] },
}));
vi.mock("@/hooks/useCacheSync", () => ({
  useCachedToolCalls: () => cachedRows.value,
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

describe("getDocumentArtifacts", () => {
  it("projects native normalized rows into document cards and excludes failures", () => {
    expect(
      getDocumentArtifacts([
        {
          id: "call-1",
          toolName: "createDocument",
          args: { title: "Plan", documentType: "prose" },
          result: { success: true, documentId: "doc-1", lineCount: 4 },
        },
        {
          id: "call-2",
          toolName: "createDocument",
          args: { title: "Failed" },
          result: { success: false, error: "write denied" },
        },
      ]),
    ).toEqual([
      {
        id: "call-1",
        toolName: "createDocument",
        documentId: "doc-1",
        title: "Plan",
        documentType: "prose",
        language: undefined,
        version: 1,
        lineCount: 4,
      },
    ]);
  });

  it("continues to read legacy string projections", () => {
    expect(
      getDocumentArtifacts([
        {
          id: "legacy-1",
          name: "createDocument",
          arguments: JSON.stringify({ title: "Old" }),
          result: JSON.stringify({ success: true, documentId: "doc-old" }),
        },
      ]),
    ).toHaveLength(1);
  });

  it("renders an artifact card from normalized cache rows without rendering failed results", () => {
    cachedRows.value = [
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
        args: { title: "Denied" },
        result: { success: false, error: "denied" },
      },
    ];
    const html = renderToStaticMarkup(
      createElement(ArtifactList, { messageId: "message-1" as never }),
    );
    expect(html).toContain("Saved plan");
    expect(html).toContain('data-document-id="doc-1"');
    expect(html).not.toContain("Denied");
  });
});
