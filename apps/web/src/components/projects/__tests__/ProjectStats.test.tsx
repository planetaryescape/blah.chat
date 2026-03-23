import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const useProjectSurfaceStatsMock = vi.fn();

vi.mock("@/hooks/useProjectSurfaceStats", () => ({
  useProjectSurfaceStats: (...args: unknown[]) =>
    useProjectSurfaceStatsMock(...args),
}));

import { ProjectStats } from "../ProjectStats";

describe("ProjectStats", () => {
  it("shows project file and conversation counts from Postgres resources", () => {
    useProjectSurfaceStatsMock.mockReturnValue({
      isLoading: false,
      stats: {
        conversationCount: 2,
        noteCount: 3,
        fileCount: 4,
        activeTaskCount: 2,
        taskStats: {
          total: 4,
          active: 2,
          completed: 1,
        },
      },
    });

    render(<ProjectStats projectId={"project_1" as never} />);

    expect(
      within(screen.getByTitle("Conversations")).getByText("2"),
    ).toBeInTheDocument();
    expect(
      within(screen.getByTitle("Notes")).getByText("3"),
    ).toBeInTheDocument();
    expect(
      within(screen.getByTitle("Files")).getByText("4"),
    ).toBeInTheDocument();
    expect(screen.getByText("25% done")).toBeInTheDocument();
  });
});
