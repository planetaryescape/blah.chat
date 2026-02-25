import { describe, expect, it, vi } from "vitest";
import { singleToProvider } from "./embedding";

describe("singleToProvider", () => {
  it("wraps a single-text embed function into a batch provider", async () => {
    const mockEmbed = vi.fn(async (text: string) => [text.length, 0.5]);

    const provider = singleToProvider(mockEmbed);
    const result = await provider.embedBatch(["hello", "world!", "hi"]);

    expect(result).toEqual([
      [5, 0.5],
      [6, 0.5],
      [2, 0.5],
    ]);
    expect(mockEmbed).toHaveBeenCalledTimes(3);
    expect(mockEmbed).toHaveBeenCalledWith("hello");
    expect(mockEmbed).toHaveBeenCalledWith("world!");
    expect(mockEmbed).toHaveBeenCalledWith("hi");
  });

  it("handles empty batch", async () => {
    const mockEmbed = vi.fn(async () => [1, 2, 3]);
    const provider = singleToProvider(mockEmbed);
    const result = await provider.embedBatch([]);

    expect(result).toEqual([]);
    expect(mockEmbed).not.toHaveBeenCalled();
  });

  it("handles single item batch", async () => {
    const mockEmbed = vi.fn(async () => [0.1, 0.2, 0.3]);
    const provider = singleToProvider(mockEmbed);
    const result = await provider.embedBatch(["only one"]);

    expect(result).toEqual([[0.1, 0.2, 0.3]]);
    expect(mockEmbed).toHaveBeenCalledTimes(1);
  });
});
