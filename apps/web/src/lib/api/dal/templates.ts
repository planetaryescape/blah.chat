import { z } from "zod";
import {
  createTemplate,
  deleteTemplate,
  incrementTemplateUsage,
  listTemplates,
  updateTemplate,
} from "@/lib/persistence/templates";
import { formatEntity, formatEntityList } from "@/lib/utils/formatEntity";
import "server-only";

const createTemplateSchema = z.object({
  name: z.string().min(1).max(100),
  prompt: z.string().min(1).max(5000),
  description: z.string().max(200).optional(),
  category: z.enum(["coding", "writing", "analysis", "creative"]),
});

const updateTemplateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  prompt: z.string().min(1).max(5000).optional(),
  description: z.string().max(200).optional(),
  category: z.enum(["coding", "writing", "analysis", "creative"]).optional(),
});

export const templatesDAL = {
  list: async (clerkUserId: string) => {
    const items = await listTemplates(clerkUserId);
    return formatEntityList(items, "template");
  },

  create: async (
    clerkUserId: string,
    payload: z.input<typeof createTemplateSchema>,
  ) => {
    const validated = createTemplateSchema.parse(payload);
    const template = await createTemplate(clerkUserId, validated);
    return formatEntity(template, "template", template._id);
  },

  update: async (
    clerkUserId: string,
    templateId: string,
    payload: z.input<typeof updateTemplateSchema>,
  ) => {
    const validated = updateTemplateSchema.parse(payload);
    const template = await updateTemplate(clerkUserId, templateId, validated);
    return formatEntity(template, "template", template._id);
  },

  remove: async (clerkUserId: string, templateId: string) => {
    const result = await deleteTemplate(clerkUserId, templateId);
    return formatEntity(result, "template", templateId);
  },

  incrementUsage: async (clerkUserId: string, templateId: string) => {
    const template = await incrementTemplateUsage(clerkUserId, templateId);
    return formatEntity(template, "template", template._id);
  },
};
