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
				// DOCX processing
				const mammoth = await import("mammoth");
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
			return {
				success: false,
				fileName,
				mimeType,
				error: error instanceof Error ? error.message : "Failed to process file",
			};
		}
	},
});
