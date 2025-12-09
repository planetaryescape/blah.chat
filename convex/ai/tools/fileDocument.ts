import { tool } from "ai";
import { z } from "zod";
import type { ActionCtx } from "../../_generated/server";
import { internal } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";

export function createFileDocumentTool(
	ctx: ActionCtx,
	conversationId: Id<"conversations">,
	messageAttachments?: Array<{
		type: "file" | "image" | "audio";
		name: string;
		storageId: string;
		mimeType: string;
		size: number;
	}>,
) {
	return tool({
		description:
			"Read and extract content from uploaded documents. Supports PDF, DOCX (Word), XLSX/XLS (Excel/spreadsheets), and text files. Use this when the user uploads a file and asks to analyze, summarize, or extract information from it.",
		inputSchema: z.object({
			fileIndex: z
				.number()
				.min(0)
				.describe(
					"Index of the file in the message attachments (0 for first file, 1 for second, etc.)",
				),
			action: z
				.enum(["read", "extract"])
				.default("read")
				.describe(
					"Action to perform: 'read' returns full text content, 'extract' returns structured data",
				),
		}),
		execute: async ({ fileIndex, action }) => {
			// Check if attachments exist
			if (!messageAttachments || messageAttachments.length === 0) {
				return {
					success: false,
					error: "No files attached to this message",
				};
			}

			// Validate file index
			if (fileIndex >= messageAttachments.length) {
				return {
					success: false,
					error: `File index ${fileIndex} out of range. ${messageAttachments.length} file(s) attached.`,
				};
			}

			const attachment = messageAttachments[fileIndex];

			// Only process file types (not images/audio)
			if (attachment.type !== "file") {
				return {
					success: false,
					error: `Cannot process ${attachment.type} attachments. Only file documents are supported.`,
				};
			}

			// Process the document
			const result = await ctx.runAction(
				internal.tools.fileDocument.processDocument,
				{
					storageId: attachment.storageId,
					fileName: attachment.name,
					mimeType: attachment.mimeType,
					action,
				},
			);

			return result;
		},
	});
}
