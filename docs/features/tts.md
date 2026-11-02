# Listen to structured responses

Enable **Text-to-Speech** in **Settings > Voice**, choose an Aura voice, then
select the speaker button on an assistant message. The player prepares a spoken
rendition before requesting audio. Your original message stays unchanged.

## What you hear

- Ordinary prose keeps its content and order. Headings and paragraphs have
  separate playback boundaries and pauses.
- Typed pronunciation reads decimal digits individually (`3.050` becomes
  "3 point zero five zero") and preserves signs, percentages, and version parts.
  Dollar-delimited mathematical spans stay unchanged instead of acquiring
  invented currency units; mathematical pronunciation remains partial.
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
assistance is needed. Usage is recorded at published rates; actual charges depend
on the provider account's credits and plan. Enabling this feature does not itself
provide free audio.

Audio usage records estimate the published pay-as-you-go rates: $0.015 per 1,000
input characters for Aura-1 and $0.030 for Aura-2, verified against
[Deepgram pricing](https://deepgram.com/pricing) on 2026-11-02. Discounted provider
plans can differ. Replaying cached audio does not add another synthesis charge.

The usage budget measures the user's recorded cost, including BYOK usage; it is
not an application-subsidy limit. Optional outlines recheck recorded spend before
each call. Application-managed synthesis compares its estimate against remaining
recorded budget. BYOK synthesis skips this admission check; its usage is still
recorded and contributes to the user's recorded spend. Neither the outline check
nor application-managed synthesis admission reserves spend across concurrent
requests: this is not an atomic billing cap. Identical owner/configuration
synthesis requests share a durable claim: only its winner calls the provider.
Duplicates wait up to four seconds for
cached audio; if it is still pending, HTTP returns 409 with `Retry-After: 1`.
The player shows a Retry narration button rather than automatically synthesizing
a duplicate request.

Stop cancels local playback and rejects late preparation results. Current web
clients also send an authenticated cancellation for that preparation request,
using its captured session token. A durable cancellation tombstone handles Stop
arriving before preparation begins. The action checks cancellation before each
optional outline and after recording its usage; it does not start later optional
calls once cancellation is observed. Network failure can prevent cancellation,
and an already-started provider call can finish and be recorded after Stop.
Stop does not reverse incurred cost. Older clients without a request ID retain
the bounded, non-cancellable preparation path.

Preparation records expire after ten minutes, with at most 100 retained requests
per owner. Synthesis claims expire after 90 seconds, longer than the 30-second
provider deadline, allowing time for usage/cache writes. Claim-token checks fence
late cache completion and release from a replacement claim. Both tables have
scheduled expired cleanup in batches of at most 100 and owner indexes for account
deletion. These claims deduplicate identical audio; they do not reserve a global
monthly spending allowance.

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

New audio cache rows include the authenticated owner's user ID as well as an
owner/configuration-scoped hash. Valid legacy cache hits acquire ownership on
replay without another provider charge; a conflicting stored owner is rejected.
Account cleanup collects owned rows and their MP3 storage IDs through the
`ttsCache.by_user` index. It retains any blob still referenced by a surviving
file, attachment, or cache row, including an unowned legacy row.

Unread legacy rows have no reliable owner mapping and remain untouched; this
change does not claim that historical unowned audio has been erased. Internal
legacy cache writers can still omit ownership for compatibility. Synthetic
account-deletion tests verify owned row/blob removal and preservation of shared
foreign and legacy blobs; this is not proof of a real Clerk account deletion.

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
| Browser blocks audio | Choose Resume in the player; the loaded section is retained for this explicit gesture. |

This implementation does not fetch arbitrary image URLs, supply a device-voice
fallback, or claim word-level source alignment. Source mappings are segment-level.
Complex visual and mathematical content can remain partial; inspect warnings
before relying on the rendition as an equivalent alternative.
