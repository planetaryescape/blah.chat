# User Tier System

## Overview

The tier system controls access to expensive "pro" AI models. It prevents runaway costs from models like Sonar Deep Research ($5+ input, $15+ output) while enabling future monetization.

**Tier Structure:**
| Tier | Pro Access | Limit |
|------|------------|-------|
| Free | No | - |
| Tier 1 | Yes | 1/day |
| Tier 2 | Yes | 50/month |
| Admin | Yes | Unlimited |

## Why We Built This

1. **Cost control**: Some models cost 10-50x more than standard models
2. **Monetization path**: Tier structure enables future paid plans
3. **Flexibility**: Admin-configurable limits without code deploys
4. **Upselling**: Showing disabled pro models encourages upgrades

## Architecture Decisions

### Dual Enforcement (Backend + Frontend)

We enforce limits in **both** backend and frontend:

- **Backend (authoritative)**: `chat.ts` checks limits before sending messages. This prevents API bypass.
- **Frontend (UX)**: `QuickModelSwitcher` shows disabled state and "Upgrade" prompts. This provides good UX without security risk.

Never rely on frontend-only gating for cost-sensitive operations.

### Pro Model Detection

A model is "pro" if ANY of these are true:
```typescript
model.isPro === true ||
model.pricing.input >= 5 ||
model.pricing.output >= 15
```

We use price thresholds as automatic detection so new expensive models are gated without code changes. The `isPro` flag allows explicit marking regardless of price.

### Counter Reset Strategy

- **Daily (Tier 1)**: Uses `lastProModelDate` (YYYY-MM-DD format). Resets when date changes.
- **Monthly (Tier 2)**: Uses `lastProModelMonth` (YYYY-MM format). Resets on 1st of month.

Counters are stored on the user document, not in a separate table. This keeps enforcement atomic (check + increment in same mutation).

### Upgrade Request Flow

Since payments aren't integrated yet, clicking disabled pro models opens an upgrade request dialog. This creates a feedback item (type: "feature") that admins see. When payments are added, replace this dialog with a Stripe checkout flow.

## Key Files

| File | Purpose |
|------|---------|
| `convex/schema.ts` | User tier field + pro model tracking counters |
| `convex/adminSettings.ts` | `getProModelAccess` query, pro model settings |
| `convex/chat.ts` | Backend enforcement in `sendMessage` |
| `convex/admin.ts` | `updateUserTier` mutation |
| `src/components/chat/QuickModelSwitcher.tsx` | Frontend filtering + upgrade dialog |
| `src/components/chat/ModelSelectorItem.tsx` | Pro badge + disabled styling |
| `src/components/chat/UpgradeRequestDialog.tsx` | Upgrade request modal |
| `src/components/settings/admin/FeaturesSettings.tsx` | Admin pro model controls |
| `src/app/(main)/admin/users/page.tsx` | Admin user tier management |

## Modifying Tier Limits

Admins configure limits via Admin > Settings > Features:
- `proModelsEnabled`: Global kill switch
- `tier1DailyProModelLimit`: Messages/day for Tier 1
- `tier2MonthlyProModelLimit`: Messages/month for Tier 2

Setting a limit to 0 means unlimited (follows existing pattern from presentation limits).

## Adding a New Tier

1. Add tier literal to schema: `v.literal("tier3")`
2. Add limit field to `adminSettings` schema
3. Add enforcement case in `chat.ts`
4. Add case in `getProModelAccess` query
5. Add to admin UI dropdowns and FeaturesSettings
6. Add tracking fields to users if using different reset period

## Adding New Pro Models

1. **Explicit**: Set `isPro: true` in MODEL_CONFIG
2. **Automatic**: Any model with input >= $5 or output >= $15 is auto-gated

## Pattern References

The implementation follows existing codebase patterns:

- **Daily limit pattern**: See `presentations.ts:87-115` for the exact counter reset logic
- **Admin settings pattern**: See `AdminLimitsSettings.tsx` for query → local state → useEffect sync → handleSave
- **Column pattern**: See admin users table admin column for interactive table cells with `onClick` stopPropagation

## Future Enhancements

- **Stripe integration**: Replace upgrade request dialog with checkout
- **Per-user overrides**: Allow setting custom limits per user
- **Usage analytics**: Dashboard showing pro model usage by tier
- **Tier expiration**: Time-limited tier upgrades
