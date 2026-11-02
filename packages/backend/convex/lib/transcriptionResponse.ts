import { z } from "zod";

const responseSchema = z.object({
  text: z.string(),
  duration: z.number().finite().nonnegative(),
});

// verbose_json returns provider-measured seconds, not encoded-file PCM estimates.
export function parseTranscriptionResult(value: unknown) {
  const result = responseSchema.parse(value);
  return { text: result.text, durationMinutes: result.duration / 60 };
}
