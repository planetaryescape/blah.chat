# Phase 10: Router V2

Status: not started as of March 16, 2026.

## Goal

Rebuild the LLM router as an outcome-driven policy system, not just a prompt classifier mapped to model bins.

## Program Context

The app already has an auto-router, but the rewrite is a chance to rebuild it around the lessons from the field: optimize for real outcomes, use richer runtime signals, preserve stickiness when a model is working, and learn from exploration plus feedback.

## Why This Phase Comes Here

The router should be built after the new single-model, comparison, and resume flows exist. Those flows produce the runtime data the router needs:

- latency
- reliability
- stop rate
- retry rate
- comparison winners
- tool success

## Prerequisites

- phases 1 through 9 complete

## Deliverables

- router policy engine
- routing decision logging
- routing outcome logging
- exploration policy
- sticky routing behavior
- comparison-derived feedback ingestion

## Router Objective

Optimize:

- success rate
- latency
- reliability
- cost

Do not optimize only for unit price.

## Router Model

Stage 1: hard constraints and safety gates

- vision
- long context
- JSON or tool requirements
- high-stakes domains
- excluded models or providers

Stage 2: candidate scoring

- recent latency
- recent failure rate
- recent tool success
- price
- user cost and speed bias
- previous model success and stickiness
- provider health

## Inputs

- current message
- recent turns
- branch context
- attachment types
- context size
- comparison mode
- user preferences
- previous model
- recent runtime health

## Outputs To Log

- chosen model
- candidate scores
- latency and TTFT
- completion vs stop vs error
- regenerate or retry
- comparison vote outcome
- follow-up dissatisfaction proxies

## Exploration

- low-rate safe exploration
- never outside hard constraints
- optionally shadow-route for offline evaluation

## Risks

- rebuilding the old classify-then-map design with nicer names
- optimizing for cost while ignoring failure and latency
- skipping structured outcome logging

## Verification

- route decisions are reproducible and explainable
- outcome records exist for each routed request
- comparison winners feed router feedback

## Done Criteria

- router v2 is driven by runtime outcomes
- comparison mode improves routing data quality

## What Comes Next

With routing rebuilt, phase 11 can migrate search, embeddings, and memories onto Postgres and Trigger.
