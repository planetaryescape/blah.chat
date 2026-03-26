"use client";

import { Mic } from "lucide-react";
import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useUserPreference } from "@/hooks/useUserPreference";
import { analytics } from "@/lib/analytics";
import { useApiClient } from "@/lib/api/client";
import { useSDKClient } from "@/lib/api/sdkClient";
import { useCurrentUser } from "@/lib/hooks/queries/useCurrentUser";
import { useApiKeyValidation } from "@/lib/hooks/useApiKeyValidation";
import { cn } from "@/lib/utils";

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

    const { data: user } = useCurrentUser();
    const apiClient = useApiClient();
    const sdk = useSDKClient();

    // Phase 4: Use new preference hooks
    const sttEnabled = useUserPreference("sttEnabled");
    const sttProvider = useUserPreference("sttProvider");

    // BYOK check for Groq key
    const { byok, getSTTErrorMessage } = useApiKeyValidation();
    const isByokGroqMissing = byok.enabled && !byok.hasGroqKey;

    const startRecording = useCallback(() => {
      if (!sttEnabled) {
        toast.error("Voice input disabled in settings");
        return;
      }

      void navigator.mediaDevices
        .getUserMedia({
          audio: true,
        })
        .then((stream) => {
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

          recorder.onstop = () => {
            setIsProcessing(true);
            onRecordingStateChange?.(false);

            const audioBlob = new Blob(audioChunksRef.current, {
              type: "audio/webm",
            });

            analytics.track("voice_recording_stopped", {
              durationMs: audioBlob.size / 16,
            });

            void apiClient
              .post<{
                uploadUrl: string;
                storageId: string;
              }>("/api/v1/files/upload-url", {
                fileName: `voice-input-${Date.now()}.webm`,
                contentType: audioBlob.type,
              })
              .then(({ uploadUrl, storageId }) =>
                fetch(uploadUrl, {
                  method: "PUT",
                  headers: { "Content-Type": audioBlob.type },
                  body: audioBlob,
                }).then((uploadResponse) => {
                  if (!uploadResponse.ok) {
                    throw new Error("Failed to upload audio file");
                  }

                  return sdk.transcribeAudio({
                    storageId,
                    mimeType: "audio/webm",
                  });
                }),
              )
              .then(({ jobId }) =>
                sdk.waitForJob<{ text: string }>(jobId, {
                  timeoutMs: 95_000,
                  initialInterval: 1000,
                  maxInterval: 10_000,
                }),
              )
              .then((job) => {
                const transcript = job.result?.text;
                if (!transcript) {
                  throw new Error("Transcription did not return text");
                }

                const autoSend = stopModeRef.current === "send";
                onTranscript(transcript, autoSend);
                analytics.track("transcription_completed", {
                  autoSendUsed: autoSend,
                });
              })
              .catch((error) => {
                console.error("Transcription failed:", error);

                const message =
                  error instanceof Error ? error.message : String(error);
                if (message === "TIMEOUT") {
                  toast.error(
                    "Transcription timed out. Try recording a shorter message.",
                  );
                } else {
                  toast.error(message || "STT not working right now");
                }

                onTranscript("", false);
              })
              .finally(() => {
                setIsProcessing(false);
                stopModeRef.current = null;
              });
          };

          recorder.start();
          mediaRecorderRef.current = recorder;
          setIsRecording(true);
          onRecordingStateChange?.(true, stream);
          analytics.track("voice_recording_started");
        })
        .catch((error) => {
          console.error("MediaRecorder failed:", error);
          toast.error("Microphone access denied");
        });
    }, [sttEnabled, apiClient, sdk, onTranscript, onRecordingStateChange]);

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

    const button = (
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={toggleRecording}
        disabled={isDisabled || isProcessing || !user || isByokGroqMissing}
        aria-label={
          isRecording ? "Stop recording" : `Start voice input (${sttProvider})`
        }
        className={cn(
          "h-8 w-8 rounded-full transition-all duration-300",
          isRecording
            ? "bg-primary text-primary-foreground hover:bg-primary/90"
            : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
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

    // Show tooltip when BYOK enabled but Groq key missing
    if (isByokGroqMissing) {
      return (
        <Tooltip>
          <TooltipTrigger asChild>{button}</TooltipTrigger>
          <TooltipContent>
            {getSTTErrorMessage() || "Add Groq API key in Settings → Advanced"}
          </TooltipContent>
        </Tooltip>
      );
    }

    return button;
  },
);

VoiceInput.displayName = "VoiceInput";
