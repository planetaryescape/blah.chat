"use client";

import { useMutation, useQuery } from "convex/react";
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  Loader2,
  Presentation,
  Vibrate,
} from "lucide-react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

function RemoteControlContent() {
  const searchParams = useSearchParams();
  const codeFromUrl = searchParams.get("code");

  const [code, setCode] = useState(codeFromUrl || "");
  const [sessionId, setSessionId] = useState<Id<"presentationSessions"> | null>(
    null,
  );
  const [isJoining, _setIsJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // @ts-ignore - Type depth exceeded with 94+ Convex modules
  const sessionData = useQuery(
    // @ts-ignore - Type depth exceeded with 94+ Convex modules
    api.presentationSessions.joinByCode,
    code.length === 6 ? { sessionCode: code } : "skip",
  );

  // @ts-ignore - Type depth exceeded with 94+ Convex modules
  const session = useQuery(
    // @ts-ignore - Type depth exceeded with 94+ Convex modules
    api.presentationSessions.get,
    sessionId ? { sessionId } : "skip",
  );

  // @ts-ignore - Type depth exceeded with 94+ Convex modules
  const navigateSlide = useMutation(api.presentationSessions.navigateSlide);
  // @ts-ignore - Type depth exceeded with 94+ Convex modules
  const ping = useMutation(api.presentationSessions.ping);

  // Get current slide image
  const slides = useQuery(
    // @ts-ignore - Type depth exceeded with 94+ Convex modules
    api.presentations.getSlides,
    session?.presentationId
      ? { presentationId: session.presentationId }
      : "skip",
  );

  const currentSlide = slides?.[session?.currentSlide ?? 0];

  // @ts-ignore - Type depth exceeded with 94+ Convex modules
  const slideImageUrl = useQuery(
    // @ts-ignore - Type depth exceeded with 94+ Convex modules
    api.storage.getUrl,
    currentSlide?.imageStorageId
      ? { storageId: currentSlide.imageStorageId }
      : "skip",
  );

  // Auto-join if code in URL
  useEffect(() => {
    if (codeFromUrl && codeFromUrl.length === 6) {
      setCode(codeFromUrl);
    }
  }, [codeFromUrl]);

  // Join session when valid code entered
  useEffect(() => {
    if (sessionData && !sessionId) {
      setSessionId(sessionData.sessionId);
      setError(null);
    } else if (code.length === 6 && !sessionData && !isJoining) {
      // Wait a bit then show error if still no data
      const timeout = setTimeout(() => {
        if (!sessionData) {
          setError("Invalid or expired code");
        }
      }, 2000);
      return () => clearTimeout(timeout);
    }
  }, [sessionData, sessionId, code, isJoining]);

  // Ping to show connection status
  useEffect(() => {
    if (!sessionId) return;

    const interval = setInterval(() => {
      ping({ sessionId, role: "remote" }).catch(() => {});
    }, 5000);

    // Initial ping
    ping({ sessionId, role: "remote" }).catch(() => {});

    return () => clearInterval(interval);
  }, [sessionId, ping]);

  // Navigation with vibration feedback
  const handleNext = useCallback(async () => {
    if (!sessionId) return;
    try {
      await navigateSlide({ sessionId, direction: "next" });
      // Vibrate on Android
      if ("vibrate" in navigator) {
        navigator.vibrate(50);
      }
    } catch (e) {
      console.error("Navigation error:", e);
    }
  }, [sessionId, navigateSlide]);

  const handlePrev = useCallback(async () => {
    if (!sessionId) return;
    try {
      await navigateSlide({ sessionId, direction: "prev" });
      if ("vibrate" in navigator) {
        navigator.vibrate(50);
      }
    } catch (e) {
      console.error("Navigation error:", e);
    }
  }, [sessionId, navigateSlide]);

  // Format timer
  const formatTimer = (startedAt?: number, elapsed?: number) => {
    if (!startedAt && !elapsed) return "00:00";
    const totalMs = startedAt
      ? Date.now() - startedAt + (elapsed || 0)
      : elapsed || 0;
    const totalSeconds = Math.floor(totalMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  };

  // Code entry screen
  if (!sessionId) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background">
        <div className="w-full max-w-sm space-y-6">
          <div className="text-center space-y-2">
            <Presentation className="h-12 w-12 mx-auto text-primary" />
            <h1 className="text-2xl font-bold">Remote Control</h1>
            <p className="text-muted-foreground">
              Enter the 6-digit code from your presentation
            </p>
          </div>

          <div className="space-y-4">
            <Input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              placeholder="000000"
              value={code}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, "");
                setCode(value);
                setError(null);
              }}
              className="text-center text-3xl font-mono tracking-widest h-16"
              autoFocus
            />

            {error && (
              <p className="text-sm text-destructive text-center">{error}</p>
            )}

            {code.length === 6 && !sessionData && !error && (
              <div className="flex justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Session expired or ended
  if (session && !session.isActive) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background">
        <div className="text-center space-y-4">
          <h1 className="text-xl font-semibold">Session Ended</h1>
          <p className="text-muted-foreground">
            This presentation session has ended.
          </p>
          <Button
            onClick={() => {
              setSessionId(null);
              setCode("");
            }}
          >
            Join Another
          </Button>
        </div>
      </div>
    );
  }

  // Remote control interface
  return (
    <div className="h-[100dvh] flex flex-col bg-background overflow-hidden">
      {/* Header */}
      <header className="border-b p-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <Presentation className="h-5 w-5 text-primary" />
          <span className="font-medium truncate max-w-[200px]">
            {sessionData?.presentationTitle || "Presentation"}
          </span>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />
          <span className="font-mono">
            {formatTimer(session?.timerStartedAt, session?.timerElapsed)}
          </span>
        </div>
      </header>

      {/* Slide preview */}
      <div className="flex-1 flex items-center justify-center p-3 bg-muted/30 min-h-0">
        {slideImageUrl ? (
          <div className="relative w-full max-w-sm max-h-[40vh] aspect-video rounded-lg overflow-hidden shadow-lg">
            <Image
              src={slideImageUrl}
              alt={currentSlide?.title || "Current slide"}
              fill
              className="object-contain bg-black"
              sizes="(max-width: 768px) 100vw, 400px"
            />
          </div>
        ) : (
          <div className="w-full max-w-sm max-h-[40vh] aspect-video rounded-lg bg-muted flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}
      </div>

      {/* Slide info */}
      <div className="py-2 px-3 text-center border-t shrink-0">
        <div className="text-base font-medium">
          Slide {(session?.currentSlide ?? 0) + 1} of{" "}
          {session?.totalSlides ?? 0}
        </div>
        {currentSlide?.title && (
          <div className="text-sm text-muted-foreground truncate">
            {currentSlide.title}
          </div>
        )}
      </div>

      {/* Navigation buttons */}
      <div className="p-3 grid grid-cols-2 gap-3 shrink-0">
        <Button
          size="lg"
          variant="outline"
          className="h-20 text-lg"
          onClick={handlePrev}
          disabled={(session?.currentSlide ?? 0) === 0}
        >
          <ChevronLeft className="h-6 w-6 mr-1" />
          Previous
        </Button>
        <Button
          size="lg"
          className="h-20 text-lg"
          onClick={handleNext}
          disabled={
            (session?.currentSlide ?? 0) >= (session?.totalSlides ?? 1) - 1
          }
        >
          Next
          <ChevronRight className="h-6 w-6 ml-1" />
        </Button>
      </div>

      {/* Vibration hint */}
      <div className="py-1.5 text-center text-xs text-muted-foreground flex items-center justify-center gap-1">
        <Vibrate className="h-3 w-3" />
        Haptic feedback enabled
      </div>
    </div>
  );
}

export default function RemotePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <RemoteControlContent />
    </Suspense>
  );
}
