import { Audio } from "expo-av";
import * as Haptics from "expo-haptics";
import { Square, X } from "lucide-react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { requestAudioPermission } from "@/lib/permissions";
import { colors } from "@/lib/theme/colors";
import { fonts } from "@/lib/theme/fonts";
import { radius, spacing } from "@/lib/theme/spacing";
import { uploadToConvex } from "@/lib/upload";

interface VoiceRecorderProps {
  onTranscript: (text: string) => void;
  onCancel: () => void;
  transcribeAudio: (args: {
    storageId: string;
    mimeType: string;
  }) => Promise<string>;
  generateUploadUrl: () => Promise<string>;
}

type RecordingState = "idle" | "recording" | "processing";

export function VoiceRecorder({
  onTranscript,
  onCancel,
  transcribeAudio,
  generateUploadUrl,
}: VoiceRecorderProps) {
  const [state, setState] = useState<RecordingState>("idle");
  const [duration, setDuration] = useState(0);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const startRecording = useCallback(async () => {
    const hasPermission = await requestAudioPermission();
    if (!hasPermission) {
      onCancel();
      return;
    }

    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY,
      );

      recordingRef.current = recording;
      setState("recording");
      setDuration(0);

      timerRef.current = setInterval(() => {
        setDuration((d) => d + 1);
      }, 1000);

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (error) {
      console.error("Failed to start recording:", error);
      onCancel();
    }
  }, [onCancel]);

  const stopRecording = useCallback(async () => {
    if (!recordingRef.current) return;

    setState("processing");

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    try {
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;

      if (!uri) {
        throw new Error("No recording URI");
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
      });

      const storageId = await uploadToConvex({
        generateUploadUrl,
        fileUri: uri,
        mimeType: "audio/m4a",
      });

      const transcript = await transcribeAudio({
        storageId,
        mimeType: "audio/m4a",
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onTranscript(transcript);
    } catch (error) {
      console.error("Transcription failed:", error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      onCancel();
    }
  }, [generateUploadUrl, transcribeAudio, onTranscript, onCancel]);

  const handleCancel = useCallback(async () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (recordingRef.current) {
      try {
        await recordingRef.current.stopAndUnloadAsync();
      } catch {
        // Cleanup errors expected
      }
      recordingRef.current = null;
    }

    try {
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
    } catch {
      // Cleanup errors expected
    }

    onCancel();
  }, [onCancel]);

  useEffect(() => {
    startRecording();

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [startRecording]);

  return (
    <View style={styles.container}>
      {state === "processing" ? (
        <View style={styles.processingContainer}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={styles.processingText}>Transcribing...</Text>
        </View>
      ) : (
        <>
          {/* Cancel button */}
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={handleCancel}
            activeOpacity={0.7}
          >
            <X size={20} color={colors.mutedForeground} />
          </TouchableOpacity>

          {/* Recording indicator */}
          <View style={styles.recordingIndicator}>
            <View style={styles.recordingDot} />
            <Text style={styles.durationText}>{formatDuration(duration)}</Text>
          </View>

          {/* Stop button */}
          <TouchableOpacity
            style={styles.stopButton}
            onPress={stopRecording}
            activeOpacity={0.8}
          >
            <Square size={16} color="#fff" fill="#fff" />
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  cancelButton: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    backgroundColor: colors.muted,
    alignItems: "center",
    justifyContent: "center",
  },
  recordingIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: `${colors.error}15`,
  },
  recordingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.error,
  },
  durationText: {
    fontFamily: fonts.mono,
    fontSize: 16,
    color: colors.error,
  },
  stopButton: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    backgroundColor: colors.error,
    alignItems: "center",
    justifyContent: "center",
  },
  processingContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  processingText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: colors.mutedForeground,
  },
});
