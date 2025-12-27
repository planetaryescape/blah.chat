"use client";

import { useEffect, useRef } from "react";
import { trackMathRendering } from "@/lib/analytics/mathMetrics";
import { getDescription } from "@/lib/math/descriptions";

/**
 * Enhances KaTeX-rendered math elements with ARIA accessibility attributes
 * Works with Streamdown's built-in math rendering (rehype-katex)
 *
 * Phase 4C enhancements:
 * - 50+ semantic patterns (vs original 27)
 * - Inline math support
 * - Streaming aria-live regions
 * - MathML enhancement layer
 */
export function useMathAccessibility<T extends HTMLElement = HTMLElement>(
  containerRef: React.RefObject<T | null>,
  isStreaming = false,
) {
  const processedElementsRef = useRef<Set<Element>>(new Set());

  useEffect(() => {
    if (!containerRef.current) return;

    // Find all KaTeX rendered elements (both inline and display)
    const mathElements = containerRef.current.querySelectorAll(
      ".katex-display, .katex:not(.katex-display)",
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
      const endTracking = trackMathRendering(latex, displayMode, isStreaming);

      // Get semantic description (50+ patterns)
      const description = getDescription(latex);

      // Add ARIA attributes
      element.setAttribute("role", "math");
      element.setAttribute("aria-label", description);

      // Add streaming support (NEW in Phase 4C)
      if (isStreaming) {
        element.setAttribute("aria-live", "polite");
        element.setAttribute("aria-atomic", "true");
      }

      // Validate MathML presence (critical for screen readers)
      const hasMathML = element.querySelector("math");
      if (!hasMathML) {
        console.warn(
          "[Accessibility] MathML not found - ensure KaTeX output: 'htmlAndMathml' is set",
        );
      }

      // MathML enhancement for browsers that support it (NEW in Phase 4C)
      if ("MathMLElement" in window && !hasMathML && latex) {
        try {
          // Create visible MathML for enhanced screen reader support using safe DOM methods
          const mathWrapper = document.createElement("span");
          mathWrapper.setAttribute("aria-hidden", "true");
          mathWrapper.style.position = "absolute";
          mathWrapper.style.clip = "rect(1px, 1px, 1px, 1px)";

          const mathElement = document.createElementNS(
            "http://www.w3.org/1998/Math/MathML",
            "math",
          );
          const annotationElement = document.createElementNS(
            "http://www.w3.org/1998/Math/MathML",
            "annotation",
          );
          annotationElement.setAttribute("encoding", "application/x-tex");
          annotationElement.textContent = latex; // Safe - using textContent

          mathElement.appendChild(annotationElement);
          mathWrapper.appendChild(mathElement);
          element.appendChild(mathWrapper);
        } catch (error) {
          // MathML enhancement errors are non-critical
          console.debug("[Accessibility] MathML enhancement failed", error);
        }
      }

      processedElementsRef.current.add(element);

      // End tracking (measure total processing time)
      endTracking();
    });
  }, [containerRef, isStreaming]);
}
