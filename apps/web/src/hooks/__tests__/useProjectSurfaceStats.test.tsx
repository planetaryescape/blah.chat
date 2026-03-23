import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const useProjectNotesMock = vi.fn();
const useProjectResourcesMock = vi.fn();
const useProjectTasksMock = vi.fn();

vi.mock("../useProjectNotes", () => ({
  useProjectNotes: (...args: unknown[]) => useProjectNotesMock(...args),
}));

vi.mock("../useProjectResources", () => ({
  useProjectResources: (...args: unknown[]) => useProjectResourcesMock(...args),
}));

vi.mock("../useProjectTasks", () => ({
  useProjectTasks: (...args: unknown[]) => useProjectTasksMock(...args),
}));

import { useProjectSurfaceStats } from "../useProjectSurfaceStats";

describe("useProjectSurfaceStats", () => {
  it("derives note and task stats from Postgres-backed project hooks", () => {
    useProjectResourcesMock.mockReturnValue({
      conversations: [{ _id: "conv_1" }, { _id: "conv_2" }],
      files: [{ _id: "file_1" }],
      isLoading: false,
      error: null,
    });

    useProjectNotesMock.mockReturnValue({
      notes: [{ _id: "note_1" }, { _id: "note_2" }, { _id: "note_3" }],
      isLoading: false,
      error: null,
    });

    useProjectTasksMock.mockReturnValue({
      tasks: [
        { _id: "task_1", status: "completed" },
        { _id: "task_2", status: "in_progress" },
        { _id: "task_3", status: "confirmed" },
        { _id: "task_4", status: "cancelled" },
      ],
      isLoading: false,
      error: null,
    });

    const { result } = renderHook(() => useProjectSurfaceStats("project_1"));

    expect(result.current.stats).toEqual({
      conversationCount: 2,
      fileCount: 1,
      noteCount: 3,
      activeTaskCount: 2,
      taskStats: {
        total: 4,
        active: 2,
        completed: 1,
      },
    });
  });
});
