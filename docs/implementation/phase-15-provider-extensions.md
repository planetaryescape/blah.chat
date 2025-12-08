# Phase 15: Provider Extensions (Updated)

**Goal**: Voice features with multiple STT options and a single, pay-as-you-go TTS provider.
**Status**: STT roadmap intact; TTS trimmed to Deepgram only (ElevenLabs & LMNT removed).

---

## STT Plan (unchanged)
- Providers: OpenAI Whisper, Groq Whisper, Deepgram Nova-3, AssemblyAI.
- User settings: `sttProvider`, optional diarization, etc. (see `convex/schema.ts`).
- Implementation guidance remains in `convex/transcription.ts` stubs and STT settings UI.

## TTS (current state)
- Provider: **Deepgram Aura** only.
- Backend: `convex/tts.ts` calls Deepgram `/v1/speak` with Aura voices and optional tempo (0.5x–2x, clamped).
- Frontend: `TTSButton` in chat; `TTSSettings` exposes Deepgram voices and auto-coerces provider to `deepgram`.
- Cost tracking: `recordTTS` logs `model = "deepgram:tts"` with character counts and cost.
- Env: `DEEPGRAM_API_KEY` required in `.env.local`.

## Rationale for removing ElevenLabs & LMNT
- No pay-as-you-go plans available for the project budget.
- Simplifies UI and backend error surface area.

## Next Steps
1) Finish any remaining Deepgram TTS QA (400 errors now include API body text).  
2) For STT, continue implementing Deepgram/AssemblyAI stubs as needed.  
3) Keep TTS settings defaulted to Deepgram to avoid stale provider values in existing user prefs.
