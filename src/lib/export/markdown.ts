import type { Doc } from "../../../convex/_generated/dataModel";

export function exportConversationToMarkdown(
  conversation: Doc<"conversations">,
  messages: Doc<"messages">[],
): string {
  let md = `# ${conversation.title}\n\n`;
  md += `**Created**: ${new Date(conversation.createdAt).toLocaleString()}\n`;
  md += `**Model**: ${conversation.model}\n`;
  if (conversation.systemPrompt) {
    md += `**System Prompt**: ${conversation.systemPrompt}\n`;
  }
  md += `\n---\n\n`;

  for (const msg of messages) {
    const role =
      msg.role === "user"
        ? "You"
        : msg.role === "assistant"
          ? "Assistant"
          : "System";
    md += `## ${role}\n\n`;
    md += `${msg.content}\n\n`;

    if (msg.cost) {
      md += `*Cost: $${msg.cost.toFixed(4)} | Tokens: ${msg.inputTokens || 0}/${msg.outputTokens || 0}*\n\n`;
    }

    if (msg.attachments && msg.attachments.length > 0) {
      md += `**Attachments**: ${msg.attachments.map((a: any) => a.name).join(", ")}\n\n`;
    }
  }

  return md;
}

export function exportAllToMarkdown(
  conversations: Array<Doc<"conversations"> & { messages: Doc<"messages">[] }>,
): string {
  let md = `# blah.chat Export\n\n`;
  md += `**Exported**: ${new Date().toLocaleString()}\n`;
  md += `**Conversations**: ${conversations.length}\n\n`;
  md += `---\n\n`;

  for (const conv of conversations) {
    md += exportConversationToMarkdown(conv, conv.messages);
    md += `\n\n---\n\n`;
  }

  return md;
}

export function generateMarkdownFilename(conversationTitle?: string): string {
  const timestamp = new Date().toISOString().split("T")[0];
  if (conversationTitle) {
    const sanitized = conversationTitle
      .replace(/[^a-z0-9]/gi, "-")
      .toLowerCase();
    return `${sanitized}-${timestamp}.md`;
  }
  return `blah-chat-export-${timestamp}.md`;
}
