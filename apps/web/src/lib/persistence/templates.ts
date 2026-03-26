import { BUILT_IN_TEMPLATES } from "@blah-chat/backend/convex/lib/prompts/templates/builtIn";
import { templates } from "@blah-chat/persistence-postgres";
import { and, desc, eq, or, sql } from "drizzle-orm";
import { NotFoundError } from "@/lib/api/errors";
import { ensureCurrentPersistenceUser } from "./current-user";
import { getPersistenceDb } from "./server";

type TemplateRecord = typeof templates.$inferSelect;

export type ApiTemplate = {
  _id: string;
  name: string;
  prompt: string;
  description?: string;
  category: string;
  isBuiltIn: boolean;
  usageCount: number;
  createdAt: number;
  updatedAt: number;
};

function toApiTemplate(template: TemplateRecord): ApiTemplate {
  return {
    _id: template.id,
    name: template.name,
    prompt: template.prompt,
    description: template.description ?? undefined,
    category: template.category,
    isBuiltIn: template.isBuiltIn,
    usageCount: template.usageCount,
    createdAt: template.createdAt,
    updatedAt: template.updatedAt,
  };
}

async function assertOwnedTemplate(clerkUserId: string, templateId: string) {
  const db = getPersistenceDb();
  const user = await ensureCurrentPersistenceUser(clerkUserId);
  const template = await db.query.templates.findFirst({
    where: and(eq(templates.id, templateId), eq(templates.userId, user.id)),
  });

  if (!template) {
    throw new NotFoundError("Template", templateId);
  }

  return { db, user, template };
}

export async function listTemplates(clerkUserId: string) {
  const db = getPersistenceDb();
  const user = await ensureCurrentPersistenceUser(clerkUserId);
  const rows = await db.query.templates.findMany({
    where: or(
      eq(templates.userId, user.id),
      and(eq(templates.isBuiltIn, true), eq(templates.isPublic, true)),
    ),
    orderBy: [desc(templates.updatedAt)],
  });

  const stored = rows.map(toApiTemplate);
  const existingBuiltInNames = new Set(
    stored
      .filter((template) => template.isBuiltIn)
      .map((template) => template.name),
  );
  const fallbackBuiltIns = BUILT_IN_TEMPLATES.filter(
    (template) => !existingBuiltInNames.has(template.name),
  ).map((template, index) => ({
    _id: `builtin_${index}_${template.name.toLowerCase().replace(/\s+/g, "_")}`,
    name: template.name,
    prompt: template.prompt,
    description: template.description,
    category: template.category,
    isBuiltIn: true,
    usageCount: 0,
    createdAt: 0,
    updatedAt: 0,
  }));

  return [...fallbackBuiltIns, ...stored];
}

export async function createTemplate(
  clerkUserId: string,
  input: {
    name: string;
    prompt: string;
    description?: string;
    category: string;
  },
) {
  const db = getPersistenceDb();
  const user = await ensureCurrentPersistenceUser(clerkUserId);

  const [template] = await db
    .insert(templates)
    .values({
      userId: user.id,
      name: input.name.trim(),
      prompt: input.prompt.trim(),
      description: input.description?.trim() || null,
      category: input.category,
      isBuiltIn: false,
      isPublic: false,
      usageCount: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    })
    .returning();

  if (!template) {
    throw new Error("Failed to create template");
  }

  return toApiTemplate(template);
}

export async function updateTemplate(
  clerkUserId: string,
  templateId: string,
  input: {
    name?: string;
    prompt?: string;
    description?: string;
    category?: string;
  },
) {
  const { db, template } = await assertOwnedTemplate(clerkUserId, templateId);

  const [updated] = await db
    .update(templates)
    .set({
      name: input.name !== undefined ? input.name.trim() : template.name,
      prompt:
        input.prompt !== undefined ? input.prompt.trim() : template.prompt,
      description:
        input.description !== undefined
          ? input.description.trim() || null
          : template.description,
      category:
        input.category !== undefined ? input.category : template.category,
      updatedAt: Date.now(),
    })
    .where(eq(templates.id, template.id))
    .returning();

  if (!updated) {
    throw new Error("Failed to update template");
  }

  return toApiTemplate(updated);
}

export async function deleteTemplate(clerkUserId: string, templateId: string) {
  const { db, template } = await assertOwnedTemplate(clerkUserId, templateId);
  await db.delete(templates).where(eq(templates.id, template.id));
  return { deleted: true, templateId: template.id };
}

export async function incrementTemplateUsage(
  clerkUserId: string,
  templateId: string,
) {
  const db = getPersistenceDb();
  const user = await ensureCurrentPersistenceUser(clerkUserId);

  // Allow incrementing usage on both owned and built-in public templates
  const template = await db.query.templates.findFirst({
    where: or(
      and(eq(templates.id, templateId), eq(templates.userId, user.id)),
      and(
        eq(templates.id, templateId),
        eq(templates.isBuiltIn, true),
        eq(templates.isPublic, true),
      ),
    ),
  });

  if (!template) {
    throw new NotFoundError("Template", templateId);
  }

  const [updated] = await db
    .update(templates)
    .set({
      usageCount: sql`${templates.usageCount} + 1`,
      updatedAt: Date.now(),
    })
    .where(eq(templates.id, template.id))
    .returning();

  if (!updated) {
    throw new Error("Failed to increment template usage");
  }

  return toApiTemplate(updated);
}
