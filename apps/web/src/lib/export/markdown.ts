import type { Doc, Id } from "@blah-chat/backend/convex/_generated/dataModel";

interface SourceInfo {
  position: number;
  title?: string | null;
  url: string;
}

export function exportConversationToMarkdown(
  conversation: Doc<"conversations">,
  messages: Doc<"messages">[],
  sourcesByMessage?: Map<Id<"messages">, SourceInfo[]>,
): string {
  let md = `# ${conversation.title}\n\n`;
  md += `*Created: ${new Date(conversation.createdAt).toLocaleString()}*\n\n`;
  md += `---\n\n`;

  for (const msg of messages) {
    const role =
      msg.role === "user"
        ? "You"
        : msg.role === "assistant"
          ? "Assistant"
          : "System";
    md += `**${role}:**\n\n`;
    md += `${msg.content}\n\n`;

    // Add sources for this message
    const sources = sourcesByMessage?.get(msg._id);
    if (sources?.length) {
      md += `**Sources:**\n`;
      for (const src of sources) {
        md += `- [${src.position}] [${src.title || src.url}](${src.url})\n`;
      }
      md += `\n`;
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
