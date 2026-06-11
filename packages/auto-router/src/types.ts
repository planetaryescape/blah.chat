/**
 * Classifier-based Router Types
 *
 * Types for the new classifier routing system that replaces
 * the legacy scoring-based approach.
 */

import type { RouterResult } from "./profiles";

// ============================================================================
// Route Labels
// ============================================================================

export const ROUTE_LABELS = [
  "fast_cheap_chat",
  "balanced_general",
  "code_heavy",
  "long_context",
  "strict_json",
  "creative_writing",
  "research",
  "vision",
  "reasoning_complex",
  "fallback_default",
] as const;

export type RouteLabel = (typeof ROUTE_LABELS)[number];

// ============================================================================
// Model Bin
// ============================================================================

export interface ModelBin {
  label: RouteLabel;
  description: string;
  primary: string[];
  fallbacks: string[];
  constraints?: {
    requiresVision?: boolean;
    requiresLongContext?: boolean;
    requiresReasoning?: boolean;
    minContextWindow?: number;
  };
}

// ============================================================================
// Classifier Result
// ============================================================================

export interface ClassifierResult {
  routeLabel: RouteLabel;
  confidence: number;
  needsFallback: boolean;
  candidateLabels?: RouteLabel[];
  hardRuleMatched?: string;
  topSimilarityScore?: number;
  secondRouteLabel?: RouteLabel;
  secondSimilarityScore?: number;
  /** True when the simplified LLM tiebreak resolved an ambiguous classification. */
  usedFallbackLlm?: boolean;
}

// ============================================================================
// Decision Trace
// ============================================================================

export interface DecisionTrace {
  routerMode: string;
  hardRuleMatched?: string;
  topSimilarityScore?: number;
  topRouteLabel?: string;
  secondRouteLabel?: string;
  secondSimilarityScore?: number;
  usedFallbackLlm?: boolean;
  embeddingLatencyMs?: number;
  totalLatencyMs?: number;
  candidateModels?: string[];
}

// ============================================================================
// Extended Router Result (backward-compatible with RouterResult)
// ============================================================================

export interface ClassifierRouterResult extends RouterResult {
  routeLabel?: RouteLabel;
  classifierVersion?: "legacy" | "classifier_v1";
  trace?: DecisionTrace;
}

// ============================================================================
// Routing Example (for seed data + runtime additions)
// ============================================================================

export interface RoutingExample {
  text: string;
  routeLabel: RouteLabel;
  complexity?: "simple" | "moderate" | "complex";
  embedding?: number[];
}

// ============================================================================
// Router Mode (feature flag)
// ============================================================================

export const ROUTER_MODES = [
  "legacy_scoring",
  "classifier_v1",
  "shadow_compare",
] as const;

export type RouterMode = (typeof ROUTER_MODES)[number];

// ============================================================================
// Classifier Config
// ============================================================================

export interface ClassifierConfig {
  confidenceThreshold: number;
  marginThreshold: number;
  topK: number;
  fallbackEnabled: boolean;
}

export const DEFAULT_CLASSIFIER_CONFIG: ClassifierConfig = {
  confidenceThreshold: 0.82,
  marginThreshold: 0.05,
  topK: 5,
  fallbackEnabled: true,
};

// ============================================================================
// Policy Engine Types
// ============================================================================

export interface PolicyWeights {
  binRank: number;
  successRate: number;
  errorRate: number;
  cancelRate: number;
  latencySeconds: number;
  ttftSeconds: number;
  costScore: number;
  speedScore: number;
  stickyBonus: number;
  degradedPenalty: number;
  downPenalty: number;
  comparisonWinRate: number;
  explorationRate: number;
}

export const DEFAULT_POLICY_WEIGHTS: PolicyWeights = {
  binRank: 0.4,
  successRate: 2,
  errorRate: 1.5,
  cancelRate: 0.75,
  latencySeconds: 0.15,
  ttftSeconds: 0.15,
  costScore: 1,
  speedScore: 0.5,
  stickyBonus: 1.25,
  degradedPenalty: 1.5,
  downPenalty: 4,
  comparisonWinRate: 1.0,
  explorationRate: 0.05,
};

export interface OutcomeStats {
  total: number;
  complete: number;
  error: number;
  cancelled: number;
  latencyTotal: number;
  latencyCount: number;
  ttftTotal: number;
  ttftCount: number;
  costTotal: number;
  costCount: number;
}

export type ProviderHealthStatus = "healthy" | "degraded" | "down" | "unknown";

export interface ProviderHealth {
  status: ProviderHealthStatus;
}

export interface ComparisonStats {
  wins: number;
  losses: number;
  ties: number;
  total: number;
}

export interface CandidateInput {
  modelId: string;
  binIndex: number;
  pricing: { input: number; output: number };
  hostOrder?: string[];
  outcomeStats?: OutcomeStats;
  health?: ProviderHealth;
  comparisonStats?: ComparisonStats;
  toolSuccessRate?: number;
}

export interface ScoringContext {
  routeLabel: RouteLabel;
  weights: PolicyWeights;
  costBias: number;
  speedBias: number;
  previousModelId?: string;
  previousRouteLabel?: string;
  totalCandidates: number;
  maxAverageCost: number;
}

export interface ScoreComponent {
  name: string;
  rawValue: number;
  weight: number;
  contribution: number;
}

export interface ScoreExplanation {
  components: ScoreComponent[];
  totalScore: number;
}

export interface CandidateFeatures {
  routeLabel: RouteLabel;
  binIndex: number;
  successRate: number;
  errorRate: number;
  cancelRate: number;
  avgLatencySeconds: number;
  avgTtftSeconds: number;
  costScore: number;
  speedScore: number;
  isSticky: boolean;
  stickyBonus: number;
  healthStatus: string;
  comparisonWinRate: number;
}

export interface ScoredCandidate {
  modelId: string;
  provider: string;
  score: number;
  rank: number;
  features: CandidateFeatures;
  explanation: ScoreExplanation;
}

export interface PolicyEngineResult {
  rankedCandidates: ScoredCandidate[];
  selectedModelId: string;
  isExploration: boolean;
  explanation: string;
  shadowModelId?: string;
}
