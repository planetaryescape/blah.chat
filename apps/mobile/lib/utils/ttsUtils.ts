/**
 * TTS utility functions ported from web app.
 */

export const CHUNK_LIMIT = 200;

/**
 * Clamp a number between min and max values.
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Chunk text into smaller pieces for TTS processing.
 * Splits at sentence boundaries when possible.
 */
export function chunkText(
  text: string,
  maxChars: number = CHUNK_LIMIT,
): string[] {
  if (text.length <= maxChars) return [text];

  const chunks: string[] = [];
  let remaining = text;

  while (remaining.length > 0) {
    if (remaining.length <= maxChars) {
      chunks.push(remaining);
      break;
    }

    let splitIndex = maxChars;
    const searchArea = remaining.slice(0, maxChars);

    // Look for sentence endings
    const lastPeriod = Math.max(
      searchArea.lastIndexOf(". "),
      searchArea.lastIndexOf("! "),
      searchArea.lastIndexOf("? "),
      searchArea.lastIndexOf(".\n"),
      searchArea.lastIndexOf("!\n"),
      searchArea.lastIndexOf("?\n"),
    );

    if (lastPeriod > maxChars * 0.3) {
      splitIndex = lastPeriod + 1;
    } else {
      const lastComma = searchArea.lastIndexOf(", ");
      if (lastComma > maxChars * 0.3) {
        splitIndex = lastComma + 1;
      } else {
        const lastSpace = searchArea.lastIndexOf(" ");
        if (lastSpace > maxChars * 0.3) {
          splitIndex = lastSpace;
        }
      }
    }

    chunks.push(remaining.slice(0, splitIndex).trim());
    remaining = remaining.slice(splitIndex).trim();
  }

  return chunks.filter((c) => c.length > 0);
}

/**
 * Construct TTS API URL with parameters.
 */
export function getTTSUrl(
  text: string,
  voice?: string,
  speed?: number,
): string {
  const convexUrl = process.env.EXPO_PUBLIC_CONVEX_URL || "";
  let baseUrl = "";

  if (convexUrl) {
    if (convexUrl.includes(".convex.cloud")) {
      baseUrl = convexUrl.replace(".convex.cloud", ".convex.site");
    } else {
      baseUrl = convexUrl;
    }
  }

  const finalUrl = `${baseUrl}/tts`;
  const params = new URLSearchParams();
  params.set("text", text);
  if (voice) params.set("voice", voice);
  if (speed) params.set("speed", speed.toString());

  return `${finalUrl}?${params.toString()}`;
}
