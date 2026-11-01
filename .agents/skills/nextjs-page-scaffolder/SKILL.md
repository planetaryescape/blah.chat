---
name: nextjs-page-scaffolder
description: Add blah.chat Next.js App Router pages using current server/client boundaries, feature gates, existing workspace components and Postgres API patterns.
license: MIT
---

# Add a blah.chat page

Read the closest current sibling route before writing a page. Do not copy the
historical Convex template into the Postgres application.

`apps/web/src/app/(main)/notes/page.tsx` exports typed Next.js metadata and renders
`NotesPageClient`. That client reads `useFeatureToggles`, handles loading and
feature-disabled states, then renders `NotesWorkspace`. Use that split when the
new page has the same needs; a route without a feature gate does not need one.

Search the existing workspace, hooks and API routes for the actual entity before
adding fetching or state. Keep server metadata in the server entry point and
interactive state in client components. Preserve existing authentication,
response envelopes, loading/error/empty states, responsive layouts and URL-state
patterns where the feature uses them. Do not add `@ts-ignore` or a new Convex
query to copy the old scaffold.

Run the relevant repository checks and exercise the page's intended states in
the browser, including direct navigation and refresh. Validate metadata and
feature gating only when applicable to the new route.

Paths checked against `origin/fix/smooth-stream-rendering`,
`ca1bcd61626efd14492da1bf80de7b210f940026` on 2026-09-08. Fetch and inspect current
siblings when using this skill. The [old Convex template](references/legacy-convex.md)
is retained for historical branches only.
