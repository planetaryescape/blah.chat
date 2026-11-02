import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TaskMainView } from "../TaskMainView";

const createTask = vi.hoisted(() => vi.fn(async () => {}));
vi.mock("convex/react", () => ({ useMutation: () => createTask }));
vi.mock("../TaskListItem", () => ({ TaskListItem: () => null }));

afterEach(() => vi.useRealTimers());

describe("My Day quick add", () => {
  it("uses the browser-local end of day, matching the detail panel", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 10, 2, 12, 30));
    render(<TaskMainView title="My Day" tasks={[]} view="today" />);
    fireEvent.change(screen.getByPlaceholderText("Add a task"), {
      target: { value: "Today task" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add" }));
    const endOfDay = new Date(2026, 10, 2, 23, 59, 59, 999).getTime();
    await waitFor(() =>
      expect(createTask).toHaveBeenCalledWith(
        expect.objectContaining({ deadline: endOfDay }),
      ),
    );
    expect(endOfDay).toBeGreaterThan(Date.now());
  });
});
