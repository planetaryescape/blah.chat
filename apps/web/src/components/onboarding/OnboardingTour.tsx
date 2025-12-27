"use client";

import { api } from "@blah-chat/backend/convex/_generated/api";
import { TourProvider, useTour } from "@reactour/tour";
import { useMutation, useQuery } from "convex/react";
import { useCallback, useEffect, useRef } from "react";
import { useDarkMode } from "@/hooks/useDarkMode";

/**
 * Controller component that must be inside TourProvider to access useTour()
 */
function TourController({ onComplete }: { onComplete: () => void }) {
  const { setIsOpen, setCurrentStep, isOpen } = useTour();
  const hasStartedRef = useRef(false);

  // Open tour after a delay
  useEffect(() => {
    if (hasStartedRef.current) return;

    const isMobile = typeof window !== "undefined" && window.innerWidth < 768;
    if (isMobile) return;

    const timer = setTimeout(() => {
      setCurrentStep(0);
      setIsOpen(true);
      hasStartedRef.current = true;
    }, 1500);

    return () => clearTimeout(timer);
  }, [setIsOpen, setCurrentStep]);

  // Track when tour closes to call onComplete
  useEffect(() => {
    if (hasStartedRef.current && !isOpen) {
      onComplete();
    }
  }, [isOpen, onComplete]);

  return null;
}

/**
 * Reusable keyboard shortcut component
 */
function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="px-1.5 py-0.5 text-xs font-semibold rounded bg-black/10 dark:bg-white/10 border border-current/20">
      {children}
    </kbd>
  );
}

/**
 * Tour steps configuration
 * Focused on power-user features users won't discover on their own
 */
const TOUR_STEPS = [
  {
    selector: '[data-tour="sidebar"]',
    content: (
      <div className="space-y-2">
        <p className="font-semibold">Command Bar</p>
        <p className="text-sm opacity-80">
          Navigate anywhere with <Kbd>Ctrl+K</Kbd>. Search conversations
          semantically, change themes, open settings, jump to templates —
          everything&apos;s a keystroke away.
        </p>
      </div>
    ),
    position: "right" as const,
  },
  {
    selector: '[data-tour="input"]',
    content: (
      <div className="space-y-2">
        <p className="font-semibold">Built for Speed</p>
        <p className="text-sm opacity-80">
          <Kbd>Alt+N</Kbd> starts a new chat, <Kbd>Cmd+J</Kbd> switches models
          instantly, <Kbd>Cmd+;</Kbd> applies a template. No clicking required.
        </p>
      </div>
    ),
    position: "top" as const,
  },
  {
    selector: '[data-tour="model-selector"]',
    content: (
      <div className="space-y-2">
        <p className="font-semibold">blah Remembers</p>
        <p className="text-sm opacity-80">
          Important details are remembered across all your chats. Ask blah to
          recall something from a past conversation, or tell it to remember (or
          forget) specific facts.
        </p>
      </div>
    ),
    position: "bottom" as const,
  },
  {
    selector: '[data-tour="comparison"]',
    content: (
      <div className="space-y-2">
        <p className="font-semibold">Built-in Tools</p>
        <p className="text-sm opacity-80">
          Need to run code? Search the web? blah has built-in tools for Python,
          JavaScript, web search, and more — just ask.
        </p>
      </div>
    ),
    position: "bottom" as const,
  },
  {
    selector: '[data-tour="projects"]',
    content: (
      <div className="space-y-2">
        <p className="font-semibold">Projects</p>
        <p className="text-sm opacity-80">
          Group related conversations, notes, tasks, and files together. Perfect
          for keeping context organized across longer efforts.
        </p>
      </div>
    ),
    position: "right" as const,
  },
  {
    selector: '[data-tour="feedback"]',
    content: (
      <div className="space-y-2">
        <p className="font-semibold">We&apos;re Listening</p>
        <p className="text-sm opacity-80">
          Found a bug? Have an idea? The feedback button is always here. We read
          every message.
        </p>
      </div>
    ),
    position: "bottom" as const,
  },
  {
    // Final step - no selector, appears centered
    selector: "body",
    content: (
      <div className="space-y-2 text-center">
        <p className="font-semibold">You&apos;re Ready</p>
        <p className="text-sm opacity-80">
          That&apos;s the highlights. Explore the sidebar, try the shortcuts,
          and make blah work the way you think.
        </p>
      </div>
    ),
    position: "center" as const,
  },
];

/**
 * Onboarding tour component using @reactour/tour
 * React 19 compatible replacement for react-joyride
 */
export function OnboardingTour({ children }: { children: React.ReactNode }) {
  const { isDarkMode, isLoaded: themeLoaded } = useDarkMode();

  // @ts-ignore - TypeScript recursion limit with 85+ Convex modules
  const onboarding = useQuery(api.onboarding.getOnboardingState);
  const initializeOnboarding = useMutation(api.onboarding.initializeOnboarding);
  const completeTour = useMutation(api.onboarding.completeTour);

  const hasCompletedRef = useRef(false);

  // Initialize onboarding if needed
  useEffect(() => {
    if (onboarding === undefined) return;
    if (onboarding === null) {
      initializeOnboarding();
    }
  }, [onboarding, initializeOnboarding]);

  // Handle tour completion - called when tour closes
  const handleTourComplete = useCallback(() => {
    if (hasCompletedRef.current) return;
    hasCompletedRef.current = true;
    completeTour({ skipped: false });
  }, [completeTour]);

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

  // Don't render TourProvider at all if onboarding is completed/skipped
  // This completely removes any tour-related event listeners
  if (onboarding && (onboarding.tourCompleted || onboarding.tourSkipped)) {
    return <>{children}</>;
  }

  // If still loading onboarding state, render children without tour
  if (onboarding === undefined) {
    return <>{children}</>;
  }

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
      disableFocusLock
      onClickMask={() => {}}
    >
      <TourController onComplete={handleTourComplete} />
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
