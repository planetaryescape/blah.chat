# Text-to-Speech (Deepgram Aura)

**Status**: Live (Deepgram only - ElevenLabs & LMNT removed, no pay-as-you-go)
**Updated**: 2025-12-08

## Overview

Single provider: Deepgram Aura via REST `/v1/speak`.
- **Voices**: Aura family (12 voices) selectable in settings
- **Speed**: Tempo parameter (0.5x-2x, clamped)
- **Cost**: Tracked as `deepgram:tts` in `usageRecords`
- **Pricing**: $200 free credits, then pay-as-you-go

## Setup

Add to `.env.local`:
```bash
DEEPGRAM_API_KEY=your_deepgram_api_key
```

## How to Use

1. Enable Text-to-Speech in **Settings > Voice**
2. Pick a Deepgram Aura voice (e.g., `aura-asteria-en`)
3. Optional: adjust playback speed (0.5x-2x)
4. Click play icon on assistant messages to generate audio

## Key Files

| File | Purpose |
|------|---------|
| `convex/tts.ts` | Convex action; fetches Deepgram audio |
| `convex/usage/mutations.ts` | `recordTTS` mutation for cost logging |
| `src/components/chat/TTSButton.tsx` | Play/pause control in chat |
| `src/components/settings/TTSSettings.tsx` | Deepgram voice/speed settings |

## How It Works

1. User enables TTS in Settings > Voice
2. Client calls `api.tts.generateSpeech` with text/voice/speed
3. Convex action calls Deepgram `/v1/speak?model=<voice>&encoding=mp3&tempo=<speed>`
4. Response audio > base64 > browser `Audio` via `TTSButton`
5. Usage recorded as `deepgram:tts` with character counts and cost

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "TTS is disabled" | Enable in Settings > Voice |
| 400 Bad Request | Check `DEEPGRAM_API_KEY`, ensure voice is Aura model |
| "Deepgram API error" | Verify API key is valid; error body shown in message |
| No audio | Check browser console/network; ensure message has text |
| Old provider in prefs | Opening TTS settings auto-coerces to `deepgram` |
