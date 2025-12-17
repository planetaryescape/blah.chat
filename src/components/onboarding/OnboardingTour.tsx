"use client";

import { useMutation, useQuery } from "convex/react";
import { useEffect, useState } from "react";
import Joyride, { type CallBackProps, type Step } from "react-joyride";
import { api } from "@/convex/_generated/api";
import { useDarkMode } from "@/hooks/useDarkMode";

const TOUR_STEPS: Step[] = [
  {
    target: '[data-tour="input"]',
    content: (
      <div className="space-y-2">
        <p className="font-semibold text-foreground">Type Your Message</p>
        <p className="text-sm text-muted-foreground">
          This is where you chat with AI. Press{" "}
          <kbd className="px-1.5 py-0.5 text-xs font-semibold rounded bg-muted border text-foreground">
            Enter
          </kbd>{" "}
          to send, or{" "}
          <kbd className="px-1.5 py-0.5 text-xs font-semibold rounded bg-muted border text-foreground">
            Cmd+K
          </kbd>{" "}
          to open quick commands.
        </p>
      </div>
    ),
    placement: "top",
    disableBeacon: true,
  },
  {
    target: '[data-tour="model-selector"]',
    content: (
      <div className="space-y-2">
        <p className="font-semibold text-foreground">Choose Your AI Model</p>
        <p className="text-sm text-muted-foreground">
          Switch between different AI models anytime. Press{" "}
          <kbd className="px-1.5 py-0.5 text-xs font-semibold rounded bg-muted border text-foreground">
            Cmd+M
          </kbd>{" "}
          for quick access.
        </p>
      </div>
    ),
    placement: "bottom",
  },
  {
    target: '[data-tour="comparison"]',
    content: (
      <div className="space-y-2">
        <p className="font-semibold text-foreground">Compare Responses</p>
        <p className="text-sm text-muted-foreground">
          Get answers from multiple models at once and see which performs best
          for your question.
        </p>
      </div>
    ),
    placement: "bottom",
  },
  {
    target: '[data-tour="sidebar"]',
    content: (
      <div className="space-y-2">
        <p className="font-semibold text-foreground">Your Conversations</p>
        <p className="text-sm text-muted-foreground">
          All your chat history is here. Use{" "}
          <kbd className="px-1.5 py-0.5 text-xs font-semibold rounded bg-muted border text-foreground">
            Cmd+1-9
          </kbd>{" "}
          to jump to recent conversations.
        </p>
      </div>
    ),
    placement: "right",
  },
  {
    target: '[data-tour="new-chat"]',
    content: (
      <div className="space-y-2">
        <p className="font-semibold text-foreground">Start Fresh</p>
        <p className="text-sm text-muted-foreground">
          Click here or press{" "}
          <kbd className="px-1.5 py-0.5 text-xs font-semibold rounded bg-muted border text-foreground">
            Cmd+Shift+N
          </kbd>{" "}
          to start a new conversation anytime.
        </p>
      </div>
    ),
    placement: "bottom",
  },
];

export function OnboardingTour() {
  const [run, setRun] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const { isDarkMode, isLoaded: themeLoaded } = useDarkMode();

  // @ts-ignore - TypeScript recursion limit with 85+ Convex modules
  const onboarding = useQuery(api.onboarding.getOnboardingState);
  const initializeOnboarding = useMutation(api.onboarding.initializeOnboarding);
  const completeTour = useMutation(api.onboarding.completeTour);

  // Initialize onboarding state if needed
  useEffect(() => {
    if (onboarding === undefined) return; // Still loading
    if (onboarding === null) {
      // Not initialized - create it
      initializeOnboarding();
    }
  }, [onboarding, initializeOnboarding]);

  // Start tour after delay if not completed/skipped
  useEffect(() => {
    if (!onboarding) return;

    // Check if tour should run
    const shouldRun = !onboarding.tourCompleted && !onboarding.tourSkipped;

    // Disable on mobile (optional)
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      return;
    }

    if (shouldRun) {
      // Delay to ensure DOM is ready
      const timer = setTimeout(() => {
        setRun(true);
      }, 1500);

      return () => clearTimeout(timer);
    }
  }, [onboarding]);

  const handleJoyrideCallback = async (data: CallBackProps) => {
    const { status, action, index, type } = data;

    // Update step index
    if (type === "step:after") {
      setStepIndex(index + (action === "prev" ? -1 : 1));
    }

    // Handle tour completion
    if (status === "finished") {
      await completeTour({ skipped: false });
      setRun(false);
    } else if (status === "skipped") {
      await completeTour({ skipped: true });
      setRun(false);
    }
  };

  // Don't render if onboarding state not loaded
  if (!onboarding) return null;

  // Dynamic styling based on theme - only apply styles after theme is detected
  const tourStyles = themeLoaded
    ? {
        options: {
          primaryColor: "#e4a853",
          backgroundColor: isDarkMode ? "oklch(var(--card))" : "#ffffff",
          textColor: isDarkMode ? "oklch(var(--card-foreground))" : "#000000",
          overlayColor: isDarkMode
            ? "rgba(0, 0, 0, 0.85)"
            : "rgba(0, 0, 0, 0.7)",
          arrowColor: isDarkMode ? "oklch(var(--card))" : "#ffffff",
          zIndex: 10000,
        },
        tooltip: {
          borderRadius: "0.5rem",
          padding: "1rem",
          fontSize: "0.875rem",
          border: isDarkMode
            ? "1px solid oklch(var(--border))"
            : "1px solid #e5e7eb",
          backdropFilter: "blur(4px)",
          boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.4)",
        },
        tooltipContainer: {
          textAlign: "left" as const,
        },
        buttonNext: {
          backgroundColor: "#e4a853",
          color: "#ffffff",
          borderRadius: "0.375rem",
          padding: "0.5rem 1rem",
          fontSize: "0.875rem",
          border: "1px solid #e4a853",
          fontWeight: "600",
          textTransform: "none",
          boxShadow: "0 1px 3px rgba(228, 168, 83, 0.3)",
        },
        buttonBack: {
          color: isDarkMode ? "oklch(var(--muted-foreground))" : "#000000",
          backgroundColor: isDarkMode ? "oklch(var(--muted))" : "#f3f4f6",
          borderRadius: "0.375rem",
          padding: "0.5rem 1rem",
          marginRight: "0.5rem",
          border: isDarkMode
            ? "1px solid oklch(var(--border))"
            : "1px solid #d1d5db",
        },
        buttonSkip: {
          color: isDarkMode ? "oklch(var(--muted-foreground))" : "#000000",
          backgroundColor: isDarkMode ? "oklch(var(--muted))" : "#f3f4f6",
          borderRadius: "0.375rem",
          padding: "0.5rem 1rem",
          border: isDarkMode
            ? "1px solid oklch(var(--border))"
            : "1px solid #d1d5db",
        },
        spotlight: {
          borderRadius: "0.5rem",
        },
      }
    : {};

  return (
    <Joyride
      steps={TOUR_STEPS}
      run={run}
      stepIndex={stepIndex}
      continuous
      showProgress
      showSkipButton
      callback={handleJoyrideCallback}
      styles={tourStyles}
      locale={{
        back: "Back",
        close: "Close",
        last: "Finish",
        next: "Next",
        skip: "Skip tour",
      }}
    />
  );
}
