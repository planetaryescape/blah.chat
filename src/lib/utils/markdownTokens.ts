/**
 * Markdown Token Parser
 * Ensures we don't show incomplete markdown syntax during streaming.
 * Prevents "Flash of Incomplete Markdown" (FOIM).
 */

/**
 * Returns the longest complete markdown prefix from the given text.
 * Incomplete tokens (unclosed code blocks, bold, links, etc.) are held back.
 *
 * @example
 * getCompleteMarkdownPrefix("**bold te") → "" (waits for closing **)
 * getCompleteMarkdownPrefix("**bold text**") → "**bold text**"
 * getCompleteMarkdownPrefix("```js\nconst") → "" (waits for closing ```)
 */
export function getCompleteMarkdownPrefix(text: string): string {
	if (!text) return "";

	let result = text;

	// 1. Check for incomplete code blocks (``` must be paired)
	const codeBlockMatches = text.match(/```/g);
	const codeBlockCount = codeBlockMatches?.length ?? 0;

	if (codeBlockCount % 2 !== 0) {
		// Odd number of ``` - incomplete block
		const lastBlockStart = text.lastIndexOf("```");
		result = text.slice(0, lastBlockStart);
	}

	// 2. Check for incomplete inline code (` must be paired)
	// Only check the portion after code blocks to avoid false positives
	const afterCodeBlocks = result;
	const backtickMatches = afterCodeBlocks.match(/(?<!`)`(?!`)/g); // Single backticks only
	const backtickCount = backtickMatches?.length ?? 0;

	if (backtickCount % 2 !== 0) {
		// Odd number of ` - incomplete inline code
		const lastTick = afterCodeBlocks.lastIndexOf("`");
		result = afterCodeBlocks.slice(0, lastTick);
	}

	// 3. Check for incomplete bold/italic (**, *, __, _)
	// Look at last 20 chars to avoid expensive full-text regex
	const trailing = result.slice(-20);
	const incompleteEmphasis =
		trailing.match(/(\*\*(?!\*\*)(?:[^*]|(?!\*\*)\*)*$)/) || // Unclosed **
		trailing.match(/((?<!\*)\*(?!\*)(?:[^*])*$)/) || // Unclosed *
		trailing.match(/(__(?!__)(?:[^_]|(?!__)_)*$)/) || // Unclosed __
		trailing.match(/((?<!_)_(?!_)(?:[^_])*$)/); // Unclosed _

	if (incompleteEmphasis) {
		const matchLength = incompleteEmphasis[0].length;
		result = result.slice(0, -matchLength);
	}

	// 4. Check for incomplete links/images
	// Pattern: ![text or [text with no closing ]
	const incompleteLinkOrImage = result.match(/(!?\[[^\]]*?)$/);
	if (incompleteLinkOrImage) {
		const matchLength = incompleteLinkOrImage[0].length;
		result = result.slice(0, -matchLength);
	}

	// 5. Check for link with text but no URL: [text](
	const incompleteLinkUrl = result.match(/\[[^\]]+\]\((?:[^)]*?)$/);
	if (incompleteLinkUrl) {
		const matchLength = incompleteLinkUrl[0].length;
		result = result.slice(0, -matchLength);
	}

	return result;
}

/**
 * Get the next complete token-aware chunk from a buffer.
 * Prefers breaking at word boundaries (whitespace, punctuation).
 *
 * @param buffer - The text buffer to chunk
 * @param maxChars - Maximum characters to return
 * @param minTokenSize - Minimum chunk size (prevents single-char splits)
 * @returns A chunk of text that respects word boundaries
 */
export function getNextCompleteToken(
	buffer: string,
	maxChars: number,
	minTokenSize = 3,
): string {
	if (buffer.length <= maxChars) {
		// Entire buffer fits, but check for incomplete markdown
		return getCompleteMarkdownPrefix(buffer);
	}

	// Look for safe break points (whitespace, punctuation)
	// Start from maxChars and scan backwards for word boundary
	for (let i = maxChars; i >= minTokenSize; i--) {
		const char = buffer[i];
		if (/[\s.,;:!?)\]}>]/.test(char)) {
			// Found a break point - return chunk up to and including this char
			const chunk = buffer.slice(0, i + 1);
			return getCompleteMarkdownPrefix(chunk);
		}
	}

	// No break point found - respect minTokenSize as fallback
	const chunk = buffer.slice(0, Math.max(maxChars, minTokenSize));
	return getCompleteMarkdownPrefix(chunk);
}
