import { fireEvent, render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const refreshMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: refreshMock,
  }),
}));

import { ProjectFiles } from "../ProjectFiles";

describe("ProjectFiles", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        if (input === "/api/v1/files/upload-url") {
          expect(init?.method).toBe("POST");
          return {
            ok: true,
            json: async () => ({
              data: {
                uploadUrl: "https://upload.example/file",
                storageId: "users/user_1/drafts/spec.pdf",
              },
            }),
          } as Response;
        }

        if (input === "https://upload.example/file") {
          expect(init?.method).toBe("PUT");
          return {
            ok: true,
            json: async () => ({}),
          } as Response;
        }

        if (input === "/api/v1/knowledge/sources") {
          expect(init?.method).toBe("POST");
          return {
            ok: true,
            json: async () => ({
              data: {
                _id: "source_1",
              },
            }),
          } as Response;
        }

        throw new Error(`Unexpected fetch: ${String(input)}`);
      }),
    );
  });

  it("uploads project files through REST knowledge routes", async () => {
    const { container } = render(
      <ProjectFiles projectId="project_1" files={[]} />,
    );

    const input = container.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement | null;

    expect(input).not.toBeNull();

    fireEvent.change(input!, {
      target: {
        files: [
          new File(["spec"], "Spec.pdf", {
            type: "application/pdf",
          }),
        ],
      },
    });

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        "/api/v1/files/upload-url",
        expect.objectContaining({
          method: "POST",
        }),
      );
    });

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        "/api/v1/knowledge/sources",
        expect.objectContaining({
          method: "POST",
        }),
      );
    });

    await waitFor(() => {
      expect(refreshMock).toHaveBeenCalled();
    });
  });
});
