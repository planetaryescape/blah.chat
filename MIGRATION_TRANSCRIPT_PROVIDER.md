# Transcript Provider Migration Guide

## Overview
This migration moves the transcript (STT) provider setting from user preferences to admin settings.

## Steps

### Option 1: Convex Dashboard (Recommended)

1. Open Convex Dashboard: https://dashboard.convex.dev
2. Select your project: `blah.chat`
3. Go to **Functions** tab
4. Find `adminSettings` → `migrateSTTPreferences`
5. Click **Run**
6. No arguments needed - click **Run Mutation**
7. Check output - should see: `{ success: true, deletedPreferences: X, message: "..." }`

### Option 2: Convex CLI

```bash
# From project root
npx convex run adminSettings:migrateSTTPreferences
```

### Option 3: Code (via admin UI)

We can add a migration button to admin settings if needed.

## What This Does

1. ✅ Sets admin default transcript provider to **Groq Whisper Turbo**
2. ✅ Sets cost tracking to **$0.0067/min** ($0.04/hour)
3. ✅ Deletes all user `sttProvider` preferences (they're now ignored)
4. ✅ Logs deletion count for audit trail

## After Migration

- All users will use **Groq** for voice transcription
- Admin can change provider in: **Admin Settings → General → Integrations**
- Users can only toggle STT on/off (no provider choice)

## Verification

1. **Admin Settings**
   - Navigate to `/admin/settings`
   - Check "Transcript Provider" shows **Groq Whisper Turbo**
   - Try changing provider - should save successfully

2. **Voice Input**
   - Go to Settings → Voice
   - No provider dropdown should be visible
   - Toggle STT on, try voice input
   - Check logs: should show "Using admin provider: groq"

3. **Usage Tracking**
   - After transcription, check Convex dashboard
   - Query `usageRecords` table
   - Should see cost calculated with Groq rate

## Rollback

If needed, revert these files:
- `convex/transcription.ts` (restore user preference lookup)
- `src/components/settings/STTSettings.tsx` (restore provider dropdown)

User preferences are deleted but backed up in Convex logs (recoverable within 7 days).

## Notes

- Migration is **idempotent** - safe to run multiple times
- If `transcriptProvider` already exists, it won't be overwritten
- Only admin users can run this migration
