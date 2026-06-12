export const TEXT_SUMMARIZATION_PROMPT = `Summarize the provided text in 2-4 sentences.

Rules:
- Capture the core points and conclusions, not surface details
- Preserve concrete facts (names, numbers, dates) that matter to the meaning
- Use plain prose, no markdown, no bullet points, no preamble
- Stay neutral; do not add opinions or information not in the text

Return only the summary text.`;
