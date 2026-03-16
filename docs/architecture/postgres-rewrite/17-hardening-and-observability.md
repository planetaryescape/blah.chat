# Phase 17: Hardening And Observability

## Goal

Measure, stress, and harden the new runtime until performance and failure modes are well understood.

## Program Context

The new architecture solves real issues, but it only counts if it is measurably better and operationally understandable in production.

## Why This Phase Is Last

You cannot harden a moving target. This phase assumes the whole system is already running on the new stack.

## Prerequisites

- phases 1 through 16 complete

## Deliverables

- dashboards
- alerts
- performance baselines
- failure-injection playbook
- manual runbooks

## Metrics To Track

- TTFT
- visible tokens per second
- stream fanout latency
- stop latency
- resume success rate
- checkpoint latency
- Redis stream health
- provider failure rate
- router success, latency, and cost
- Trigger job failure and retry rates

## Tests To Run

- refresh during generation
- reconnect during generation
- stop under load
- comparison under load
- mobile background and foreground transitions
- attachment-heavy chats
- provider failure and retry behavior

## Operational Outputs

- alert thresholds
- on-call or operator notes
- cost reporting
- router evaluation reports

## Risks

- declaring success from anecdotal feel only
- not testing reconnect and failure paths
- missing router regressions after shipping

## Done Criteria

- the new stack is observably faster than the old one
- failure modes are documented
- alerts exist for the critical paths
- the team can operate the system confidently

## What Comes After

This phase ends the rewrite program. Future work should be feature work or targeted improvements on the new stack, not migration work.

