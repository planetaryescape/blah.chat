/**
 * Hard Rules Engine
 *
 * Deterministic rules that fire before embedding similarity.
 * Each rule returns a forced route label or null. First match wins.
 */

import type { ClassifierResult, RouteLabel } from "./types";

interface HardRuleInput {
  message: string;
  hasAttachments: boolean;
  attachmentTypes?: string[];
  currentContextTokens?: number;
}

interface HardRuleMatch {
  routeLabel: RouteLabel;
  confidence: number;
  rule: string;
}

type HardRule = (input: HardRuleInput) => HardRuleMatch | null;

const VISION_RULE: HardRule = ({ hasAttachments, attachmentTypes }) => {
  if (!hasAttachments) return null;
  const hasImage = attachmentTypes?.some((t) => t.startsWith("image/"));
  if (!hasImage) return null;
  return { routeLabel: "vision", confidence: 0.95, rule: "vision_attachment" };
};

const RESEARCH_KEYWORDS = [
  /\bsearch\s+for\b/i,
  /\bfind\s+me\b/i,
  /\blatest\s+news\b/i,
  /\bwhat\s+happened\s+today\b/i,
  /\bcurrent\s+events?\b/i,
  /\brecent\s+(?:news|developments?|updates?)\b/i,
  /\blook\s+up\b/i,
];

const RESEARCH_RULE: HardRule = ({ message }) => {
  const matches = RESEARCH_KEYWORDS.some((re) => re.test(message));
  if (!matches) return null;
  return { routeLabel: "research", confidence: 0.9, rule: "research_keywords" };
};

const LONG_CONTEXT_RULE: HardRule = ({ currentContextTokens }) => {
  if (!currentContextTokens || currentContextTokens <= 100_000) return null;
  return {
    routeLabel: "long_context",
    confidence: 0.95,
    rule: "long_context_tokens",
  };
};

const HIGH_STAKES_PATTERNS = [
  /\bshould\s+i\s+(?:take|stop\s+taking|increase|decrease)\b.*\b(?:medication|medicine|drug|pill|dose|dosage)\b/i,
  /\bam\s+i\s+having\s+a\b.*\b(?:heart\s+attack|stroke|seizure|allergic\s+reaction)\b/i,
  /\bcan\s+i\s+take\b.*\bwith\b.*\b(?:meds?|medication|blood\s+pressure|diabetes)\b/i,
  /\bshould\s+i\s+(?:sign|agree\s+to|accept)\b.*\b(?:contract|agreement|settlement|plea)\b/i,
  /\bshould\s+i\s+(?:invest|put\s+money|buy|sell)\b/i,
  /\b(?:i'?ve\s+been|i\s+am|i'?m)\s+(?:thinking\s+about|considering)\s+(?:ending\s+it|suicide|killing\s+myself)\b/i,
  /\b(?:someone\s+is|i'?m\s+being)\s+(?:stalking|threatening|harassing|abusing)\b/i,
  /\b(?:should\s+i\s+)?(?:leave|stay\s+with)\s+(?:my|this)\s+(?:abusive|violent)\b/i,
];

const HIGH_STAKES_RULE: HardRule = ({ message }) => {
  const matches = HIGH_STAKES_PATTERNS.some((re) => re.test(message));
  if (!matches) return null;
  return {
    routeLabel: "reasoning_complex",
    confidence: 0.95,
    rule: "high_stakes_pattern",
  };
};

const JSON_KEYWORDS = [
  /\breturn\s+(?:as\s+)?json\b/i,
  /\bextract\s+(?:the\s+)?(?:data|fields?|info)\b.*\b(?:json|structured)\b/i,
  /\bparse\s+(?:this\s+)?(?:to|into|as)\s+json\b/i,
  /\bstructured\s+output\b/i,
  /\bjson\s+schema\b/i,
  /\boutput\s+format:\s*json\b/i,
];

const JSON_RULE: HardRule = ({ message }) => {
  const matches = JSON_KEYWORDS.some((re) => re.test(message));
  if (!matches) return null;
  return { routeLabel: "strict_json", confidence: 0.85, rule: "json_keywords" };
};

const CODE_FENCE_RE = /^```[\s\S]*```/m;
const CODE_INDICATORS =
  /(?:function\s|const\s|let\s|var\s|import\s|class\s|def\s|return\s|if\s*\(|for\s*\(|while\s*\()/g;

const CODE_RULE: HardRule = ({ message }) => {
  if (CODE_FENCE_RE.test(message)) {
    return { routeLabel: "code_heavy", confidence: 0.8, rule: "code_fence" };
  }
  const codeMatches = message.match(CODE_INDICATORS);
  if (codeMatches && codeMatches.length / message.split(/\s+/).length > 0.15) {
    return {
      routeLabel: "code_heavy",
      confidence: 0.8,
      rule: "code_density",
    };
  }
  return null;
};

const HARD_RULES: HardRule[] = [
  VISION_RULE,
  RESEARCH_RULE,
  LONG_CONTEXT_RULE,
  HIGH_STAKES_RULE,
  JSON_RULE,
  CODE_RULE,
];

export function runHardRules(input: HardRuleInput): ClassifierResult | null {
  for (const rule of HARD_RULES) {
    const match = rule(input);
    if (match) {
      return {
        routeLabel: match.routeLabel,
        confidence: match.confidence,
        needsFallback: false,
        hardRuleMatched: match.rule,
      };
    }
  }
  return null;
}
