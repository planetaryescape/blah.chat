# Text-to-Speech (Deepgram Aura) Implementation

**Status**: Backend + frontend live with Deepgram only (ElevenLabs & LMNT removed).
**Date**: 2025-12-08

---

## Overview
- Single provider: Deepgram Aura via REST `/v1/speak`.
- Voices: Aura family (12 voices) selectable in settings.
- Speed: Tempo parameter supported (0.5x–2x, clamped).
- Cost tracking: `model = "deepgram:tts"` in `usageRecords`.

## Key Files
- `convex/tts.ts` — Convex action; fetches Deepgram audio, surfaces API error body for debugging.
- `convex/usage/mutations.ts` — `recordTTS` mutation for cost logging.
- `src/components/chat/TTSButton.tsx` — Play/pause control in chat messages.
- `src/components/settings/TTSSettings.tsx` — Deepgram-only settings (voice, speed, auto-read); forces provider to Deepgram.
- `convex/schema.ts` — Preferences keep `ttsProvider` for backward compatibility but expect `deepgram`.

## Setup
Add to `.env.local`:
```bash
DEEPGRAM_API_KEY=your_deepgram_api_key
```

## How It Works
1. User enables TTS in Settings → Voice.
2. Client calls `api.tts.generateSpeech` with text/voice/speed.
3. Convex action calls Deepgram `/v1/speak?model=<voice>&encoding=mp3&tempo=<speed>`.
4. Response audio → base64 → browser `Audio` via `TTSButton`.
5. Usage recorded as `deepgram:tts` with character counts and cost.

## Troubleshooting
- **400 Bad Request**: Check `DEEPGRAM_API_KEY`, ensure `voice` is an Aura model (e.g., `aura-asteria-en`). Error body now returned in the thrown message for clarity.
- **No audio**: Verify TTS is enabled; ensure message has content; check network tab for the speak request.
- **Preferences stuck on old providers**: Opening the TTS settings auto-coerces `ttsProvider` to `deepgram`.
