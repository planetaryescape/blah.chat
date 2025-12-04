"use client";

import {
  useState,
  useRef,
  useCallback,
  forwardRef,
  useImperativeHandle,
} from "react";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAction, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

interface VoiceInputProps {
  onTranscript: (text: string, autoSend: boolean) => void;
  onRecordingStateChange?: (recording: boolean, stream?: MediaStream) => void;
  isDisabled?: boolean;
}

export interface VoiceInputRef {
  stopRecording: (mode: "preview" | "send") => void;
}

export const VoiceInput = forwardRef<VoiceInputRef, VoiceInputProps>(
  ({ onTranscript, onRecordingStateChange, isDisabled }, ref) => {
    const [isRecording, setIsRecording] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [stopMode, setStopMode] = useState<"preview" | "send" | null>(null);

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const streamRef = useRef<MediaStream | null>(null);

    const user = useQuery(api.users.getCurrentUser);
    const transcribeAudio = useAction(api.transcription.transcribeAudio);

    const sttEnabled = user?.preferences?.sttEnabled ?? true;
    const sttProvider = user?.preferences?.sttProvider ?? "openai";

    const startRecording = useCallback(async () => {
      if (!sttEnabled) {
        toast.error("Voice input disabled in settings");
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
        streamRef.current = stream;

        const recorder = new MediaRecorder(stream, {
          mimeType: "audio/webm;codecs=opus",
        });

        audioChunksRef.current = [];

        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) {
            audioChunksRef.current.push(e.data);
          }
        };

        recorder.onstop = async () => {
          setIsProcessing(true);
          onRecordingStateChange?.(false);

          const audioBlob = new Blob(audioChunksRef.current, {
            type: "audio/webm",
          });

          // Convert to base64
          const reader = new FileReader();
          reader.onloadend = async () => {
            const base64 = (reader.result as string).split(",")[1];

            try {
              const transcript = await transcribeAudio({
                audioBase64: base64,
                mimeType: "audio/webm",
              });

              const autoSend = stopMode === "send";
              onTranscript(transcript, autoSend);
              toast.success("Transcription complete");
            } catch (error) {
              console.error("Transcription failed:", error);
              toast.error(
                error instanceof Error
                  ? error.message
                  : "STT not working right now",
              );
              onTranscript("", false);
            } finally {
              setIsProcessing(false);
              setStopMode(null);
            }
          };
          reader.readAsDataURL(audioBlob);
        };

        recorder.start();
        mediaRecorderRef.current = recorder;
        setIsRecording(true);
        onRecordingStateChange?.(true, stream);
        toast.success(`Recording... (${sttProvider})`);
      } catch (error) {
        console.error("MediaRecorder failed:", error);
        toast.error("Microphone access denied");
      }
    }, [
      sttEnabled,
      sttProvider,
      transcribeAudio,
      onTranscript,
      onRecordingStateChange,
      stopMode,
    ]);

    const stopRecording = useCallback(
      (mode: "preview" | "send") => {
        if (!isRecording || !mediaRecorderRef.current) return;

        setStopMode(mode);
        mediaRecorderRef.current.stop();

        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
        }

        setIsRecording(false);
      },
      [isRecording],
    );

    const toggleRecording = useCallback(() => {
      if (isRecording) {
        stopRecording("preview");
      } else {
        startRecording();
      }
    }, [isRecording, startRecording, stopRecording]);

    // Expose stopRecording to parent via ref
    useImperativeHandle(
      ref,
      () => ({
        stopRecording,
      }),
      [stopRecording],
    );

    if (!sttEnabled) {
      return null; // Hide button if STT disabled
    }

    return (
      <Button
        type="button"
        variant={isRecording ? "default" : "ghost"}
        size="sm"
        onClick={toggleRecording}
        disabled={isDisabled || isProcessing || !user}
        className={isRecording ? "animate-pulse" : ""}
        title={
          isRecording ? "Stop recording" : `Start voice input (${sttProvider})`
        }
      >
        {isProcessing ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : isRecording ? (
          <MicOff className="w-4 h-4" />
        ) : (
          <Mic className="w-4 h-4" />
        )}
      </Button>
    );
  },
);

VoiceInput.displayName = "VoiceInput";
