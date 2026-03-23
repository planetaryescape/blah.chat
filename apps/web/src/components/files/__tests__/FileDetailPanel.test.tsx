import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const useKnowledgeSourceDetailMock = vi.fn();

vi.mock("@/hooks/useKnowledgeSources", () => ({
  useKnowledgeSourceDetail: (...args: unknown[]) =>
    useKnowledgeSourceDetailMock(...args),
}));

import { FileDetailPanel } from "../FileDetailPanel";

describe("FileDetailPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders project file details from knowledge-source chunks", () => {
    useKnowledgeSourceDetailMock.mockReturnValue({
      data: {
        _id: "source_file",
        title: "Spec.pdf",
        type: "file",
        status: "completed",
        mimeType: "application/pdf",
        size: 4096,
        createdAt: 100,
        storageId: "users/user_1/projects/project_1/spec.pdf",
        chunks: [
          {
            _id: "chunk_1",
            chunkIndex: 0,
            content: "Chunk body",
            tokenCount: 12,
            pageNumber: 3,
          },
        ],
      },
      isLoading: false,
    });

    render(
      <FileDetailPanel
        fileId="source_file"
        highlightChunkId="chunk_1"
        onClose={() => {}}
      />,
    );

    expect(screen.getByText("Spec.pdf")).toBeInTheDocument();
    expect(screen.getByText(/indexed/i)).toBeInTheDocument();
    expect(screen.getByText(/chunk body/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /download/i })).toHaveAttribute(
      "href",
      "/api/v1/files/users/user_1/projects/project_1/spec.pdf",
    );
  });
});
