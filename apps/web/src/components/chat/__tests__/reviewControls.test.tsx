import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { UserCacheContext } from "@/lib/cache/context";
import { CodeBlock } from "../CodeBlock";
import { ConsolidateDialog } from "../ConsolidateDialog";

vi.mock("@/lib/highlighter", () => ({
  highlightCode: () => ({ html: "<pre>highlighted</pre>" }),
}));
vi.mock("../ClientCodeControls", () => ({ ClientCodeControls: () => null }));

describe("reviewed chat controls", () => {
  it("preserves the real cache context provider in the global test mock", () => {
    expect(UserCacheContext.Provider).toBeDefined();
  });
  it("preserves hook order through inline/block transitions", () => {
    const view = render(<CodeBlock code="inline" inline />);
    expect(screen.getByText("inline").tagName).toBe("CODE");
    expect(() => view.rerender(<CodeBlock code="block" />)).not.toThrow();
    expect(screen.getByText("block").tagName).toBe("CODE");
    expect(() =>
      view.rerender(<CodeBlock code="inline again" inline />),
    ).not.toThrow();
    expect(screen.getByText("inline again").tagName).toBe("CODE");
  });

  it("names the consolidation mode and model controls", () => {
    render(
      <ConsolidateDialog
        open
        comparisonGroupId="synthetic"
        messages={[]}
        onConfirm={() => {}}
        onClose={() => {}}
      />,
    );
    expect(
      screen.getByRole("radiogroup", { name: "Consolidation mode" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("combobox", { name: "Which model should consolidate?" }),
    ).toBeInTheDocument();
  });
});
