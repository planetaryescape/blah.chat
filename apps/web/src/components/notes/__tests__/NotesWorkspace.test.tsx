import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

const createNoteMock = vi.fn();

vi.mock("@/hooks/useNotes", () => ({
  useNotes: () => ({
    notes: [],
    isLoading: false,
    createNote: createNoteMock,
    updateNote: vi.fn(),
    deleteNote: vi.fn(),
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

import { NotesWorkspace } from "../NotesWorkspace";

describe("NotesWorkspace", () => {
  it("creates notes through the global Postgres hook", async () => {
    const user = userEvent.setup();
    createNoteMock.mockResolvedValue({
      _id: "note_1",
      title: "Untitled Note",
      content: "# New Note\n\n",
      isPinned: false,
      tags: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    render(<NotesWorkspace />);

    await user.click(screen.getByRole("button", { name: /create new note/i }));

    expect(createNoteMock).toHaveBeenCalledWith({
      title: "Untitled Note",
      content: "# New Note\n\n",
      projectId: null,
    });
  });
});
