import { z } from "zod";

const generationEventBaseSchema = z.object({
  requestId: z.string().min(1),
  sessionId: z.string().min(1),
  assistantMessageId: z.string().min(1),
  modelId: z.string().min(1),
  seq: z.number().int().nonnegative(),
  ts: z.number().int().nonnegative(),
});

const generationDeltaEventSchema = generationEventBaseSchema.extend({
  type: z.literal("delta"),
  delta: z.string(),
});

const generationStartEventSchema = generationEventBaseSchema.extend({
  type: z.literal("start"),
});

const generationCheckpointEventSchema = generationEventBaseSchema.extend({
  type: z.literal("checkpoint"),
  content: z.string(),
});

const generationCompleteEventSchema = generationEventBaseSchema.extend({
  type: z.literal("complete"),
  content: z.string(),
});

const generationErrorEventSchema = generationEventBaseSchema.extend({
  type: z.literal("error"),
  error: z.string().min(1),
  retryable: z.boolean().optional(),
});

const generationCancelledEventSchema = generationEventBaseSchema.extend({
  type: z.literal("cancelled"),
  reason: z.string().optional(),
});

/**
 * Fast acknowledgement emitted by a small/cheap model before the main
 * generation begins. Transient — not persisted, not part of the
 * heavy-model context, just a UI signal that the system heard the user.
 */
const generationAckEventSchema = generationEventBaseSchema.extend({
  type: z.literal("ack"),
  text: z.string().min(1),
});

export const generationEventSchema = z.discriminatedUnion("type", [
  generationStartEventSchema,
  generationDeltaEventSchema,
  generationCheckpointEventSchema,
  generationCompleteEventSchema,
  generationErrorEventSchema,
  generationCancelledEventSchema,
  generationAckEventSchema,
]);

export type GenerationEvent = z.infer<typeof generationEventSchema>;

export function parseGenerationEvent(input: unknown): GenerationEvent {
  return generationEventSchema.parse(input);
}

export function generationEventStreamKey(requestId: string) {
  return `generation:${requestId}:events`;
}

export function generationCancelKey(requestId: string) {
  return `generation:${requestId}:cancel`;
}

export function generationRequestMetaKey(requestId: string) {
  return `generation:${requestId}:meta`;
}

export function generationSessionStateKey(sessionId: string) {
  return `generation-session:${sessionId}:state`;
}

export function formatGenerationSseEvent(event: GenerationEvent): string {
  return `event: generation\ndata: ${JSON.stringify(event)}\n\n`;
}
