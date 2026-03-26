import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SearchResults } from "../SearchResults";

const result = {
  _id: "msg_1" as string,
  conversationId: "conv_1" as string,
  conversationTitle: "Search Test",
  role: "assistant" as const,
  createdAt: Date.now(),
};

describe("SearchResults", () => {
  it("highlights matches without rendering injected HTML", () => {
    const { container } = render(
      <SearchResults
        results={[
          {
            ...result,
            content: '<img src=x onerror="alert(1)"> hello world',
          },
        ]}
        isLoading={false}
        query="hello"
      />,
    );

    expect(screen.getByText("hello")).toBeInTheDocument();
    expect(container.querySelector("mark")).toHaveTextContent("hello");
    expect(container.querySelector("img")).not.toBeInTheDocument();
  });
});
