/**
 * UTF-8 Safe Streaming Utilities
 *
 * Handles surrogate pair splitting in streaming text chunks.
 * JavaScript strings use UTF-16 internally - emoji and complex chars
 * use surrogate pairs that can be split across chunk boundaries.
 *
 * High surrogate: 0xD800-0xDBFF
 * Low surrogate: 0xDC00-0xDFFF
 */

/**
 * Check if a char code is a high surrogate (first half of a surrogate pair)
 */
function isHighSurrogate(code: number): boolean {
  return code >= 0xd800 && code <= 0xdbff;
}

/**
 * Check if a char code is a low surrogate (second half of a surrogate pair)
 */
function isLowSurrogate(code: number): boolean {
  return code >= 0xdc00 && code <= 0xdfff;
}

/**
 * Buffers streaming text chunks to prevent surrogate pair splitting.
 *
 * When a chunk ends with a high surrogate (first half of an emoji/symbol),
 * it buffers the surrogate until the matching low surrogate arrives.
 */
export class StreamingTextBuffer {
  private pendingHighSurrogate = "";

  /**
   * Process a text chunk, buffering incomplete surrogate pairs.
   * @returns Safe text to use (may be empty if buffering)
   */
  process(chunk: string): string {
    if (!chunk) return "";

    // Prepend any pending high surrogate from previous chunk
    const input = this.pendingHighSurrogate + chunk;
    this.pendingHighSurrogate = "";

    if (input.length === 0) return "";

    // Check if input ends with a high surrogate (incomplete pair)
    const lastCharCode = input.charCodeAt(input.length - 1);
    if (isHighSurrogate(lastCharCode)) {
      // Buffer the trailing high surrogate, return the rest
      this.pendingHighSurrogate = input.slice(-1);
      return input.slice(0, -1);
    }

    return input;
  }

  /**
   * Flush any remaining buffered content (call at end of stream).
   * Replaces incomplete surrogates with replacement character.
   */
  flush(): string {
    const remaining = this.pendingHighSurrogate;
    this.pendingHighSurrogate = "";

    if (remaining && isHighSurrogate(remaining.charCodeAt(0))) {
      // Lone high surrogate - replace with Unicode replacement char
      return "\uFFFD";
    }
    return remaining;
  }

  /**
   * Check if there's pending buffered content
   */
  hasPending(): boolean {
    return this.pendingHighSurrogate.length > 0;
  }
}

/**
 * Validate that a string contains no lone surrogates.
 * Lone surrogates cause JSON.stringify() to fail.
 */
export function hasLoneSurrogates(text: string): boolean {
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    if (isHighSurrogate(code)) {
      // Check if followed by low surrogate
      if (i + 1 >= text.length || !isLowSurrogate(text.charCodeAt(i + 1))) {
        return true;
      }
      i++; // Skip the low surrogate we just checked
    } else if (isLowSurrogate(code)) {
      // Low surrogate not preceded by high surrogate
      return true;
    }
  }
  return false;
}

/**
 * Sanitize a string by removing lone surrogates.
 * Use as fallback when validation fails.
 */
export function sanitizeLoneSurrogates(text: string): string {
  let result = "";
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    if (isHighSurrogate(code)) {
      if (i + 1 < text.length && isLowSurrogate(text.charCodeAt(i + 1))) {
        // Valid pair - keep both
        result += text[i] + text[i + 1];
        i++;
      }
      // Lone high surrogate - skip
    } else if (isLowSurrogate(code)) {
      // Lone low surrogate - skip
    } else {
      result += text[i];
    }
  }
  return result;
}

/**
 * Check if a string is safe for JSON serialization.
 * Tests for lone surrogates and other problematic sequences.
 */
export function isJsonSafe(text: string): boolean {
  try {
    JSON.stringify(text);
    return true;
  } catch {
    return false;
  }
}

/**
 * Safely stringify an object, sanitizing strings if needed.
 * Falls back to sanitizing lone surrogates on failure.
 */
export function safeJsonStringify(obj: unknown): string {
  try {
    return JSON.stringify(obj);
  } catch {
    // Sanitize string fields
    if (typeof obj === "string") {
      return JSON.stringify(sanitizeLoneSurrogates(obj));
    }
    if (typeof obj === "object" && obj !== null) {
      const sanitized = JSON.parse(
        JSON.stringify(obj, (_, value) => {
          if (typeof value === "string" && hasLoneSurrogates(value)) {
            return sanitizeLoneSurrogates(value);
          }
          return value;
        }),
      );
      return JSON.stringify(sanitized);
    }
    throw new Error("Unable to stringify object");
  }
}
