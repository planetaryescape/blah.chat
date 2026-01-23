# Work Item 06: Global Text Scale Slider

## Summary
Add a UI setting to scale the entire interface text and related spacing. This improves readability and accessibility.

## Problem
- There is no global text scaling. Users who need larger text must rely on browser zoom.

## User Impact
- Poor readability for users with low vision or large displays.

## Proposed Fix
- Introduce a CSS variable (e.g., `--app-text-scale`) applied to `html` font size and key layout dimensions.
- Add a slider in UI settings to adjust this value.

## Implementation Notes
- Add preference in Convex user settings and fetch in `useUserPreference`.
- Add slider in `apps/web/src/components/settings/UISettings.tsx`.
- Apply `--app-text-scale` in global CSS, similar to Open WebUI (`/tmp/open-webui/src/app.css`).

## Acceptance Criteria
- Adjusting the slider scales text consistently across the app.
- Values persist across reloads and sessions.
- Slider respects reasonable bounds (e.g., 1.0 to 1.5).

## Tests
- Move slider and verify app text scales.
- Reload and confirm persistence.
