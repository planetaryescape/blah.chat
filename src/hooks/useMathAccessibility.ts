"use client";

import { useEffect, useRef } from "react";
import { trackMathRendering } from "@/lib/analytics/mathMetrics";

/**
 * Pattern-based LaTeX classification for ARIA descriptions
 * Analyzes LaTeX source to provide meaningful descriptions for screen readers
 */
function getAriaDescription(latex: string): string {
  // Integration and calculus
  if (latex.includes("\\int")) return "Integral expression";
  if (latex.includes("\\oint")) return "Contour integral";
  if (latex.includes("\\partial")) return "Partial derivative";
  if (latex.includes("\\nabla")) return "Gradient or del operator";

  // Summation and products
  if (latex.includes("\\sum")) return "Summation";
  if (latex.includes("\\prod")) return "Product";

  // Fractions and roots
  if (latex.includes("\\frac")) return "Fraction";
  if (latex.includes("\\sqrt")) return "Square root or radical";

  // Linear algebra
  if (
    latex.includes("matrix") ||
    latex.includes("pmatrix") ||
    latex.includes("bmatrix")
  )
    return "Matrix";
  if (latex.includes("\\det")) return "Determinant";
  if (latex.includes("\\vec")) return "Vector";

  // Limits and asymptotic notation
  if (latex.includes("\\lim")) return "Limit";
  if (latex.includes("\\infty")) return "Expression with infinity";

  // Sets and logic
  if (latex.includes("\\cup") || latex.includes("\\cap"))
    return "Set operation";
  if (latex.includes("\\subset") || latex.includes("\\supset"))
    return "Set inclusion";
  if (latex.includes("\\forall") || latex.includes("\\exists"))
    return "Logical quantifier";

  // Arrows and implications
  if (
    latex.includes("\\rightarrow") ||
    latex.includes("\\Rightarrow") ||
    latex.includes("\\to")
  )
    return "Implication or mapping";

  // Greek letters (common in probability/statistics)
  if (latex.includes("\\alpha") || latex.includes("\\beta"))
    return "Greek letter expression";
  if (latex.includes("\\theta") || latex.includes("\\phi"))
    return "Angle or parameter";
  if (latex.includes("\\mu") || latex.includes("\\sigma"))
    return "Statistical expression";

  // Chemistry (mhchem)
  if (latex.includes("\\ce")) return "Chemical formula or equation";
  if (latex.includes("\\pu")) return "Physical unit";

  // Fallback
  return "Mathematical expression";
}

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
