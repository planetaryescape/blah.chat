import { toast } from "burnt";
import { useAction, useMutation } from "convex/react";
import { Audio } from "expo-av";
import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/convex";

export type STTState = "idle" | "recording" | "transcribing";
export type STTStopMode = "insert" | "send";

const DEFAULT_RECORDING_MIME_TYPE = "audio/m4a";

export function useChatSTT(sttEnabled: boolean) {
  // @ts-ignore - Type depth exceeded with complex Convex action modules
  const transcribeAudio = useAction(api.transcription.transcribeAudio);
  // @ts-ignore - Type depth exceeded with complex Convex mutation modules
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);

  const recordingRef = useRef<Audio.Recording | null>(null);
  const [state, setState] = useState<STTState>("idle");

  const startRecording = useCallback(async (): Promise<boolean> => {
    if (!sttEnabled) return false;
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
  }, [state, sttEnabled]);

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

        const uploadUrl = await generateUploadUrl();
        const uploadResponse = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": mimeType },
          body: audioBlob,
        });

        if (!uploadResponse.ok) {
          throw new Error("Upload failed");
        }

        const { storageId } = (await uploadResponse.json()) as {
          storageId: string;
        };

        const transcript = (await transcribeAudio({
          storageId,
          mimeType,
        })) as string;

        return transcript?.trim() || null;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Transcription failed";
        toast({ preset: "error", title: message });
        return null;
      } finally {
        setState("idle");
      }
    },
    [generateUploadUrl, state, transcribeAudio],
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
    startRecording,
    stopRecording,
  };
}
