# User Tier System

> **Status: 📝 TODO**

## Overview

Add a tiered user system to control access to expensive "pro" models. Free users have no access to pro models, Tier 1 users get 1 pro model message per day, Tier 2 users get 50 pro model messages per month. Admins always have unlimited access.

## Why Build This

| Problem | Solution |
|---------|----------|
| Expensive models (like Sonar Deep Research) cost $5+ per call | Gate access behind user tiers |
| Need to limit costly operations without blocking all users | Per-tier daily/monthly limits |
| Free users shouldn't access premium features | Tier-based feature gating |
| Want flexibility for future pricing tiers | Extensible tier system |

## Key Features

- **Pro Model Detection**: Models with $5+ input OR $15+ output pricing, or explicit `isPro` flag
- **User Tiers**: Free (no pro access), Tier 1 (1/day), Tier 2 (50/month), Admin (unlimited)
- **Admin Controls**: Enable/disable pro models globally, configure per-tier limits
- **Frontend Gating**: Pro models hidden or disabled based on user access
- **Upgrade Flow**: Modal prompts users to upgrade when hitting limits

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      User Request                           │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                  QuickModelSwitcher                         │
│  - Query proAccess from adminSettings                       │
│  - Filter pro models based on tier                          │
│  - Show badge + disabled state if at limit                  │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    chat.ts sendMessage                      │
│  - Check if model is pro (isPro || price threshold)         │
│  - Validate user tier allows pro access                     │
│  - Check daily/monthly limits based on tier                 │
│  - Increment usage counter if allowed                       │
│  - Throw error if limit exceeded                            │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    Admin Settings                           │
│  - proModelsEnabled: global toggle                          │
│  - tier1DailyProModelLimit: messages per day                │
│  - tier2MonthlyProModelLimit: messages per month            │
└─────────────────────────────────────────────────────────────┘
```

## Implementation Phases

| Phase | Description | Dependencies | Status |
|-------|-------------|--------------|--------|
| [Phase 1](./phase-1-schema-foundation.md) | Schema + model config changes | None | 📝 TODO |
| [Phase 2](./phase-2-backend-enforcement.md) | Backend limit enforcement | Phase 1 | 📝 TODO |
| [Phase 3](./phase-3-admin-ui.md) | Admin UI for settings + user tiers | Phase 1, 2 | 📝 TODO |
| [Phase 4](./phase-4-frontend-gating.md) | Frontend model filtering + badges | Phase 1, 2, 3 | 📝 TODO |

## Database Schema

### Users Table (additions)

```typescript
// Add to users table
tier: v.optional(v.union(v.literal("free"), v.literal("tier1"), v.literal("tier2"))),
dailyProModelCount: v.optional(v.number()),
lastProModelDate: v.optional(v.string()),
monthlyProModelCount: v.optional(v.number()),
lastProModelMonth: v.optional(v.string()),
```

### AdminSettings Table (additions)

```typescript
// Add to adminSettings table
proModelsEnabled: v.optional(v.boolean()),       // Default: false
tier1DailyProModelLimit: v.optional(v.number()), // Default: 1
tier2MonthlyProModelLimit: v.optional(v.number()), // Default: 50
```

## Tier Definitions

| Tier | Pro Model Access | Daily Limit | Monthly Limit | Notes |
|------|------------------|-------------|---------------|-------|
| Free | No | 0 | 0 | Cannot use pro models |
| Tier 1 | Yes | 1 | N/A | Resets daily at midnight |
| Tier 2 | Yes | Unlimited | 50 | Resets on 1st of month |
| Admin | Yes | Unlimited | Unlimited | Always exempt |

## Pro Model Detection

A model is considered "pro" if:
1. `isPro: true` is set explicitly in MODEL_CONFIG, OR
2. `pricing.input >= 5` (dollars per million tokens), OR
3. `pricing.output >= 15` (dollars per million tokens)

Initial pro models:
- `perplexity:sonar-deep-research` (explicit)
- Any model meeting price threshold

## File Structure

After all phases:

```
convex/
├── schema.ts                  # Updated with tier + pro tracking fields
├── adminSettings.ts           # Updated with pro model settings + getProModelAccess
├── admin.ts                   # Updated with updateUserTier mutation
└── chat.ts                    # Updated with pro model enforcement

src/
├── lib/ai/
│   └── models.ts              # Updated with isPro field
├── components/
│   ├── settings/admin/
│   │   └── FeaturesSettings.tsx  # Replaced with pro model controls
│   └── chat/
│       ├── QuickModelSwitcher.tsx # Updated with pro filtering
│       └── ModelSelectorItem.tsx  # Updated with pro badge
└── app/(main)/admin/users/
    └── page.tsx               # Updated with tier column
```

## Quick Start

```bash
# Start development
bun dev

# Test schema changes
bunx convex dev

# After Phase 1, verify schema deployed
# After Phase 2, test with free tier user - should get error
# After Phase 3, set user tier in admin UI
# After Phase 4, verify frontend shows/hides pro models
```

## Key Patterns Used

| Pattern | Source File | Used In |
|---------|-------------|---------|
| Daily limit enforcement | `presentations.ts:87-115` | Phase 2 |
| Admin settings component | `AdminLimitsSettings.tsx` | Phase 3 |
| Admin users table column | `admin/users/page.tsx` | Phase 3 |
| Model selector filtering | `QuickModelSwitcher.tsx` | Phase 4 |
| Badge component | `ModelSelectorItem.tsx` | Phase 4 |

## References

- [Lago - 6 Proven Pricing Models for AI SaaS](https://www.getlago.com/blog/6-proven-pricing-models-for-ai-saas)
- [Claude Docs - Rate Limits](https://docs.claude.com/en/api/rate-limits)
- [ConfigCat - Using Feature Flags with ML Models](https://configcat.com/blog/2024/04/23/using-feature-flags-with-ml-models/)
