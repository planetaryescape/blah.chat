"use client";

import { useEffect, useRef } from "react";
import { trackMathRendering } from "@/lib/analytics/mathMetrics";
import { getDescription } from "@/lib/math/descriptions";

/**
 * Enhances KaTeX-rendered math elements with ARIA accessibility attributes
 * Works with Streamdown's built-in math rendering (rehype-katex)
 *
 * Adds:
 * - role="math" for semantic HTML
 * - aria-label with equation type description
 * - Validates MathML presence for screen reader compatibility
 */
export function useMathAccessibility<T extends HTMLElement = HTMLElement>(
  containerRef: React.RefObject<T | null>,
) {
  const processedElementsRef = useRef<Set<Element>>(new Set());

  useEffect(() => {
    if (!containerRef.current) return;

    // Find all KaTeX rendered elements (both inline and display)
    const mathElements = containerRef.current.querySelectorAll(
      ".katex-display, .katex",
    );

    mathElements.forEach((element) => {
      // Skip if already processed
      if (processedElementsRef.current.has(element)) return;

      // Extract LaTeX from MathML annotation if available
      const annotation = element.querySelector(
        'annotation[encoding="application/x-tex"]',
      );
      const latex = annotation?.textContent || "";

      // Determine display mode
      const displayMode = element.classList.contains("katex-display");

      // Start performance tracking
      const endTracking = trackMathRendering(latex, displayMode, false);

      // Get semantic description
      const description = getAriaDescription(latex);

      // Add ARIA attributes
      element.setAttribute("role", "math");
      element.setAttribute("aria-label", description);

      // Validate MathML presence (critical for screen readers)
      const hasMathML = element.querySelector("math");
      if (!hasMathML) {
        console.warn(
          "[Accessibility] MathML not found - ensure KaTeX output: 'htmlAndMathml' is set",
        );
      }

      processedElementsRef.current.add(element);

      // End tracking (measure total processing time)
      endTracking();
    });
  }, [containerRef]);
}
