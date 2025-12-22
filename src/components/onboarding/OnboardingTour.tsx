"use client";

import { TourProvider, useTour } from "@reactour/tour";
import { useMutation, useQuery } from "convex/react";
import { useEffect, useState } from "react";
import { api } from "@/convex/_generated/api";
import { useDarkMode } from "@/hooks/useDarkMode";

/**
 * Tour steps configuration
 * Using @reactour/tour which supports React 19 (unlike react-joyride)
 */
const TOUR_STEPS = [
  {
    selector: '[data-tour="input"]',
    content: (
      <div className="space-y-2">
        <p className="font-semibold">Type Your Message</p>
        <p className="text-sm opacity-80">
          This is where you chat with AI. Press{" "}
          <kbd className="px-1.5 py-0.5 text-xs font-semibold rounded bg-black/10 dark:bg-white/10 border border-current/20">
            Enter
          </kbd>{" "}
          to send, or{" "}
          <kbd className="px-1.5 py-0.5 text-xs font-semibold rounded bg-black/10 dark:bg-white/10 border border-current/20">
            Cmd+K
          </kbd>{" "}
          to open quick commands.
        </p>
      </div>
    ),
    position: "top" as const,
  },
  {
    selector: '[data-tour="model-selector"]',
    content: (
      <div className="space-y-2">
        <p className="font-semibold">Choose Your AI Model</p>
        <p className="text-sm opacity-80">
          Switch between different AI models anytime. Press{" "}
          <kbd className="px-1.5 py-0.5 text-xs font-semibold rounded bg-black/10 dark:bg-white/10 border border-current/20">
            Cmd+M
          </kbd>{" "}
          for quick access.
        </p>
      </div>
    ),
    position: "bottom" as const,
  },
  {
    selector: '[data-tour="comparison"]',
    content: (
      <div className="space-y-2">
        <p className="font-semibold">Compare Responses</p>
        <p className="text-sm opacity-80">
          Get answers from multiple models at once and see which performs best
          for your question.
        </p>
      </div>
    ),
    position: "bottom" as const,
  },
  {
    selector: '[data-tour="sidebar"]',
    content: (
      <div className="space-y-2">
        <p className="font-semibold">Your Conversations</p>
        <p className="text-sm opacity-80">
          All your chat history is here. Use{" "}
          <kbd className="px-1.5 py-0.5 text-xs font-semibold rounded bg-black/10 dark:bg-white/10 border border-current/20">
            Cmd+1-9
          </kbd>{" "}
          to jump to recent conversations.
        </p>
      </div>
    ),
    position: "right" as const,
  },
  {
    selector: '[data-tour="new-chat"]',
    content: (
      <div className="space-y-2">
        <p className="font-semibold">Start Fresh</p>
        <p className="text-sm opacity-80">
          Click here or press{" "}
          <kbd className="px-1.5 py-0.5 text-xs font-semibold rounded bg-black/10 dark:bg-white/10 border border-current/20">
            Cmd+Shift+N
          </kbd>{" "}
          to start a new conversation anytime.
        </p>
      </div>
    ),
    position: "bottom" as const,
  },
];

/**
 * Inner tour controller that manages tour state based on onboarding data
 */
function TourController() {
  const { setIsOpen, setCurrentStep } = useTour();

  // @ts-ignore - TypeScript recursion limit with 85+ Convex modules
  const onboarding = useQuery(api.onboarding.getOnboardingState);
  const initializeOnboarding = useMutation(api.onboarding.initializeOnboarding);
  const completeTour = useMutation(api.onboarding.completeTour);

  const [hasStarted, setHasStarted] = useState(false);

  // Initialize onboarding if needed
  useEffect(() => {
    if (onboarding === undefined) return;
    if (onboarding === null) {
      initializeOnboarding();
    }
  }, [onboarding, initializeOnboarding]);

  // Start tour if conditions are met
  useEffect(() => {
    if (!onboarding || hasStarted) return;

    const shouldRun = !onboarding.tourCompleted && !onboarding.tourSkipped;

    // Skip on mobile
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      return;
    }

    if (shouldRun) {
      const timer = setTimeout(() => {
        setCurrentStep(0);
        setIsOpen(true);
        setHasStarted(true);
      }, 1500);

      return () => clearTimeout(timer);
    }
  }, [onboarding, hasStarted, setIsOpen, setCurrentStep]);

  // Handle tour completion - listen for tour close
  useEffect(() => {
    const handleTourEnd = async () => {
      if (hasStarted) {
        await completeTour({ skipped: false });
      }
    };

    // This will be called when the tour closes
    return () => {
      if (hasStarted) {
        handleTourEnd();
      }
    };
  }, [hasStarted, completeTour]);

  return null;
}

/**
 * Onboarding tour component using @reactour/tour
 * React 19 compatible replacement for react-joyride
 */
export function OnboardingTour({ children }: { children: React.ReactNode }) {
  const { isDarkMode, isLoaded: themeLoaded } = useDarkMode();

  // Only apply styles after theme is loaded
  const styles = themeLoaded
    ? {
        popover: (base: any) => ({
          ...base,
          backgroundColor: isDarkMode ? "#1f1f1f" : "#ffffff",
          color: isDarkMode ? "#e5e5e5" : "#1f1f1f",
          borderRadius: "0.5rem",
          padding: "1rem",
          fontSize: "0.875rem",
          border: isDarkMode ? "1px solid #333" : "1px solid #e5e7eb",
          boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.4)",
        }),
        maskArea: (base: any) => ({
          ...base,
          rx: 8,
        }),
        badge: (base: any) => ({
          ...base,
          backgroundColor: "#e4a853",
          color: "#ffffff",
        }),
        controls: (base: any) => ({
          ...base,
          marginTop: "1rem",
        }),
        close: (base: any) => ({
          ...base,
          color: isDarkMode ? "#a1a1aa" : "#71717a",
          "&:hover": {
            color: isDarkMode ? "#e5e5e5" : "#1f1f1f",
          },
        }),
      }
    : {};

  return (
    <TourProvider
      steps={TOUR_STEPS}
      styles={styles}
      padding={{ mask: 8, popover: [8, 12] }}
      showBadge
      showCloseButton
      showDots
      showNavigation
      disableDotsNavigation={false}
      scrollSmooth
      inViewThreshold={100}
      onClickMask={() => {}}
    >
      <TourController />
      {children}
    </TourProvider>
  );
}

/**
 * Wrapper component for pages that need onboarding
 * Use this at the layout level to provide tour context
 */
export function OnboardingWrapper({ children }: { children: React.ReactNode }) {
  return <OnboardingTour>{children}</OnboardingTour>;
}
