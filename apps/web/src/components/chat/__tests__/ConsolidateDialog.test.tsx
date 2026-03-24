import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ConsolidateDialog } from "../ConsolidateDialog";

describe("ConsolidateDialog", () => {
  it("defaults to a concrete same-chat model instead of auto", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();

    render(
      <ConsolidateDialog
        open={true}
        comparisonGroupId="cmp_1"
        messages={[
          {
            _id: "msg_1",
            role: "assistant",
            content: "First answer",
          },
          {
            _id: "msg_2",
            role: "assistant",
            content: "Second answer",
          },
        ]}
        onConfirm={onConfirm}
        onClose={vi.fn()}
      />,
    );

    const confirmButton = screen.getByRole("button", {
      name: /consolidate with/i,
    });
    expect(confirmButton).not.toHaveTextContent(/\bauto\b/i);

    await user.click(confirmButton);

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onConfirm.mock.calls[0]?.[0]).not.toBe("auto");
    expect(onConfirm.mock.calls[0]?.[1]).toBe("same-chat");
  });
});
