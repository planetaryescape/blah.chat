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
