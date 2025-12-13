import type { ImportData, ImportMessage, ImportResult } from "../types";

export function parseMarkdown(content: string): ImportResult {
  try {
    // Split by conversation separators
    const conversationBlocks = content.split(/\n---\n\n/).filter((block) => {
      return block.trim().length > 0 && !block.startsWith("# blah.chat Export");
    });

    if (conversationBlocks.length === 0) {
      return {
        success: false,
        error: "No conversations found in markdown file",
      };
    }

    const conversations = conversationBlocks
      .map((block) => {
        // Extract title
        const titleMatch = block.match(/^# (.+?)$/m);
        if (!titleMatch) return null;

        const title = titleMatch[1];

        // Extract metadata
        const modelMatch = block.match(/\*\*Model\*\*: (.+?)$/m);
        const systemPromptMatch = block.match(/\*\*System Prompt\*\*: (.+?)$/m);

        // Extract messages using regex pattern matching
        const messages: ImportMessage[] = [];
        const messagePattern =
          /## (You|Assistant|System)\n\n([\s\S]*?)(?=\n## |$)/g;

        // Use regex matchAll for safe iteration (not child_process)
        const matches = [...block.matchAll(messagePattern)];

        for (const match of matches) {
          const role = match[1];
          let content = match[2].trim();

          // Remove cost line if present
          content = content.replace(/\*Cost:.*?\*\n*$/m, "").trim();

          messages.push({
            role:
              role === "You"
                ? "user"
                : role === "Assistant"
                  ? "assistant"
                  : "system",
            content,
          });
        }

        if (messages.length === 0) return null;

        return {
          title,
          model: modelMatch?.[1],
          systemPrompt: systemPromptMatch?.[1],
          messages,
        };
      })
      .filter((conv): conv is NonNullable<typeof conv> => conv !== null);

    if (conversations.length === 0) {
      return {
        success: false,
        error: "Failed to parse any valid conversations from markdown",
      };
    }

    const totalMessages = conversations.reduce(
      (sum, conv) => sum + conv.messages.length,
      0,
    );

    return {
      success: true,
      data: {
        conversations,
        format: "markdown",
      },
      conversationsCount: conversations.length,
      messagesCount: totalMessages,
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to parse Markdown: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}
