# File/Document Tool

## Overview

Read and process files from the user's uploaded documents or conversation attachments.

---

## Priority

**🟢 FUTURE** - Depends on file upload infrastructure.

---

## Use Cases

- "Summarize the PDF I uploaded"
- "Extract data from this spreadsheet"
- "What does this document say about X?"

---

## Prerequisites

- File storage in Convex
- PDF/document parsing (pdf-parse, mammoth for DOCX)
- Integration with message attachments

---

## External Dependencies

For document parsing:
- `pdf-parse` - PDF text extraction
- `mammoth` - DOCX to HTML
- `xlsx` - Excel parsing

---

## Implementation Complexity

**🔴 HIGH** - Depends on file infrastructure

---

## Tool Schema

```typescript
inputSchema: z.object({
  fileId: z.string().describe("ID of uploaded file"),
  action: z.enum(["read", "summarize", "extract"]),
  query: z.string().optional().describe("What to extract/find"),
})
```

---

## Notes

blah.chat already has file upload. This tool would surface that content to the LLM on-demand rather than always including it in context.
