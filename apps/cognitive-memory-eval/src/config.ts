import { readFileSync } from "node:fs";
import { z } from "zod";

const configSchema = z.object({
  models: z.object({
    personaGen: z.string(),
    conversationGen: z.string(),
    questionGen: z.string(),
    answerGen: z.string(),
    judge: z.string(),
  }),
  sizes: z.object({
    personas: z.number().int().positive(),
    sessionsPerPersona: z.number().int().positive(),
    questionsPerPersona: z.number().int().positive(),
    messagesPerSessionMin: z.number().int().positive(),
    messagesPerSessionMax: z.number().int().positive(),
  }),
  concurrency: z.object({
    answers: z.number().int().positive(),
    judge: z.number().int().positive(),
  }),
  retrieval: z.object({
    limit: z.number().int().positive(),
    includeAssociations: z.boolean(),
  }),
  seed: z.string(),
});

export type EvalConfig = z.infer<typeof configSchema>;

export function loadConfig(): EvalConfig {
  const raw = readFileSync(new URL("../config.json", import.meta.url), "utf8");
  return configSchema.parse(JSON.parse(raw));
}
