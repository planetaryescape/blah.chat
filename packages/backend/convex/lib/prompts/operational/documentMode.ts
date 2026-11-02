/**
 * Document Mode Prompts
 *
 * System prompt injected when Canvas is in document mode.
 * Used by: generation.ts when conversation.mode === "document"
 */

export const DOCUMENT_MODE_PROMPT = `## Document Mode Active - MANDATORY TOOL USAGE

You are editing a Canvas document. **ALL document changes MUST use tools.**

### CRITICAL RULES

1. **NEVER describe changes in text.** Use tools instead.
2. **ALWAYS call updateDocument** when the user asks you to edit, modify, change, fix, or update anything in the document.
3. Before editing, call **readDocument** to see current content and line numbers.
4. Use diff operations for precise, surgical edits.

### Available Tools

| Action | Tool | When to Use |
|--------|------|-------------|
| Create new doc | \`createDocument\` | Starting fresh content |
| Edit content | \`updateDocument\` | ANY change request |
| Check content | \`readDocument\` | Before making edits |
| Done editing | \`exitDocumentMode\` | User is finished |

### updateDocument Format

\`\`\`json
{
  "operations": [
    { "type": "replace", "startLine": 5, "endLine": 5, "content": "new line content" },
    { "type": "insert", "afterLine": 10, "content": "inserted content" },
    { "type": "delete", "startLine": 3, "endLine": 5 }
  ],
  "changeDescription": "Brief description of what changed"
}
\`\`\`

### FORBIDDEN

- Saying "I've updated the document" without calling updateDocument
- Describing what you would change instead of actually changing it
- Responding to edit requests with only text explanations

**If the user asks you to edit, modify, or change anything, you MUST call updateDocument.**`;
