import { describe, expect, it } from "vitest";

import { parseChatGPT } from "../parsers/chatgpt";
import { parseJSON } from "../parsers/json";
import { parseMarkdown } from "../parsers/markdown";

describe("parseJSON", () => {
  it("parses valid blah.chat export", () => {
    const content = JSON.stringify({
      version: "1.0",
      exportedAt: "2024-01-01T00:00:00Z",
      conversations: [
        {
          title: "Test Conversation",
          model: "openai:gpt-5",
          systemPrompt: "You are helpful",
          createdAt: 1704067200000,
          messages: [
            { role: "user", content: "Hello", createdAt: 1704067200000 },
            { role: "assistant", content: "Hi!", createdAt: 1704067201000, model: "openai:gpt-5" },
          ],
        },
      ],
    });

    const result = parseJSON(content);
    expect(result.success).toBe(true);
    expect(result.conversationsCount).toBe(1);
    expect(result.messagesCount).toBe(2);
    expect(result.data?.conversations[0].title).toBe("Test Conversation");
    expect(result.data?.conversations[0].messages).toHaveLength(2);
  });

  it("returns error for missing version", () => {
    const content = JSON.stringify({
      conversations: [],
    });
    const result = parseJSON(content);
    expect(result.success).toBe(false);
    expect(result.error).toContain("missing required fields");
  });

  it("returns error for missing conversations", () => {
    const content = JSON.stringify({
      version: "1.0",
    });
    const result = parseJSON(content);
    expect(result.success).toBe(false);
    expect(result.error).toContain("missing required fields");
  });

  it("returns error for invalid JSON", () => {
    const content = "{ invalid }";
    const result = parseJSON(content);
    expect(result.success).toBe(false);
    expect(result.error).toContain("Failed to parse JSON");
  });

  it("handles empty conversations array", () => {
    const content = JSON.stringify({
      version: "1.0",
      exportedAt: "2024-01-01",
      conversations: [],
    });
    const result = parseJSON(content);
    expect(result.success).toBe(true);
    expect(result.conversationsCount).toBe(0);
    expect(result.messagesCount).toBe(0);
  });

  it("preserves model and systemPrompt fields", () => {
    const content = JSON.stringify({
      version: "1.0",
      exportedAt: "2024-01-01",
      conversations: [
        {
          title: "Test",
          model: "anthropic:claude-3-opus",
          systemPrompt: "Custom system prompt",
          messages: [],
        },
      ],
    });
    const result = parseJSON(content);
    expect(result.success).toBe(true);
    expect(result.data?.conversations[0].model).toBe("anthropic:claude-3-opus");
    expect(result.data?.conversations[0].systemPrompt).toBe("Custom system prompt");
  });

  it("counts messages across multiple conversations", () => {
    const content = JSON.stringify({
      version: "1.0",
      exportedAt: "2024-01-01",
      conversations: [
        { title: "Conv1", messages: [{ role: "user", content: "1" }, { role: "assistant", content: "2" }] },
        { title: "Conv2", messages: [{ role: "user", content: "3" }] },
        { title: "Conv3", messages: [{ role: "user", content: "4" }, { role: "assistant", content: "5" }, { role: "user", content: "6" }] },
      ],
    });
    const result = parseJSON(content);
    expect(result.conversationsCount).toBe(3);
    expect(result.messagesCount).toBe(6);
  });
});

describe("parseChatGPT", () => {
  it("parses single ChatGPT conversation", () => {
    const content = JSON.stringify({
      title: "Test Chat",
      create_time: 1704067200, // Unix seconds
      mapping: {
        node1: {
          id: "node1",
          author: { role: "user" },
          content: { content_type: "text", parts: ["Hello ChatGPT"] },
          create_time: 1704067200,
        },
        node2: {
          id: "node2",
          author: { role: "assistant" },
          content: { content_type: "text", parts: ["Hello! How can I help?"] },
          create_time: 1704067201,
        },
      },
    });

    const result = parseChatGPT(content);
    expect(result.success).toBe(true);
    expect(result.conversationsCount).toBe(1);
    expect(result.messagesCount).toBe(2);
    expect(result.data?.format).toBe("chatgpt");
    expect(result.data?.conversations[0].title).toBe("Test Chat");
  });

  it("parses array of ChatGPT conversations", () => {
    const content = JSON.stringify([
      {
        title: "Chat 1",
        mapping: {
          n1: { id: "n1", author: { role: "user" }, content: { parts: ["Hi"] } },
        },
      },
      {
        title: "Chat 2",
        mapping: {
          n2: { id: "n2", author: { role: "user" }, content: { parts: ["Hello"] } },
        },
      },
    ]);

    const result = parseChatGPT(content);
    expect(result.success).toBe(true);
    expect(result.conversationsCount).toBe(2);
  });

  it("converts Unix seconds to milliseconds", () => {
    const unixSeconds = 1704067200;
    const content = JSON.stringify({
      title: "Test",
      create_time: unixSeconds,
      mapping: {
        n1: {
          id: "n1",
          author: { role: "user" },
          content: { parts: ["Hello"] },
          create_time: unixSeconds,
        },
      },
    });

    const result = parseChatGPT(content);
    expect(result.success).toBe(true);
    expect(result.data?.conversations[0].createdAt).toBe(unixSeconds * 1000);
    expect(result.data?.conversations[0].messages[0].createdAt).toBe(unixSeconds * 1000);
  });

  it("joins multiple parts into content", () => {
    const content = JSON.stringify({
      title: "Test",
      mapping: {
        n1: {
          id: "n1",
          author: { role: "user" },
          content: { parts: ["Part 1", "Part 2", "Part 3"] },
        },
      },
    });

    const result = parseChatGPT(content);
    expect(result.success).toBe(true);
    expect(result.data?.conversations[0].messages[0].content).toBe("Part 1\nPart 2\nPart 3");
  });

  it("filters out empty messages", () => {
    const content = JSON.stringify({
      title: "Test",
      mapping: {
        n1: { id: "n1", author: { role: "user" }, content: { parts: ["Hello"] } },
        n2: { id: "n2", author: { role: "assistant" }, content: { parts: ["  "] } }, // Empty after trim
        n3: { id: "n3", author: { role: "user" }, content: { parts: [] } }, // No parts
        n4: { id: "n4", author: { role: "assistant" }, content: { parts: ["Response"] } },
      },
    });

    const result = parseChatGPT(content);
    expect(result.success).toBe(true);
    expect(result.messagesCount).toBe(2); // Only non-empty messages
  });

  it("skips conversations without mapping", () => {
    const content = JSON.stringify([
      { title: "Valid", mapping: { n1: { id: "n1", author: { role: "user" }, content: { parts: ["Hi"] } } } },
      { title: "Invalid - no mapping" },
      { mapping: { n1: { id: "n1", author: { role: "user" }, content: { parts: ["Hi"] } } } }, // No title
    ]);

    const result = parseChatGPT(content);
    expect(result.success).toBe(true);
    expect(result.conversationsCount).toBe(1);
  });

  it("returns error for empty conversations array", () => {
    const content = JSON.stringify([]);
    const result = parseChatGPT(content);
    expect(result.success).toBe(false);
    expect(result.error).toContain("No conversations found");
  });

  it("returns error when all conversations are invalid", () => {
    const content = JSON.stringify([
      { title: "No mapping" },
      { mapping: {} }, // No title
    ]);
    const result = parseChatGPT(content);
    expect(result.success).toBe(false);
    expect(result.error).toContain("Failed to parse any valid conversations");
  });

  it("returns error for invalid JSON", () => {
    const content = "not json";
    const result = parseChatGPT(content);
    expect(result.success).toBe(false);
    expect(result.error).toContain("Failed to parse ChatGPT export");
  });

  it("handles system role messages", () => {
    const content = JSON.stringify({
      title: "Test",
      mapping: {
        n1: { id: "n1", author: { role: "system" }, content: { parts: ["System prompt"] } },
        n2: { id: "n2", author: { role: "user" }, content: { parts: ["Hello"] } },
      },
    });

    const result = parseChatGPT(content);
    expect(result.success).toBe(true);
    expect(result.data?.conversations[0].messages.some((m) => m.role === "system")).toBe(true);
  });
});

describe("parseMarkdown", () => {
  it("parses basic markdown conversation", () => {
    const content = `# My Conversation

## You

Hello, how are you?

## Assistant

I'm doing well, thank you!`;

    const result = parseMarkdown(content);
    expect(result.success).toBe(true);
    expect(result.conversationsCount).toBe(1);
    expect(result.messagesCount).toBe(2);
    expect(result.data?.conversations[0].title).toBe("My Conversation");
  });

  it("parses multiple conversations separated by ---", () => {
    const content = `# First Chat

## You

Hello

## Assistant

Hi!

---

# Second Chat

## You

Goodbye

## Assistant

See you!`;

    const result = parseMarkdown(content);
    expect(result.success).toBe(true);
    expect(result.conversationsCount).toBe(2);
    expect(result.messagesCount).toBe(4);
  });

  it("extracts model metadata", () => {
    const content = `# Test

**Model**: openai:gpt-5

## You

Hello`;

    const result = parseMarkdown(content);
    expect(result.success).toBe(true);
    expect(result.data?.conversations[0].model).toBe("openai:gpt-5");
  });

  it("extracts system prompt metadata", () => {
    const content = `# Test

**System Prompt**: You are helpful

## You

Hello`;

    const result = parseMarkdown(content);
    expect(result.success).toBe(true);
    expect(result.data?.conversations[0].systemPrompt).toBe("You are helpful");
  });

  it("removes cost lines from messages", () => {
    const content = `# Test

## You

Hello

## Assistant

Response here
*Cost: $0.001*`;

    const result = parseMarkdown(content);
    expect(result.success).toBe(true);
    expect(result.data?.conversations[0].messages[1].content).toBe("Response here");
    expect(result.data?.conversations[0].messages[1].content).not.toContain("Cost");
  });

  it("handles System role", () => {
    const content = `# Test

## System

You are a helpful assistant

## You

Hello`;

    const result = parseMarkdown(content);
    expect(result.success).toBe(true);
    expect(result.data?.conversations[0].messages[0].role).toBe("system");
  });

  it("skips export header block", () => {
    const content = `# blah.chat Export

Exported on 2024-01-01

---

# Actual Conversation

## You

Hello`;

    const result = parseMarkdown(content);
    expect(result.success).toBe(true);
    expect(result.conversationsCount).toBe(1);
    expect(result.data?.conversations[0].title).toBe("Actual Conversation");
  });

  it("returns error for empty markdown", () => {
    const content = "";
    const result = parseMarkdown(content);
    expect(result.success).toBe(false);
    expect(result.error).toContain("No conversations found");
  });

  it("returns error for markdown without valid conversations", () => {
    const content = `# Just a Title

Some random text without any You/Assistant sections`;
    const result = parseMarkdown(content);
    expect(result.success).toBe(false);
    expect(result.error).toContain("Failed to parse any valid conversations");
  });

  it("handles multiline message content", () => {
    const content = `# Test

## You

Line 1
Line 2
Line 3

## Assistant

Response`;

    const result = parseMarkdown(content);
    expect(result.success).toBe(true);
    expect(result.data?.conversations[0].messages[0].content).toContain("Line 1");
    expect(result.data?.conversations[0].messages[0].content).toContain("Line 2");
    expect(result.data?.conversations[0].messages[0].content).toContain("Line 3");
  });

  it("skips conversations without title", () => {
    const content = `No title here

## You

Hello

---

# Valid Title

## You

Hello 2`;

    const result = parseMarkdown(content);
    expect(result.success).toBe(true);
    expect(result.conversationsCount).toBe(1);
    expect(result.data?.conversations[0].title).toBe("Valid Title");
  });
});
