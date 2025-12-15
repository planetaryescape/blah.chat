"use node";

import { v } from "convex/values";
import { internalAction } from "../_generated/server";

export const processDocument = internalAction({
  args: {
    storageId: v.string(),
    fileName: v.string(),
    mimeType: v.string(),
    action: v.union(v.literal("read"), v.literal("extract")),
  },
  handler: async (ctx, { storageId, fileName, mimeType, action }) => {
    try {
      // Get file from storage
      const url = await ctx.storage.getUrl(storageId);
      if (!url) {
        throw new Error("File not found in storage");
      }

      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();

      let content = "";
      let metadata: Record<string, any> = {};

      // Process based on MIME type
      if (mimeType === "application/pdf") {
        // PDF processing with unpdf (modern ESM library)
        const { extractText } = await import("unpdf");

        // Extract text content (mergePages: true returns single string)
        const buffer = new Uint8Array(arrayBuffer);
        const result = await extractText(buffer, { mergePages: true });
        content = result.text;

        // Metadata
        metadata = {
          pages: result.totalPages,
        };
      } else if (
        mimeType ===
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      ) {
        // DOCX processing with mammoth
        const mammothModule = await import("mammoth");
        // Handle both ESM default export and CommonJS module.exports
        const mammoth = mammothModule.default || mammothModule;
        const result = await mammoth.extractRawText({
          buffer: Buffer.from(arrayBuffer),
        });

        content = result.value;
        metadata = {
          warnings: result.messages,
        };
      } else if (
        mimeType.includes("spreadsheet") ||
        mimeType.includes("excel") ||
        mimeType === "application/vnd.ms-excel" ||
        mimeType ===
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      ) {
        // Excel/Spreadsheet processing
        const XLSX = await import("xlsx");
        const workbook = XLSX.read(arrayBuffer, { type: "buffer" });

        // Convert all sheets to CSV
        const sheets: Record<string, string> = {};
        for (const sheetName of workbook.SheetNames) {
          const sheet = workbook.Sheets[sheetName];
          sheets[sheetName] = XLSX.utils.sheet_to_csv(sheet);
        }

        content =
          Object.entries(sheets)
            .map(([name, csv]) => `## Sheet: ${name}\n\n${csv}`)
            .join("\n\n") || "";

        metadata = {
          sheets: workbook.SheetNames,
          sheetCount: workbook.SheetNames.length,
        };
      } else if (mimeType === "text/plain" || mimeType.startsWith("text/")) {
        // Plain text
        content = Buffer.from(arrayBuffer).toString("utf-8");
      } else if (
        mimeType ===
          "application/vnd.openxmlformats-officedocument.presentationml.presentation" ||
        mimeType === "application/vnd.ms-powerpoint"
      ) {
        // PowerPoint PPTX processing - try pptx-content-extractor first for images,
        // fall back to officeparser for robust text extraction
        const buffer = Buffer.from(arrayBuffer);
        let usedFallback = false;

        try {
          // First attempt: pptx-content-extractor (supports images)
          const pptxModule = await import("pptx-content-extractor");
          const extractPptx =
            pptxModule.extractPptx ||
            (pptxModule.default && pptxModule.default.extractPptx) ||
            pptxModule.default;
          const fs = await import("fs");
          const os = await import("os");
          const path = await import("path");

          // Write to temp file (library requires file path)
          const tempDir = os.tmpdir();
          const tempFile = path.join(
            tempDir,
            `pptx_${Date.now()}_${fileName}`,
          );
          fs.writeFileSync(tempFile, buffer);

          try {
            const pptxContent = await extractPptx(tempFile);

            // Build content with slide text
            const slideTexts: string[] = [];
            if (pptxContent.slides && pptxContent.slides.length > 0) {
              for (let i = 0; i < pptxContent.slides.length; i++) {
                const slide = pptxContent.slides[i];
                const slideText = slide.content
                  .map((el) => el.text.join(" "))
                  .filter((t) => t.trim())
                  .join("\n");
                if (slideText.trim()) {
                  slideTexts.push(`## Slide ${i + 1}\n\n${slideText.trim()}`);
                }
              }
            }

            // Extract notes
            if (pptxContent.notes && pptxContent.notes.length > 0) {
              const notesText = pptxContent.notes
                .filter((n) => n.content && (n.content as string).trim())
                .map((n, i) => `### Note for Slide ${i + 1}\n${n.content}`)
                .join("\n\n");
              if (notesText) {
                slideTexts.push(`## Speaker Notes\n\n${notesText}`);
              }
            }

            // Extract images
            const imageCount = pptxContent.media?.length || 0;
            if (imageCount > 0) {
              const images = pptxContent.media
                .slice(0, 10)
                .map((img, i) => ({
                  index: i,
                  name: img.name || `image_${i + 1}`,
                  base64: img.content as string,
                }));
              if (images.length > 0) {
                slideTexts.push(
                  `## Images\n\nThis presentation contains ${images.length} image(s).`,
                );
                metadata.images = images;
              }
            }

            content =
              slideTexts.join("\n\n") || "[No text content found in slides]";
            metadata = {
              type: "presentation",
              slideCount: pptxContent.slides?.length || 0,
              hasNotes: pptxContent.notes?.length > 0,
              imageCount,
              ...metadata,
            };
          } finally {
            try {
              fs.unlinkSync(tempFile);
            } catch {
              // Ignore cleanup errors
            }
          }
        } catch (pptxError) {
          // Fallback: use officeparser for robust text extraction
          console.log(
            `[Tool:fileDocument] pptx-content-extractor failed, falling back to officeparser`,
          );
          usedFallback = true;

          const officeparserModule = await import("officeparser");
          const officeparser =
            officeparserModule.default || officeparserModule;
          content = await officeparser.parseOfficeAsync(buffer);
          metadata = {
            type: "presentation",
            note: "Images not extracted (fallback mode)",
          };
        }

        if (usedFallback && !content.trim()) {
          content = "[Could not extract text content from this presentation]";
        }
      } else {
        throw new Error(`Unsupported file type: ${mimeType}`);
      }

      const wordCount = content.split(/\s+/).filter((w) => w.length > 0).length;

      // Truncate for context size management
      const maxLength = 50000; // ~50k chars
      const truncated = content.slice(0, maxLength);
      const isTruncated = content.length > maxLength;

      return {
        success: true,
        fileName,
        mimeType,
        action,
        content: truncated,
        wordCount,
        characterCount: content.length,
        truncated: isTruncated,
        metadata,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to process file";
      console.error(`[Tool:fileDocument] ❌ Failed to process "${fileName}":`, {
        storageId,
        mimeType,
        action,
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined,
      });
      return {
        success: false,
        fileName,
        mimeType,
        error: errorMessage,
      };
    }
  },
});
