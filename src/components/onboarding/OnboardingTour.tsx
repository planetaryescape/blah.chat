"use client";

import { api } from "@/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { useEffect, useState } from "react";
import Joyride, { type CallBackProps, type Step } from "react-joyride";

const TOUR_STEPS: Step[] = [
  {
    target: '[data-tour="input"]',
    content: (
      <div className="space-y-2">
        <p className="font-semibold">Type Your Message</p>
        <p className="text-sm">
          This is where you chat with AI. Press{" "}
          <kbd className="px-1.5 py-0.5 text-xs font-semibold rounded bg-muted border">
            Enter
          </kbd>{" "}
          to send, or{" "}
          <kbd className="px-1.5 py-0.5 text-xs font-semibold rounded bg-muted border">
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
        <p className="font-semibold">Choose Your AI Model</p>
        <p className="text-sm">
          Switch between different AI models anytime. Press{" "}
          <kbd className="px-1.5 py-0.5 text-xs font-semibold rounded bg-muted border">
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
        <p className="font-semibold">Compare Responses</p>
        <p className="text-sm">
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
        <p className="font-semibold">Your Conversations</p>
        <p className="text-sm">
          All your chat history is here. Use{" "}
          <kbd className="px-1.5 py-0.5 text-xs font-semibold rounded bg-muted border">
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
        <p className="font-semibold">Start Fresh</p>
        <p className="text-sm">
          Click here or press{" "}
          <kbd className="px-1.5 py-0.5 text-xs font-semibold rounded bg-muted border">
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

  return (
    <Joyride
      steps={TOUR_STEPS}
      run={run}
      stepIndex={stepIndex}
      continuous
      showProgress
      showSkipButton
      callback={handleJoyrideCallback}
      styles={{
        options: {
          primaryColor: "hsl(var(--primary))",
          backgroundColor: "hsl(var(--background))",
          textColor: "hsl(var(--foreground))",
          overlayColor: "rgba(0, 0, 0, 0.5)",
          arrowColor: "hsl(var(--background))",
          zIndex: 10000,
        },
        tooltip: {
          borderRadius: "0.5rem",
          padding: "1rem",
          fontSize: "0.875rem",
        },
        tooltipContainer: {
          textAlign: "left",
        },
        buttonNext: {
          backgroundColor: "hsl(var(--primary))",
          color: "hsl(var(--primary-foreground))",
          borderRadius: "0.375rem",
          padding: "0.5rem 1rem",
          fontSize: "0.875rem",
        },
        buttonBack: {
          color: "hsl(var(--muted-foreground))",
          marginRight: "0.5rem",
        },
        buttonSkip: {
          color: "hsl(var(--muted-foreground))",
        },
        spotlight: {
          borderRadius: "0.5rem",
        },
      }}
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
