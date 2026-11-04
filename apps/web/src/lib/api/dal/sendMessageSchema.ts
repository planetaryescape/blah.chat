import { z } from "zod";

export const sendMessageSchema = z
  .object({
    content: z.string().min(1),
    modelId: z.string().optional(),
    models: z.array(z.string()).optional(),
    clientMessageId: z.string().min(1).max(256).optional(),
    thinkingEffort: z.enum(["none", "low", "medium", "high"]).optional(),
    attachments: z
      .array(
        z.object({
          type: z.enum(["file", "image", "audio"]),
          name: z.string(),
          storageId: z.string(),
          mimeType: z.string(),
          size: z.number(),
        }),
      )
      .optional(),
  })
  .superRefine((value, context) => {
    if (value.clientMessageId && value.modelId !== undefined && value.models) {
      context.addIssue({
        code: "custom",
        message: "Choose either modelId or models for a keyed send.",
        path: ["models"],
      });
    }
  });
