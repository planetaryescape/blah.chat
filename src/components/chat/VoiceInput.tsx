"use client";

import { Button } from "@/components/ui/button";
import { api } from "@/convex/_generated/api";
import { cn } from "@/lib/utils";
import { useAction, useQuery } from "convex/react";
import { Mic } from "lucide-react";
import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";

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

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const streamRef = useRef<MediaStream | null>(null);
    const stopModeRef = useRef<"preview" | "send" | null>(null);

    // @ts-ignore
    const user = useQuery(api.users.getCurrentUser as any);
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

              const autoSend = stopModeRef.current === "send";
              onTranscript(transcript, autoSend);
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
              stopModeRef.current = null;
            }
          };
          reader.readAsDataURL(audioBlob);
        };

        recorder.start();
        mediaRecorderRef.current = recorder;
        setIsRecording(true);
        onRecordingStateChange?.(true, stream);
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
    ]);

    const stopRecording = useCallback(
      (mode: "preview" | "send") => {
        if (!isRecording || !mediaRecorderRef.current) return;

        stopModeRef.current = mode;
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
        aria-label={
          isRecording ? "Stop recording" : `Start voice input (${sttProvider})`
        }
        className={cn(
          "transition-all duration-300",
          isRecording
            ? "bg-primary text-primary-foreground hover:bg-primary/90"
            : "",
        )}
      >
        <div
          className="relative w-4 h-4 flex items-center justify-center"
          aria-hidden="true"
        >
          <div
            className={cn(
              "absolute inset-0 flex items-center justify-center transition-all duration-300 transform",
              isRecording
                ? "opacity-100 scale-100 rotate-0"
                : "opacity-0 scale-50 rotate-90",
            )}
          >
            <div className="h-3 w-3 bg-current rounded-[2px]" />
          </div>
          <div
            className={cn(
              "absolute inset-0 flex items-center justify-center transition-all duration-300 transform",
              !isRecording
                ? "opacity-100 scale-100 rotate-0"
                : "opacity-0 scale-50 -rotate-90",
            )}
          >
            <Mic className="w-4 h-4" />
          </div>
        </div>
      </Button>
    );
  },
);

VoiceInput.displayName = "VoiceInput";
