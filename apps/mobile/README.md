# Mobile

The Expo app uses Clerk-authenticated Convex for conversations, message actions,
uploads, voice transcription, notes and settings. Set the public Clerk publishable
key and Convex URL through your normal Expo configuration.

`EXPO_PUBLIC_MOBILE_TRANSPORT` must be unset or `convex`. The incomplete HTTP/SSE
mobile fallback is suspended: it lacks edit/branch/switch endpoints and cannot
provide a complete HTTP-only journey. Other values show a configuration error
before mounting authenticated app consumers; no writes fall through to another
backend. This does not affect the CLI's independent API-key HTTP/SSE transport.

Voice settings retain the existing Deepgram Aura voice catalog. Selection persists
`ttsVoice`; failed updates leave the picker open. Note autosave failures show a
toast and keep the local edit; backing out waits for a successful final save.
Shared notes use the web app's `/share/[shareId]` route.

From this directory:

```sh
bun run dev
agent-work run -- bun run typecheck
agent-work run -- bun test tests
EXPO_NO_DOTENV=1 agent-work run -- bun run build -- --platform ios --max-workers 4
```

An Expo export checks bundling, not an installed device journey. Microphone,
keyboard, dialog and playback behavior still need device validation.
