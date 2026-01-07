import type { ModelProfile } from "./types";

/**
 * GPT-5.1 Codex - Optimized for agentic coding tasks
 *
 * Research sources:
 * - OpenAI developer documentation
 * - Specialized for software engineering workflows
 * - Strong on HumanEval and coding benchmarks
 */
export const openaiGpt51CodexProfile: ModelProfile = {
	modelId: "openai:gpt-5.1-codex",
	categoryScores: {
		coding: 96,
		reasoning: 90,
		creative: 70,
		factual: 80,
		analysis: 85,
		conversation: 65,
		multimodal: 0, // No vision
		research: 75,
	},
	strengths: [
		"Best-in-class code generation",
		"Excellent at understanding entire codebases",
		"Strong at complex refactoring",
		"Agentic capabilities for multi-file changes",
		"256K context for large projects",
	],
	weaknesses: [
		"No vision capability",
		"Overkill for simple coding tasks",
		"Not optimized for creative writing",
		"Same premium pricing as GPT-5.1",
	],
	bestFor: [
		"Complex software engineering tasks",
		"Large codebase refactoring",
		"Agentic coding workflows",
		"Debugging complex issues",
		"Architecture design and implementation",
	],
	avoidFor: [
		"Image analysis (no vision)",
		"Creative writing",
		"General conversation",
		"Simple code snippets (use cheaper model)",
	],
	qualityScore: 95,
	speedTier: "medium",
	costTier: "standard",
	notes:
		"Top choice for serious software engineering. Use for complex coding, fall back to GPT-OSS-120B for simpler code tasks.",
};
