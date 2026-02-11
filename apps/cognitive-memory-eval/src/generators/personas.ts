import { z } from "zod";
import { loadConfig } from "../config";
import type { Persona } from "../types";
import { fileExists, readJson, writeJsonAtomic } from "../utils/fs";
import { llmGenerateObject } from "../utils/llm";
import { log } from "../utils/log";
import { dataPath } from "../utils/paths";

const personaSchema = z.object({
  id: z.string(),
  name: z.string(),
  age: z.number().int().min(18).max(90),
  occupation: z.string(),
  interests: z.array(z.string()).min(3),
  personality: z.string(),
  communicationStyle: z.string(),
});

function promptFor(id: string) {
  return [
    "Generate a realistic user persona. Return JSON matching schema.",
    `id: ${id}`,
    "Diversity: age 22-65, varied occupations, 5-10 interests, distinct communication style.",
  ].join("\n");
}

export async function generatePersonas(options: {
  count: number;
  force: boolean;
  dryRun: boolean;
}): Promise<Persona[]> {
  const outPath = dataPath("personas.json");
  if (fileExists(outPath) && !options.force) {
    log(`personas skip (exists) ${outPath}`);
    return readJson<Persona[]>(outPath);
  }
  if (options.dryRun) {
    if (!fileExists(outPath)) throw new Error("dry-run: personas.json missing");
    return readJson<Persona[]>(outPath);
  }

  const cfg = loadConfig();
  const personas: Persona[] = [];

  for (let i = 1; i <= options.count; i++) {
    const id = `persona_${String(i).padStart(3, "0")}`;
    log(`persona ${i}/${options.count} ${id}`);
    const p = await llmGenerateObject({
      modelId: cfg.models.personaGen,
      tag: "persona-gen",
      schema: personaSchema,
      prompt: promptFor(id),
      temperature: 0.7,
    });
    personas.push({ ...(p as any), id });
  }

  await writeJsonAtomic(outPath, personas);
  return personas;
}
