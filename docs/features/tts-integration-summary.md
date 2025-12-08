# TTS Integration - Updated (Deepgram Only)

**Date**: 2025-12-08  
**Status**: ✅ Deepgram Aura TTS live. ElevenLabs and LMNT were removed (no pay-as-you-go).

---

## What’s Supported
- Backend: `convex/tts.ts` calls Deepgram’s `/v1/speak` REST endpoint with Aura voices and optional tempo (0.5x–2x).
- Cost tracking: `convex/usage/mutations.ts:recordTTS` logs `deepgram:tts` usage.
- Frontend: `src/components/chat/TTSButton.tsx` for playback; `src/components/settings/TTSSettings.tsx` now only exposes Deepgram voices and forces the provider to Deepgram.
- Schema/preferences: `ttsProvider` kept for backward compatibility but coerced to `deepgram`.

## Setup
Add your Deepgram key to `.env.local`:
```bash
DEEPGRAM_API_KEY=your_deepgram_api_key
```
Deepgram has $200 free credits and pay-as-you-go pricing.

## How to Use
1) Enable Text-to-Speech in Settings → Voice.  
2) Pick a Deepgram Aura voice (e.g., `aura-asteria-en`).  
3) Optional: adjust playback speed; values outside 0.5x–2x are clamped.  
4) Click the play icon on assistant messages to generate and stream audio.

## Troubleshooting
- “TTS is disabled”: toggle it on in Settings → Voice.  
- “Deepgram API error …”: confirm `DEEPGRAM_API_KEY` is set and valid; the request now reports the API’s error body for easier debugging.  
- No audio: check browser console/network tab; ensure the message has text content.
