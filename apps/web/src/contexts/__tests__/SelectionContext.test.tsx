import { act, fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SelectionProvider, useSelection } from "../SelectionContext";

let mobileState = { isMobile: false, isTouchDevice: false };

vi.mock("@/hooks/useMobileDetect", () => ({
  useMobileDetect: () => mobileState,
}));

function TestHarness() {
  return (
    <SelectionProvider>
      <SelectionConsumer />
      <textarea data-testid="chat-input" />
    </SelectionProvider>
  );
}

const clearSelectionRef: { current: (() => void) | null } = { current: null };

function SelectionConsumer() {
  const { clearSelection } = useSelection();
  React.useEffect(() => {
    clearSelectionRef.current = clearSelection;
  }, [clearSelection]);
  return null;
}

describe("SelectionContext mobile focus safety", () => {
  beforeEach(() => {
    mobileState = { isMobile: false, isTouchDevice: false };
    clearSelectionRef.current = null;
  });

  it("does not clear native selection on mobile mouseup", () => {
    mobileState = { isMobile: true, isTouchDevice: true };
    const removeAllRanges = vi.fn();
    vi.spyOn(window, "getSelection").mockReturnValue({
      removeAllRanges,
    } as unknown as Selection);

    render(<TestHarness />);

    const input = screen.getByTestId("chat-input");
    fireEvent.mouseUp(input);

    expect(removeAllRanges).not.toHaveBeenCalled();
  });

  it("does not clear native selection on touch devices with desktop width", () => {
    mobileState = { isMobile: false, isTouchDevice: true };
    const removeAllRanges = vi.fn();
    vi.spyOn(window, "getSelection").mockReturnValue({
      removeAllRanges,
    } as unknown as Selection);

    render(<TestHarness />);

    const input = screen.getByTestId("chat-input");
    fireEvent.mouseUp(input);

    expect(removeAllRanges).not.toHaveBeenCalled();
  });

  it("does not clear textarea caret when clearSelection is called", () => {
    const removeAllRanges = vi.fn();
    vi.spyOn(window, "getSelection").mockReturnValue({
      removeAllRanges,
    } as unknown as Selection);

    render(<TestHarness />);

    const input = screen.getByTestId("chat-input");
    (input as HTMLTextAreaElement).focus();
    expect(document.activeElement).toBe(input);

    act(() => clearSelectionRef.current?.());

    expect(removeAllRanges).not.toHaveBeenCalled();
  });
});
