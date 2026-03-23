import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

const createTaskMock = vi.fn();

vi.mock("@/hooks/useTasks", () => ({
  useTasks: () => ({
    tasks: [],
    isLoading: false,
    createTask: createTaskMock,
    updateTask: vi.fn(),
    deleteTask: vi.fn(),
    isCreating: false,
    isUpdating: false,
    isDeleting: false,
  }),
}));

vi.mock("@/hooks/useMobileDetect", () => ({
  useMobileDetect: () => ({
    isMobile: false,
    isTouchDevice: false,
  }),
}));

vi.mock("nuqs", async () => {
  const React = await import("react");
  return {
    useQueryState: () => React.useState<string | null>(null),
  };
});

import { TasksWorkspace } from "../TasksWorkspace";

describe("TasksWorkspace", () => {
  it("creates tasks through the global Postgres hook", async () => {
    const user = userEvent.setup();
    createTaskMock.mockResolvedValue({
      _id: "task_1",
      title: "Ship rewrite",
      status: "in_progress",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    render(<TasksWorkspace />);

    await user.type(screen.getByPlaceholderText(/add a task/i), "Ship rewrite");
    await user.click(screen.getByRole("button", { name: /create task/i }));

    expect(createTaskMock).toHaveBeenCalledWith({
      title: "Ship rewrite",
      status: "in_progress",
      urgency: "medium",
      projectId: null,
    });
  });
});
