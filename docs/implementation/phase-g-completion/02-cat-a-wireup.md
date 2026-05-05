# 02 — Cat A: Wire-up Sweep

Pure repointing. The route exists; the page is calling the wrong URL or stubbing data. Each item: drop the `TODO`, fix the URL/handler.

**Estimated effort:** ~1.5 hr total. Single PR.

**Acceptance:** every TODO listed here is gone; e2e for the surface passes.

---

## A1 — `cli-login` page → `/api/v1/cli/api-keys`

**File:** `apps/web/src/app/cli-login/CLILoginPageClient.tsx:22-28`

**Change:**
```ts
// before
const res = await fetch("/api/v1/cli/auth", { method: "POST" });
const json = await res.json();
return json.data;

// after
const res = await fetch("/api/v1/cli/api-keys", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ name: "CLI Login" }),
});
if (!res.ok) throw new Error("Failed to create API key");
const json = await res.json();
return json.data;       // { key, keyPrefix, email, name }
```

**Why it works:** `apps/web/src/lib/persistence/cliApiKeys.ts:60-79` `createCliApiKey()` returns `{ key, keyPrefix, email, name }`. DAL wraps in `formatEntity` → `json.data` is exactly that shape.

**Test:** add `apps/web/src/app/cli-login/__tests__/CLILoginPageClient.test.tsx` mocking the route, asserting that on Clerk-signed-in render, fetch is called and `window.location.href` is set with fragment containing `api_key`, `key_prefix`, `email`, `name`.

---

## A2 — `ShareDialog` toggle/extend → `PATCH /api/v1/shares/[id]`

**File:** `apps/web/src/components/chat/ShareDialog.tsx:46-82`

**Existing route:** `apps/web/src/app/api/v1/shares/[id]/route.ts` `PATCH` accepts `{ isActive }` or `{ expiresAt }`.

**Change:**
```ts
// existingShare query — already correct (GET /api/v1/shares?conversationId=)

// createShare — already correct (POST /api/v1/shares)

// toggleShare
const toggleShare = async (args: { shareId: string; isActive: boolean }) => {
  await fetch(`/api/v1/shares/${args.shareId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ isActive: args.isActive }),
  });
};

// extendExpiration
const extendExpiration = async (args: { shareId: string; expiresAt: number }) => {
  await fetch(`/api/v1/shares/${args.shareId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ expiresAt: args.expiresAt }),
  });
};
```

Drop all four `// TODO: Phase G` comments.

**Test:** integration test in `apps/web/src/app/api/v1/__tests__/shares.test.ts`. Verify create → toggle off → toggle on → extend → re-fetch yields expected state.

---

## A3 — `share/[shareId]/SharePageClient` → existing `useCurrentUser` + share fetch

**File:** `apps/web/src/app/share/[shareId]/SharePageClient.tsx:72,176,189,200`

Each TODO is a stub returning placeholder data. Replace with:

- Line 72: replace placeholder user fetch with `import { useCurrentUser } from "@/hooks/useCurrentUser"` and use the hook directly.
- Lines 176, 189, 200: each is an action stub (e.g. clone-into-account, fork-conversation). Verify which routes are needed; most map to:
  - Clone share → `POST /api/v1/conversations/[id]/clone-from-share` *(verify exists; if not → Cat B)*
  - Star/bookmark on share → existing `/api/v1/bookmarks` POST
  - Vote on share → existing `/api/v1/comparisons/[id]/vote`

**Investigation step before PR 1:** open the file, list each stub's intent. If a route exists, wire up; if not, move to Cat B. Don't expand scope of Cat A.

---

## A4 — `AutoRouterPreferenceModal` → `PATCH /api/v1/preferences`

**File:** `apps/web/src/components/onboarding/AutoRouterPreferenceModal.tsx:32-41`

Code already calls `/api/v1/preferences` correctly. Drop the two `TODO: Phase G` comments. Verify `userPreferences` table has the relevant fields (`useAutoRouter`, `autoRouterStrategy`).

If preference fields don't exist on `userPreferences` yet → schema ALTER and add to `preferencesDAL`. Likely already there per recent admin/byod work.

---

## A5 — `MeetingReviewPanel` → `/api/v1/projects`

**File:** `apps/web/src/components/assistant/MeetingReviewPanel.tsx:85-89`

Code already calls `/api/v1/projects`. Drop `// TODO: Phase G` comment.

---

## A6 — `SmartAssistantPageClient` `/tasks` and `/notes` already correct

**File:** `apps/web/src/app/(main)/assistant/SmartAssistantPageClient.tsx:70,81`

Both `/api/v1/tasks` and `/api/v1/notes` exist. Drop the `// TODO: Phase G` comments. Tests already cover.

`/api/v1/actions/extract-meeting` (line 60) is **Cat B** — see [03-cat-b-routes.md](./03-cat-b-routes.md) §B6.

---

## A7 — Bible verse cache TODO

**File:** `apps/web/src/app/api/v1/bible/verse/route.ts:6`

The TODO references "migrate to Postgres or Redis cache." This is a **caching concern, not a wiring concern**. The route already works. Decision per user directive ("don't cut features"):

- Keep the comment as a perf-followup `// PERF:` instead of `// TODO: Phase 15` — moves it out of Phase G scope.
- Open separate issue for caching tier (Redis vs in-memory LRU vs Postgres).

Result: zero behavior change; one TODO removed from the count.

---

## A8 — `QuickModelSwitcher` pro access

**File:** `apps/web/src/components/chat/QuickModelSwitcher.tsx:75`

```ts
// before
const proAccess = currentUser
  ? { canUse: true, tier: "free" as string, remainingDaily: null as number | null }
  : null;

// after
const proAccess = currentUser
  ? {
      canUse: currentUser.tier !== "free" || isFreeTierAllowedModel(modelId, currentUser),
      tier: currentUser.tier,
      remainingDaily: currentUser.tier === "free" ? FREE_DAILY_LIMIT - (currentUser.dailyMessageCount ?? 0) : null,
    }
  : null;
```

Where:
- `isFreeTierAllowedModel(modelId, user)` lives in `apps/web/src/lib/ai/tier.ts` (extract from existing logic if scattered, or new).
- `FREE_DAILY_LIMIT` from `adminSettings.value.defaultDailyMessageLimit` once that's wired (PR 3). Until then, hardcode 50 with a `// TODO(phase-g-admin-settings)` linking to PR 3.

**Note:** `currentUser.dailyMessageCount` may not yet be on `useCurrentUser` payload. If not, add via `usageRecords` aggregate in `users` DAL. Track as Cat B sub-item.

---

## A9 — `OnboardingTour` initial wire

**File:** `apps/web/src/components/onboarding/OnboardingTour.tsx:160-167`

This depends on `userOnboarding` table (Cat C). **Skip in Cat A — handled in PR 5 wiring after PR 3 ships the table.**

---

## A10 — Drop legacy `Phase G` markers from Cat C surfaces (will move into PR 5)

Canvas, NotificationBell, OnboardingTour, admin settings sub-components — all touched in PR 5. They appear in the Cat A inventory only because they share the `// TODO: Phase G` literal.

## Sweep checklist (PR 1)

- [ ] A1 — `cli-login` URL fix + test
- [ ] A2 — `ShareDialog` toggle/extend → PATCH + test
- [ ] A3 — `SharePageClient` `useCurrentUser` + 3 action stubs (verify routes; carry forward Cat B items)
- [ ] A4 — `AutoRouterPreferenceModal` drop TODOs (verify preferences columns exist)
- [ ] A5 — `MeetingReviewPanel` drop TODO
- [ ] A6 — `SmartAssistantPageClient` drop tasks/notes TODOs
- [ ] A7 — Bible verse: relabel `TODO` → `PERF`, open follow-up issue
- [ ] A8 — `QuickModelSwitcher` pro access wiring
- [ ] Run `bun run lint && bun run test:run && bun run build`
- [ ] PR title: `chore: Phase G wire-up sweep — drop ~25 stale TODOs`
- [ ] PR description references this doc

## Out of PR 1

- Anything that needs a new route → PR 4
- Anything that needs a new table → PR 2/3
- Mobile/desktop/CLI changes
