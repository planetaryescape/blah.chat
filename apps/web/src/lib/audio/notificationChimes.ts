import type {
  NotificationChimeEvent,
  NotificationChimeId,
  NotificationChimeSounds,
} from "@blah-chat/shared/preferences";

export type {
  NotificationChimeEvent,
  NotificationChimeId,
  NotificationChimeSounds,
};

export const NOTIFICATION_CHIME_OPTIONS: {
  id: NotificationChimeId;
  label: string;
}[] = [
  { id: "arrival", label: "Arrival" },
  { id: "sent", label: "Sent" },
  { id: "archive", label: "Archive" },
  { id: "notify", label: "Notify" },
  { id: "none", label: "Off" },
];

type ChimeNote = {
  frequency: number;
  start: number;
  duration: number;
  gain: number;
  type?: OscillatorType;
};

const CHIME_PATTERNS: Record<
  Exclude<NotificationChimeId, "none">,
  ChimeNote[]
> = {
  arrival: [
    { frequency: 659, start: 0, duration: 0.11, gain: 0.045 },
    { frequency: 988, start: 0.1, duration: 0.14, gain: 0.035 },
  ],
  sent: [
    { frequency: 784, start: 0, duration: 0.08, gain: 0.035 },
    { frequency: 1175, start: 0.07, duration: 0.1, gain: 0.028 },
  ],
  archive: [
    {
      frequency: 392,
      start: 0,
      duration: 0.12,
      gain: 0.04,
      type: "triangle",
    },
    {
      frequency: 294,
      start: 0.11,
      duration: 0.16,
      gain: 0.025,
      type: "triangle",
    },
  ],
  notify: [{ frequency: 880, start: 0, duration: 0.12, gain: 0.035 }],
};

let audioContext: AudioContext | null = null;

function getAudioContext() {
  if (typeof window === "undefined") {
    return null;
  }

  const audioWindow = window as Window &
    typeof globalThis & {
      webkitAudioContext?: typeof AudioContext;
    };
  const AudioContextClass =
    audioWindow.AudioContext ?? audioWindow.webkitAudioContext;

  if (!AudioContextClass) {
    return null;
  }

  audioContext ??= new AudioContextClass();
  return audioContext;
}

export function resolveNotificationChime(
  event: NotificationChimeEvent,
  enabled: boolean,
  sounds: NotificationChimeSounds,
): NotificationChimeId | null {
  if (!enabled) {
    return null;
  }

  const sound = sounds[event];
  return sound === "none" ? null : sound;
}

export async function playNotificationChime(chime: NotificationChimeId) {
  if (chime === "none") {
    return;
  }

  const context = getAudioContext();
  if (!context) {
    return;
  }

  try {
    await context.resume?.();
  } catch {
    return;
  }
  const destination = context.destination;
  const startTime = context.currentTime;

  for (const note of CHIME_PATTERNS[chime]) {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const startsAt = startTime + note.start;
    const endsAt = startsAt + note.duration;

    oscillator.type = note.type ?? "sine";
    oscillator.frequency.setValueAtTime(note.frequency, startsAt);
    gain.gain.setValueAtTime(0.0001, startsAt);
    gain.gain.exponentialRampToValueAtTime(note.gain, startsAt + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, endsAt);

    oscillator.connect(gain);
    gain.connect(destination);
    oscillator.start(startsAt);
    oscillator.stop(endsAt + 0.02);
    oscillator.onended = () => {
      oscillator.disconnect();
      gain.disconnect();
    };
  }
}
