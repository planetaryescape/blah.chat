import { useAuth } from "@clerk/clerk-expo";
import { toast } from "burnt";
import { Audio } from "expo-av";
import { useCallback, useEffect, useRef, useState } from "react";
import { createMobileSdkClient } from "@/lib/transport/httpClient";
import { supportsR2BlobTransport } from "@/lib/transport/mode";
import { uploadAssetToSignedUrl } from "@/lib/transport/uploads";

export type STTState = "idle" | "recording" | "transcribing";
export type STTStopMode = "insert" | "send";

const DEFAULT_RECORDING_MIME_TYPE = "audio/m4a";

export function useChatSTT(sttEnabled: boolean) {
  const isAvailable = supportsR2BlobTransport();
  const { getToken } = useAuth();
  const recordingRef = useRef<Audio.Recording | null>(null);
  const [state, setState] = useState<STTState>("idle");

  const startRecording = useCallback(async (): Promise<boolean> => {
    if (!sttEnabled) return false;
    if (!isAvailable) return false;
    if (state !== "idle") return false;

    try {
      const permission = await Audio.requestPermissionsAsync();
      if (permission.status !== "granted") {
        toast({
          preset: "error",
          title: "Microphone permission required",
        });
        return false;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY,
      );
      await recording.startAsync();

      recordingRef.current = recording;
      setState("recording");
      return true;
    } catch {
      toast({
        preset: "error",
        title: "Unable to start recording",
      });
      setState("idle");
      return false;
    }
  }, [isAvailable, state, sttEnabled]);

  const stopRecording = useCallback(
    async (_mode: STTStopMode): Promise<string | null> => {
      const recording = recordingRef.current;
      if (!recording || state !== "recording") return null;

      setState("transcribing");

      try {
        await recording.stopAndUnloadAsync();
        recordingRef.current = null;
        await Audio.setAudioModeAsync({ allowsRecordingIOS: false });

        const uri = recording.getURI();
        if (!uri) {
          throw new Error("Recording unavailable");
        }

        const audioResponse = await fetch(uri);
        const audioBlob = await audioResponse.blob();
        const mimeType = audioBlob.type || DEFAULT_RECORDING_MIME_TYPE;
        const client = createMobileSdkClient(() => getToken());
        const uploaded = await uploadAssetToSignedUrl(client, {
          uri,
          name: `recording-${Date.now()}.m4a`,
          mimeType,
          size: audioBlob.size,
        });
        const job = await client.transcribeAudio({
          storageId: uploaded.storageId,
          mimeType: uploaded.mimeType,
        });
        const completed = await client.waitForJob<string>(job.jobId);

        return typeof completed.result === "string"
          ? completed.result.trim() || null
          : null;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Transcription failed";
        toast({ preset: "error", title: message });
        return null;
      } finally {
        setState("idle");
      }
    },
    [getToken, state],
  );

  useEffect(() => {
    return () => {
      const recording = recordingRef.current;
      if (recording) {
        void recording.stopAndUnloadAsync().catch(() => {});
      }
      recordingRef.current = null;
    };
  }, []);

  return {
    state,
    isRecording: state === "recording",
    isTranscribing: state === "transcribing",
    isAvailable,
    startRecording,
    stopRecording,
  };
}
