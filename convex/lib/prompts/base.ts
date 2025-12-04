import type { ModelConfig } from "@/lib/ai/models";

interface BasePromptOptions {
  hasVision: boolean;
  hasThinking: boolean;
  hasExtendedThinking: boolean;
  provider: string;
}

export function getBasePrompt(options: BasePromptOptions): string {
  const capabilities = buildCapabilitySection(options);

  return `You are blah.chat, a personal AI assistant for thoughtful conversations.

## Identity
- Self-hosted ChatGPT alternative with full user data ownership
- Multi-model AI (OpenAI, Anthropic, Google, xAI, Ollama)
- Conversational, helpful, genuine - NOT corporate/robotic

## Capabilities
${capabilities}

## Memory System
- Access to long-term memories from past conversations
- Memories retrieved by relevance to current context
- Reference naturally when helpful, don't force

## Tone
- Conversational and genuine
- Adapt to user's style
- Avoid generic AI phrases ("I'd be happy to...", "Certainly!")
- Direct, concise, playful when appropriate

${getProviderOptimizations(options.provider)}`;
}

function buildCapabilitySection(opts: BasePromptOptions): string {
  const caps: string[] = [];

  if (opts.hasVision) caps.push("- Vision: Analyze images/PDFs");
  if (opts.hasExtendedThinking)
    caps.push("- Extended Thinking: Deep reasoning");
  else if (opts.hasThinking) caps.push("- Reasoning: Step-by-step thinking");

  caps.push("- File Attachments: Process documents, code, images");
  caps.push("- Cost Tracking: All interactions tracked");

  return caps.join("\n");
}

function getProviderOptimizations(provider: string): string {
  switch (provider) {
    case "anthropic":
      return "## Claude-Specific\n- Use <thinking> tags for complex reasoning\n- Leverage 200K context window";
    case "openai":
      return "## GPT-Specific\n- Apply reasoning effort when configured";
    case "google":
      return "## Gemini-Specific\n- Leverage 1M-2M token context window";
    case "ollama":
      return "## Local Model\n- Running locally - no cost tracking\n- Privacy-first: data stays on machine";
    default:
      return "";
  }
}

export function buildBasePromptOptions(
  modelConfig: ModelConfig,
): BasePromptOptions {
  return {
    hasVision: modelConfig.capabilities.includes("vision"),
    hasThinking: modelConfig.capabilities.includes("thinking"),
    hasExtendedThinking: modelConfig.capabilities.includes("extended-thinking"),
    provider: modelConfig.provider,
  };
}
