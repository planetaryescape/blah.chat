/**
 * Router Factory
 *
 * Primary public API for external consumers. Creates a configured Router
 * instance with bound models, bins, examples, and embedding provider.
 */

import { type BinSelectionInput, selectFromBin } from "./bin-selector";
import { classify as classifyFn } from "./classifier";
import type { EmbeddingProvider } from "./embedding";
import type {
  ModelConfigForRouter,
  ModelProfile,
  RouterPreferences,
} from "./profiles";
import {
  createRegistry,
  type ModelRegistry,
  validateRegistry,
} from "./registry";
import type {
  ClassifierConfig,
  ClassifierResult,
  ClassifierRouterResult,
  ModelBin,
  RouteLabel,
  RoutingExample,
} from "./types";
import { DEFAULT_CLASSIFIER_CONFIG } from "./types";

/**
 * Stage 3 LLM tiebreak hook. Called only when the embedding classifier is
 * ambiguous (needsFallback). Receives the message and the classifier's top
 * candidate labels; returns the picked label text (validated by the router)
 * or null to keep the classifier's best guess. Injected like the embedding
 * provider so the package stays I/O-free.
 */
export type LlmFallbackFn = (input: {
  message: string;
  candidateLabels: RouteLabel[];
}) => Promise<string | null>;

export interface RouterConfig {
  models?: Record<string, ModelConfigForRouter>;
  profiles?: Record<string, ModelProfile>;
  bins?: Record<string, ModelBin>;
  examples?: RoutingExample[];
  embeddingProvider?: EmbeddingProvider;
  classifierConfig?: Partial<ClassifierConfig>;
  defaultPreferences?: RouterPreferences;
  fallbackModelId?: string;
  llmFallback?: LlmFallbackFn;
  onWarning?: (msg: string) => void;
}

export interface RouteInput {
  message: string;
  hasAttachments?: boolean;
  attachmentTypes?: string[];
  currentContextTokens?: number;
  preferences?: RouterPreferences;
  previousModelId?: string;
  previousRouteLabel?: RouteLabel;
  excludedModels?: string[];
  requiresVision?: boolean;
}

export interface ClassifyInput {
  message: string;
  hasAttachments?: boolean;
  attachmentTypes?: string[];
  currentContextTokens?: number;
  /**
   * Per-call classifier config override. Merged on top of the router's
   * constructor-time config. Useful for runtime-tunable admin settings.
   */
  classifierConfig?: Partial<ClassifierConfig>;
}

export interface SelectModelInput {
  routeLabel: RouteLabel;
  preferences?: RouterPreferences;
  previousModelId?: string;
  previousRouteLabel?: RouteLabel;
  excludedModels?: string[];
  currentContextTokens?: number;
  requiresVision?: boolean;
}

export interface SelectModelResult {
  modelId: string;
  candidatesConsidered: number;
  isSticky: boolean;
  candidateModels: string[];
}

export interface Router {
  /** Full pipeline: classify + select model. Requires embeddingProvider. */
  route(input: RouteInput): Promise<ClassifierRouterResult>;
  /** Classify only (hard rules + embedding similarity). Requires embeddingProvider. */
  classify(input: ClassifyInput): Promise<ClassifierResult>;
  /** Select model from a known route label (no embedding needed). */
  selectModel(input: SelectModelInput): SelectModelResult;
  /** The resolved registry. */
  readonly registry: ModelRegistry;
}

export function createRouter(config?: RouterConfig): Router {
  const registry = createRegistry({
    models: config?.models,
    profiles: config?.profiles,
    bins: config?.bins,
  });

  const { registry: validatedRegistry, warnings } = validateRegistry(registry);

  const warn = config?.onWarning ?? (() => {});
  for (const w of warnings) {
    warn(w.message);
  }

  const classifierConfig: ClassifierConfig = {
    ...DEFAULT_CLASSIFIER_CONFIG,
    ...config?.classifierConfig,
  };

  const defaultPreferences: RouterPreferences = config?.defaultPreferences ?? {
    costBias: 50,
    speedBias: 50,
  };

  const userExamples = config?.examples ?? [];
  let embeddedExamples: (RoutingExample & { embedding: number[] })[] | null =
    null;

  async function ensureEmbeddedExamples(): Promise<
    (RoutingExample & { embedding: number[] })[]
  > {
    if (embeddedExamples) return embeddedExamples;

    if (!config?.embeddingProvider) {
      throw new Error(
        "embeddingProvider is required for classify() and route(). " +
          "Use selectModel() for deterministic routing without embeddings.",
      );
    }

    const examplesNeedingEmbedding = userExamples.filter((e) => !e.embedding);
    const examplesWithEmbedding = userExamples.filter(
      (e): e is RoutingExample & { embedding: number[] } => !!e.embedding,
    );

    if (examplesNeedingEmbedding.length > 0) {
      const texts = examplesNeedingEmbedding.map((e) => e.text);
      const embeddings = await config.embeddingProvider.embedBatch(texts);

      for (let i = 0; i < examplesNeedingEmbedding.length; i++) {
        examplesWithEmbedding.push({
          ...examplesNeedingEmbedding[i],
          embedding: embeddings[i],
        });
      }
    }

    embeddedExamples = examplesWithEmbedding;
    return embeddedExamples;
  }

  /**
   * Stage 3: simplified LLM tiebreak. Only fires on ambiguous classifications
   * (needsFallback). Best-effort: any error, timeout, or unrecognized label
   * keeps the classifier's top label.
   */
  async function resolveWithLlmFallback(
    message: string,
    result: ClassifierResult,
  ): Promise<ClassifierResult> {
    const llmFallback = config?.llmFallback;
    if (
      !result.needsFallback ||
      !llmFallback ||
      !result.candidateLabels ||
      result.candidateLabels.length === 0
    ) {
      return result;
    }

    let picked: string | null = null;
    try {
      picked = await llmFallback({
        message,
        candidateLabels: result.candidateLabels,
      });
    } catch (error) {
      warn(
        `LLM fallback tiebreak failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      return result;
    }

    const normalized = picked?.trim().toLowerCase() ?? "";
    const matched = result.candidateLabels.find(
      (label) => label.toLowerCase() === normalized,
    );
    if (!matched) {
      return result;
    }

    return {
      ...result,
      routeLabel: matched,
      needsFallback: false,
      usedFallbackLlm: true,
    };
  }

  function doSelectModel(input: SelectModelInput): SelectModelResult {
    const binInput: BinSelectionInput = {
      routeLabel: input.routeLabel,
      preferences: input.preferences ?? defaultPreferences,
      previousModelId: input.previousModelId,
      previousRouteLabel: input.previousRouteLabel,
      excludedModels: input.excludedModels,
      currentContextTokens: input.currentContextTokens,
      requiresVision: input.requiresVision,
      registry: validatedRegistry,
      fallbackModelId: config?.fallbackModelId,
    };
    return selectFromBin(binInput);
  }

  return {
    async route(input: RouteInput): Promise<ClassifierRouterResult> {
      const classification = await this.classify(input);
      const selection = doSelectModel({
        routeLabel: classification.routeLabel,
        preferences: input.preferences ?? defaultPreferences,
        previousModelId: input.previousModelId,
        previousRouteLabel: input.previousRouteLabel,
        excludedModels: input.excludedModels,
        currentContextTokens: input.currentContextTokens,
        requiresVision: input.requiresVision,
      });

      return {
        selectedModelId: selection.modelId,
        classification: {
          primaryCategory: "conversation",
          complexity: "moderate",
          requiresVision: input.hasAttachments ?? false,
          requiresLongContext: false,
          requiresReasoning: false,
          confidence: classification.confidence,
          isHighStakes: false,
          recommendedAction: "change",
        },
        reasoning: `Classified as ${classification.routeLabel} (confidence: ${classification.confidence.toFixed(2)})`,
        candidatesConsidered: selection.candidatesConsidered,
        isSticky: selection.isSticky,
        routeLabel: classification.routeLabel,
        classifierVersion: "classifier_v1",
        trace: {
          routerMode: "classifier_v1",
          hardRuleMatched: classification.hardRuleMatched,
          topSimilarityScore: classification.topSimilarityScore,
          topRouteLabel: classification.routeLabel,
          secondRouteLabel: classification.secondRouteLabel,
          secondSimilarityScore: classification.secondSimilarityScore,
          usedFallbackLlm: classification.usedFallbackLlm ?? false,
          candidateModels: selection.candidateModels,
        },
      };
    },

    async classify(input: ClassifyInput): Promise<ClassifierResult> {
      const examples = await ensureEmbeddedExamples();

      if (!config?.embeddingProvider) {
        throw new Error(
          "embeddingProvider is required for classify(). " +
            "Use selectModel() for deterministic routing without embeddings.",
        );
      }

      const [messageEmbedding] = await config.embeddingProvider.embedBatch([
        input.message,
      ]);

      const effectiveConfig: ClassifierConfig = input.classifierConfig
        ? { ...classifierConfig, ...input.classifierConfig }
        : classifierConfig;

      const result = classifyFn({
        message: input.message,
        messageEmbedding,
        examples,
        hasAttachments: input.hasAttachments,
        attachmentTypes: input.attachmentTypes,
        currentContextTokens: input.currentContextTokens,
        config: effectiveConfig,
      });

      return resolveWithLlmFallback(input.message, result);
    },

    selectModel: doSelectModel,

    get registry() {
      return validatedRegistry;
    },
  };
}
