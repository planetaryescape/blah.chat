# Phase 15: Provider Extensions (Updated)

**Goal**: Voice features with multiple STT options and a single, pay-as-you-go TTS provider.
**Status**: STT roadmap intact; TTS trimmed to Deepgram only (ElevenLabs & LMNT removed).

> **⚠️ Implementation Status (2025-12-12)**
>
> **PHASE 15: ~75% IMPLEMENTED** - Core voice features working; 2 of 4 STT providers missing.
>
> **Current Reality (Speech-to-Text):**
> - ✅ OpenAI Whisper: Fully working (`convex/transcription.ts:30-62`)
> - ✅ Groq Whisper: Fully working (`convex/transcription.ts:64-81`)
> - ❌ Deepgram Nova-3: Stubbed (`convex/transcription.ts:83-84` - TODO comment)
> - ❌ AssemblyAI: Stubbed (`convex/transcription.ts:86-88` - TODO comment)
> - ✅ UI: `src/components/settings/STTSettings.tsx` (178 lines) - provider selection, enable/disable
> - ✅ Recording: `src/components/chat/VoiceInput.tsx` (217 lines) - MediaRecorder API, webm/opus
>
> **Current Reality (Text-to-Speech):**
> - ✅ Deepgram Aura: Fully working (`convex/tts.ts:48-114`)
> - ✅ Advanced UI: `src/contexts/TTSContext.tsx` (518 lines) - MSE streaming, seekable playback
> - ✅ Settings: `src/components/settings/TTSSettings.tsx` - voice selection, speed control
> - ✅ Cost tracking: `convex/usageTracking/recordTTS.ts` - character count × $0.000003
> - ❌ Auto-read feature: Toggle exists in UI but not connected to backend
>
> **Next Step:** Complete Deepgram Nova-3 STT (API similar to OpenAI Whisper)

---

## STT Implementation Status

### Working Providers ✅

**1. OpenAI Whisper** (`convex/transcription.ts:30-62`)
- Model: `whisper-1`
- Cost: $0.006 per minute
- Format: Multipart form-data upload
- Features: High accuracy, 100+ languages

**2. Groq Whisper** (`convex/transcription.ts:64-81`)
- Model: `whisper-large-v3-turbo`
- Cost: $0.04 per hour ($0.00067 per minute)
- Format: Same as OpenAI (compatible API)
- Features: 8x faster than OpenAI, lower cost

### Missing Providers ❌

**3. Deepgram Nova-3** (`convex/transcription.ts:83-84`)
- Status: Stubbed with TODO comment
- Planned cost: $0.0043 per minute
- API endpoint: `https://api.deepgram.com/v1/listen`
- Features: Real-time streaming (for future enhancement)

**4. AssemblyAI** (`convex/transcription.ts:86-88`)
- Status: Stubbed with TODO comment
- Planned cost: $0.00025 per second ($0.015 per minute)
- API: Two-step (upload → poll for result)
- Features: Speaker diarization, custom vocabulary

### Frontend (Fully Working) ✅

**Settings Panel:** `src/components/settings/STTSettings.tsx` (178 lines)
- Provider selection dropdown (4 options)
- Enable/disable toggle
- Pricing display per provider
- Auto-transcribe mode (immediate send)

**Recording Component:** `src/components/chat/VoiceInput.tsx` (217 lines)
- MediaRecorder API with webm/opus format
- Visual waveform animation
- Base64 encoding for Convex upload
- Auto-submit mode integration

## TTS Implementation Status ✅ FULLY WORKING

### Backend (`convex/tts.ts` - 124 lines)

**Deepgram Aura Integration:**
- API: `POST https://api.deepgram.com/v1/speak`
- Voices: 12 options (Asteria, Luna, Stella, Athena, Hera, Orion, Arcas, Perseus, Angus, Orpheus, Helios, Zeus)
- Speed control: 0.5x - 2.0x (clamped)
- Output format: MP3 base64 encoded
- Cost: $0.000003 per character (~$0.015 per 5000 chars)

**Cost Tracking:**
- File: `convex/usageTracking/recordTTS.ts`
- Logs to `usageRecords` table
- Model: `"deepgram:tts"`
- Metrics: character count, cost in USD

### Advanced Frontend ✅

**TTS Context** (`src/contexts/TTSContext.tsx` - 518 lines)
- **Media Source Extensions (MSE):** Real-time audio streaming
- **Chunking:** Splits text at sentences (~200 chars per chunk)
- **Buffering:** Streams audio while generating subsequent chunks
- **Seekable timeline:** Click to jump to specific position
- **Auto-pause:** Pauses on user navigation away from conversation

**Settings Panel** (`src/components/settings/TTSSettings.tsx`)
- Voice selection (12 Deepgram Aura voices)
- Speed slider (0.5x - 2.0x)
- Enable/disable toggle
- Cost preview

**Chat Integration** (`src/components/chat/TTSButton.tsx`)
- Inline play/pause button per message
- Visual waveform during playback
- Auto-read next message feature (UI exists, not connected)

### Environment
- Required: `DEEPGRAM_API_KEY` in `.env.local`
- No additional providers (ElevenLabs & LMNT removed for cost)

## Rationale for removing ElevenLabs & LMNT
- No pay-as-you-go plans available for the project budget.
- Simplifies UI and backend error surface area.

## Remaining Work

### High Priority
1. **Deepgram Nova-3 STT** (~1-2h)
   - File: `convex/transcription.ts:83-84`
   - Implementation: Similar to OpenAI (multipart upload)
   - Endpoint: `https://api.deepgram.com/v1/listen?model=nova-3`
   - Cost tracking: $0.0043/min

2. **AssemblyAI STT** (~2-3h)
   - File: `convex/transcription.ts:86-88`
   - Implementation: Two-step (upload URL → poll transcript)
   - Endpoint: `https://api.assemblyai.com/v2/transcript`
   - Features: Speaker diarization option

### Low Priority
3. **Auto-read TTS Feature** (~30min)
   - Connect existing UI toggle to playback logic
   - Auto-play next assistant message after current finishes
   - Respect user preference from `userPreferences` table

## Testing Checklist

**STT (Partial):**
- ✅ OpenAI Whisper transcribes correctly
- ✅ Groq Whisper transcribes correctly
- ❌ Deepgram Nova-3 not testable (stubbed)
- ❌ AssemblyAI not testable (stubbed)
- ✅ UI shows all 4 providers
- ✅ Cost tracking works for implemented providers

**TTS (Complete):**
- ✅ Deepgram Aura generates speech
- ✅ MSE streaming works smoothly
- ✅ Seekable playback functional
- ✅ Speed control (0.5x - 2.0x) works
- ✅ Cost tracking accurate
- ❌ Auto-read feature not connected

## Notes
- Keep TTS settings defaulted to Deepgram (only provider)
- STT provider selection gracefully handles missing providers (shows error)
- Deepgram TTS 400 errors now include API body text for debugging
