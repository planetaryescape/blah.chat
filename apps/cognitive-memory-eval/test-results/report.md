# Cognitive Memory Eval Report

Generated: 2026-02-12T07:40:59.680Z
Run ID: manual/unknown

## Summary

- sample: personas=1, questions=140, paired-evals=0
- basic overall: 0.00
- cognitive overall: 0.00
- uplift: 0.0%
- primary test: persona-level paired t-test
- persona-level p: NaN
- question-level p (secondary): NaN
- persona mean diff: 0.000 (t=NaN, dz=0.00, bootstrap95 0.000..0.000)
- practical effect: negligible
- estimated cost: $5.0528 (10069 model calls)

## Why Persona-Level Is Primary
- Many questions from the same persona are correlated.
- Question-level p-values can look too strong when persona count is low.
- Persona-level means estimate between-person generalization more honestly.

## Signal Quality

- [ ] Sample adequacy: paired-evals >= 1000
- [ ] Persona diversity: personas >= 20
- [ ] Significance robustness: persona-level and question-level p < 0.05

## Success Criteria

- [ ] Primary: cognitive overall > basic by >= 10% and persona-level p < 0.05
- [ ] Medium: cognitive > basic by >= 15%
- [ ] Hard: cognitive > basic by >= 30%
- [ ] Decay resilience: session1 within 15% of session4 (cognitive)

## Breakdown

### By Difficulty (overall)

- basic: easy 0.00, medium 0.00, hard 0.00
- cognitive: easy 0.00, medium 0.00, hard 0.00

### By Type (overall)

- basic: factual 0.00, temporal 0.00, preference 0.00, inference 0.00
- cognitive: factual 0.00, temporal 0.00, preference 0.00, inference 0.00

### By Session (overall)
- basic: s1 0.00, s2 0.00, s3 0.00, s4 0.00
- cognitive: s1 0.00, s2 0.00, s3 0.00, s4 0.00

## Data You Can Inspect

- questions.json (the generated test cases)
- generation-quality.json (quota/evidence/span validation summary)
- results-detailed.json (per-question answers + judgments + deltas)
- judge-rubric.md (scoring rubric)
- answers.jsonl / judgments.jsonl (raw run outputs)
- cost-summary.json / costs.jsonl (run cost telemetry)

## Visualizations
- visualizations/index.html
- visualizations/overall-scores.html
- visualizations/by-difficulty.html
- visualizations/by-type.html
- visualizations/decay-curve.html
- visualizations/retrieval-heatmap.html
- visualizations/results-table.html

## Config

```json
{
  "models": {
    "personaGen": "google:gemini-3-flash",
    "conversationGen": "google:gemini-3-flash",
    "questionGen": "google:gemini-3-flash",
    "answerGen": "google:gemini-3-flash",
    "judge": "google:gemini-3-flash"
  },
  "sizes": {
    "personas": 24,
    "sessionsPerPersona": 4,
    "questionsPerPersona": 140,
    "messagesPerSessionMin": 8,
    "messagesPerSessionMax": 12
  },
  "concurrency": {
    "genPersonas": 16,
    "genConversations": 8,
    "genQuestions": 16,
    "seedingPersonas": 16,
    "answers": 10,
    "judge": 10
  },
  "retrieval": {
    "limit": 5,
    "includeAssociations": true
  },
  "seed": "cogmem-eval-v2"
}
```
