export function buildConsolidationPrompt(
	originalPrompt: string,
	responses: Array<{ model: string; content: string }>,
): string {
	const modelList = responses.map((r) => r.model).join(", ");

	let prompt = `Here are ${responses.length} responses from ${modelList} about:\n\n`;
	prompt += `**Original prompt:** "${originalPrompt}"\n\n`;

	for (const [idx, r] of responses.entries()) {
		prompt += `**Response from ${r.model}:**\n${r.content}\n\n`;
	}

	prompt +=
		"Can you consolidate all of this information into one comprehensive, well-organized response? Identify common themes, reconcile any differences, and synthesize the best insights from each response.";

	return prompt;
}
