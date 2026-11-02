# Listen to structured responses

Enable **Text-to-Speech** in **Settings > Voice**, choose an Aura voice, then
select the speaker button on an assistant message. The player prepares a spoken
rendition before requesting audio. Your original message stays unchanged.

## What you hear

- Ordinary prose keeps its content and order. Headings and paragraphs have
  separate playback boundaries and pauses.
- Typed pronunciation reads decimal digits individually (`3.050` becomes
  "3 point zero five zero") and preserves signs, percentages, and version parts.
- Lists retain their order. Tables have a technical detail path rather than
  being replaced by a summary.
- Code keeps a technical detail path. An optional model-selected outline quotes
  validated source lines; it cannot add free-form claims about execution or replace
  the code detail.
- Images retain available author descriptions. Unavailable visual evidence is
  disclosed as partial coverage, not described from a filename or URL.

Preparation is a listening adaptation, not a request to shorten the response.
Warnings identify unsupported structures or preparation fallbacks. If synthesis
fails, playback stops instead of silently moving past the failed segment.

Use the player to pause, resume, change speed, or close playback. Closing the
player or starting another message cancels the previous playback session.
Seeking stays within the currently loaded section; the total duration is an
estimate until all sections have loaded. Speed changes apply in the browser.

## Configure providers

Configure `DEEPGRAM_API_KEY` on the Convex deployment for application-managed
speech. Deepgram receives the prepared text through its `/v1/speak` API.
Preparation uses the shared operational model configuration only when model
assistance is needed. Provider usage is billed and recorded; audio is not free
because this feature is enabled.

BYOK does not authorize a silent fallback to application-owned credentials.
BYOK preparation currently stays deterministic and reports the unavailable
optional outline. Synthesis requires the reader's Deepgram key when BYOK is on.

## Maintainer reference

| File | Responsibility |
| --- | --- |
| `packages/backend/convex/speechPreparation.ts` | Authenticated preparation action |
| `packages/backend/convex/lib/speech/` | Source-linked rendition types and preparation |
| `packages/backend/convex/http.ts` | Authenticated `/tts` audio requests |
| `packages/backend/convex/tts.ts` | Convex synthesis action |
| `packages/backend/convex/ttsCache.ts` | Audio cache |
| `apps/web/src/contexts/TTSContext.tsx` | Preparation and playback lifecycle |
| `apps/web/src/hooks/useTTSAudioPlayer.ts` | Ordered audio playback and pauses |

The web client sends speech text in a JSON `POST /tts` body, not a URL query
parameter. Authentication determines the cache owner. The legacy GET transport
remains for compatibility; new clients should use POST. Never put credentials or
private speech text into diagnostic logs.

Preparation accepts at most 40,000 UTF-16 source units and 500 blocks. It produces
at most 1,500 segments and 120,000 output units, with no segment over 1,800 units.
Oversized renditions fail rather than truncate. Optional model assistance has
at most four calls, a 6,000-character prompt limit per call, 2,000 output tokens
per call, and a shared 30-second model deadline. No model retries are made.

`sourceHash`, `blockId`, `sourceStart`, and `sourceEnd` tie each segment to the
original Markdown revision. Source offsets use UTF-16, matching JavaScript string
slices. These mappings are not word-level audio timestamps.

## Troubleshoot playback

| Symptom | Next action |
| --- | --- |
| TTS disabled | Enable it in Settings > Voice. |
| Missing provider credentials | Check the active application's or reader's Deepgram configuration. |
| Preparation warning | Read the warning; an unavailable image or unsupported structure is not full equivalent coverage. |
| Audio stops with an error | Retry the message after resolving the provider or network error; content was not intentionally skipped. |
| Browser blocks audio | Start playback through the speaker button and check browser audio permissions. |

This implementation does not fetch arbitrary image URLs, supply a device-voice
fallback, or claim word-level source alignment. Source mappings are segment-level.
Complex visual and mathematical content can remain partial; inspect warnings
before relying on the rendition as an equivalent alternative.
