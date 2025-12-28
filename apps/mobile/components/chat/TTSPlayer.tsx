import { useState, useCallback, useRef, useEffect } from "react";
import { TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { Audio, AVPlaybackStatus } from "expo-av";
import * as Haptics from "expo-haptics";
import { Volume2, Square } from "lucide-react-native";
import removeMarkdown from "remove-markdown";
import { colors } from "@/lib/theme/colors";
import { spacing, radius } from "@/lib/theme/spacing";
import { getTTSUrl, chunkText } from "@/lib/utils/ttsUtils";

interface TTSPlayerProps {
  text: string;
  voice?: string;
  speed?: number;
}

type PlaybackState = "idle" | "loading" | "playing";

export function TTSPlayer({
  text,
  voice = "aura-asteria-en",
  speed = 1.0,
}: TTSPlayerProps) {
  const [state, setState] = useState<PlaybackState>("idle");
  const soundRef = useRef<Audio.Sound | null>(null);
  const chunksRef = useRef<string[]>([]);
  const currentChunkRef = useRef(0);
  const isStoppingRef = useRef(false);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (soundRef.current) {
        // Clear listener first, then unload
        soundRef.current.setOnPlaybackStatusUpdate(null);
        soundRef.current.unloadAsync().catch(() => {});
      }
    };
  }, []);

  const playChunk = useCallback(
    async (chunkIndex: number) => {
      // Don't play if we're stopping
      if (isStoppingRef.current) return;

      const chunk = chunksRef.current[chunkIndex];
      if (!chunk) {
        setState("idle");
        return;
      }

      try {
        const url = getTTSUrl(chunk, voice, speed);

        // Unload previous sound if any
        if (soundRef.current) {
          soundRef.current.setOnPlaybackStatusUpdate(null);
          await soundRef.current.unloadAsync();
        }

        const { sound } = await Audio.Sound.createAsync(
          { uri: url },
          { shouldPlay: true },
        );

        soundRef.current = sound;

        sound.setOnPlaybackStatusUpdate((status: AVPlaybackStatus) => {
          // Skip if we're stopping (prevents race condition)
          if (isStoppingRef.current) return;
          if (!status.isLoaded) return;

          if (status.didJustFinish) {
            // Play next chunk
            currentChunkRef.current += 1;
            if (currentChunkRef.current < chunksRef.current.length) {
              playChunk(currentChunkRef.current);
            } else {
              setState("idle");
            }
          }
        });
      } catch (error) {
        console.error("TTS playback error:", error);
        setState("idle");
      }
    },
    [voice, speed],
  );

  const stopPlayback = useCallback(async () => {
    if (!soundRef.current) return;

    isStoppingRef.current = true;

    try {
      // Clear listener FIRST (prevents callback race condition)
      soundRef.current.setOnPlaybackStatusUpdate(null);

      // Then stop and unload
      await soundRef.current.stopAsync();
      await soundRef.current.unloadAsync();
    } catch (error) {
      // Ignore "Seeking interrupted" - expected on iOS when stopping
      if (!String(error).includes("Seeking interrupted")) {
        console.error("TTS stop error:", error);
      }
    }

    soundRef.current = null;
    currentChunkRef.current = 0; // Reset to start
    setState("idle");
    isStoppingRef.current = false;
  }, []);

  const handlePlay = useCallback(async () => {
    if (state === "playing") {
      await stopPlayback();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      return;
    }

    setState("loading");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      // Set audio mode for playback
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
      });

      // Strip markdown before chunking for clean TTS
      const cleanText = removeMarkdown(text);
      chunksRef.current = chunkText(cleanText);
      currentChunkRef.current = 0;

      setState("playing");
      await playChunk(0);
    } catch (error) {
      console.error("TTS setup error:", error);
      setState("idle");
    }
  }, [state, text, playChunk, stopPlayback]);

  const getIcon = () => {
    switch (state) {
      case "loading":
        return (
          <ActivityIndicator size="small" color={colors.mutedForeground} />
        );
      case "playing":
        return (
          <Square size={14} color={colors.primary} fill={colors.primary} />
        );
      default:
        return <Volume2 size={14} color={colors.mutedForeground} />;
    }
  };

  return (
    <TouchableOpacity
      style={[styles.button, state === "playing" && styles.buttonActive]}
      onPress={handlePlay}
      disabled={state === "loading"}
      activeOpacity={0.7}
    >
      {getIcon()}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: radius.md,
    backgroundColor: colors.secondary,
  },
  buttonActive: {
    backgroundColor: `${colors.primary}20`,
  },
});
