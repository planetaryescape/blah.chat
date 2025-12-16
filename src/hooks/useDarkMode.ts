"use client";

import { useEffect, useState } from "react";

/**
 * Custom hook to detect dark mode theme
 * Best practice for theme detection with proper SSR handling
 */
export function useDarkMode() {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Function to update theme state
    const updateTheme = () => {
      setIsDarkMode(document.documentElement.classList.contains("dark"));
      setIsLoaded(true);
    };

    // Initial theme detection
    updateTheme();

    // Listen for theme changes (for theme switcher, system changes, etc.)
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === "class") {
          updateTheme();
        }
      });
    });

    // Observe class changes on html element
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    // Cleanup
    return () => {
      observer.disconnect();
    };
  }, []);

  return { isDarkMode, isLoaded };
}

/**
 * Alternative: Simpler version if you don't need change detection
 */
export function useDarkModeSimple() {
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    // Only run on client
    if (typeof window !== "undefined") {
      setIsDarkMode(document.documentElement.classList.contains("dark"));
    }
  }, []);

  return isDarkMode;
}
