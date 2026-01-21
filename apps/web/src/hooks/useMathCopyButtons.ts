"use client";

import { useEffect, useRef } from "react";
import { analytics } from "@/lib/analytics";

/**
 * Enhances KaTeX-rendered math elements with copy-to-clipboard buttons
 * Works with Streamdown's built-in math rendering (rehype-katex)
 *
 * Phase 4D enhancements:
 * - Keyboard shortcuts (Cmd/Ctrl+C on focused equation)
 * - Inline math support (not just display)
 * - Multi-format clipboard (LaTeX + clean HTML + MathML)
 */
export function useMathCopyButtons<T extends HTMLElement = HTMLElement>(
  containerRef: React.RefObject<T | null>,
) {
  const addedButtonsRef = useRef<Set<Element>>(new Set());
  const feedbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (feedbackTimeoutRef.current) {
        clearTimeout(feedbackTimeoutRef.current);
      }
    };
  }, []);

  // Keyboard shortcut handler
  useEffect(() => {
    const handleKeydown = (e: KeyboardEvent) => {
      // Cmd/Ctrl+C on focused math element
      if ((e.metaKey || e.ctrlKey) && e.key === "c") {
        const target = e.target as HTMLElement;
        if (
          target.classList.contains("katex") ||
          target.classList.contains("katex-display")
        ) {
          const annotation = target.querySelector(
            'annotation[encoding="application/x-tex"]',
          );
          const latex = annotation?.textContent;
          if (latex) {
            e.preventDefault();
            copyToClipboard(latex, target);
          }
        }
      }
    };

    document.addEventListener("keydown", handleKeydown);
    return () => document.removeEventListener("keydown", handleKeydown);
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;

    // Find all math elements (display + inline)
    const displayMath = containerRef.current.querySelectorAll(".katex-display");
    const inlineMath = containerRef.current.querySelectorAll(
      ".katex:not(.katex-display)",
    );

    // Process display math with visible buttons
    displayMath.forEach((mathElement) => {
      if (addedButtonsRef.current.has(mathElement)) return;

      const annotation = mathElement.querySelector(
        'annotation[encoding="application/x-tex"]',
      );
      const latexSource = annotation?.textContent || "";
      if (!latexSource) return;

      // Wrap in interactive container
      const wrapper = document.createElement("div");
      wrapper.className = "group relative";

      mathElement.parentNode?.insertBefore(wrapper, mathElement);
      wrapper.appendChild(mathElement);

      // Create copy button
      const button = document.createElement("button");
      button.className =
        "absolute right-2 top-2 h-8 w-8 flex items-center justify-center rounded-md border border-border bg-background opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 hover:bg-accent hover:text-accent-foreground";
      button.setAttribute("aria-label", "Copy LaTeX source");
      button.setAttribute("type", "button");

      const copyIcon = createCopyIcon();
      const checkIcon = createCheckIcon();
      button.appendChild(copyIcon);
      button.appendChild(checkIcon);

      button.addEventListener("click", async (e) => {
        e.preventDefault();
        e.stopPropagation();
        await copyToClipboard(latexSource, mathElement);

        // Visual feedback with cleanup
        copyIcon.classList.add("hidden");
        checkIcon.classList.remove("hidden");

        // Clear previous timeout to prevent accumulation on rapid clicks
        if (feedbackTimeoutRef.current) {
          clearTimeout(feedbackTimeoutRef.current);
        }
        feedbackTimeoutRef.current = setTimeout(() => {
          copyIcon.classList.remove("hidden");
          checkIcon.classList.add("hidden");
        }, 2000);
      });

      wrapper.appendChild(button);
      addedButtonsRef.current.add(mathElement);
    });

    // Process inline math with focus support
    inlineMath.forEach((mathElement) => {
      if (addedButtonsRef.current.has(mathElement)) return;

      const annotation = mathElement.querySelector(
        'annotation[encoding="application/x-tex"]',
      );
      const latexSource = annotation?.textContent || "";
      if (!latexSource) return;

      // Make inline math focusable for keyboard copy
      mathElement.setAttribute("tabindex", "0");
      mathElement.setAttribute("role", "button");
      mathElement.setAttribute("aria-label", `Math: ${latexSource}`);

      // Add inline copy button (shows on hover/focus)
      const button = document.createElement("button");
      button.className = "inline-math-copy";
      button.setAttribute("aria-label", "Copy LaTeX");
      button.setAttribute("type", "button");

      const copyIcon = createCopyIcon();
      button.appendChild(copyIcon);

      button.addEventListener("click", async (e) => {
        e.preventDefault();
        e.stopPropagation();
        await copyToClipboard(latexSource, mathElement);
      });

      mathElement.appendChild(button);
      addedButtonsRef.current.add(mathElement);
    });
  }, [containerRef]);
}

/**
 * Copy LaTeX to clipboard with multi-format support
 */
async function copyToClipboard(latex: string, element: Element): Promise<void> {
  const isDisplay = element.classList.contains("katex-display");

  try {
    // Prepare formats
    const wrappedLatex = isDisplay ? `$$${latex}$$` : `\\(${latex}\\)`;

    // Clean HTML (remove background gradients, keep structure)
    const katexHtml = element.querySelector(".katex-html");
    const cleanHtml = katexHtml
      ? isDisplay
        ? `<div class="math-display">${katexHtml.innerHTML}</div>`
        : `<span class="math-inline">${katexHtml.innerHTML}</span>`
      : "";

    // Multi-format clipboard
    if (navigator.clipboard && ClipboardItem) {
      const items: Record<string, Blob> = {
        "text/plain": new Blob([wrappedLatex], { type: "text/plain" }),
      };

      if (cleanHtml) {
        items["text/html"] = new Blob([cleanHtml], { type: "text/html" });
      }

      // Optional: MathML for compatible apps
      if ("MathMLElement" in window && latex) {
        try {
          const mathml = `<math><annotation encoding="application/x-tex">${latex}</annotation></math>`;
          items["application/mathml+xml"] = new Blob([mathml], {
            type: "application/mathml+xml",
          });
        } catch {
          // MathML generation failed - non-critical
        }
      }

      await navigator.clipboard.write([new ClipboardItem(items)]);
    } else {
      // Fallback to plain text
      await navigator.clipboard.writeText(wrappedLatex);
    }

    // Track analytics
    analytics.track("math_copied", {
      format: cleanHtml ? "both" : "latex",
      equationLength: latex.length,
    });
  } catch (error) {
    console.error("Failed to copy math:", error);
    // Final fallback
    try {
      await navigator.clipboard.writeText(
        isDisplay ? `$$${latex}$$` : `\\(${latex}\\)`,
      );
    } catch (fallbackError) {
      console.error("Fallback copy failed:", fallbackError);
    }
  }
}

/**
 * Handle copy with visual feedback
 */
async function _handleCopy(
  latex: string,
  element: Element,
  copyIcon: SVGSVGElement,
  checkIcon: SVGSVGElement,
  _isDisplay: boolean,
): Promise<void> {
  await copyToClipboard(latex, element);

  // Visual feedback
  copyIcon.classList.add("hidden");
  checkIcon.classList.remove("hidden");

  setTimeout(() => {
    copyIcon.classList.remove("hidden");
    checkIcon.classList.add("hidden");
  }, 2000);
}

/**
 * Create copy icon SVG using safe DOM methods
 */
function createCopyIcon(): SVGSVGElement {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("width", "16");
  svg.setAttribute("height", "16");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", "2");
  svg.setAttribute("stroke-linecap", "round");
  svg.setAttribute("stroke-linejoin", "round");
  svg.classList.add("copy-icon");

  const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  rect.setAttribute("width", "14");
  rect.setAttribute("height", "14");
  rect.setAttribute("x", "8");
  rect.setAttribute("y", "8");
  rect.setAttribute("rx", "2");
  rect.setAttribute("ry", "2");

  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute(
    "d",
    "M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2",
  );

  svg.appendChild(rect);
  svg.appendChild(path);

  return svg;
}

/**
 * Create check icon SVG using safe DOM methods
 */
function createCheckIcon(): SVGSVGElement {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("width", "16");
  svg.setAttribute("height", "16");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", "2");
  svg.setAttribute("stroke-linecap", "round");
  svg.setAttribute("stroke-linejoin", "round");
  svg.classList.add("check-icon", "hidden", "text-green-500");

  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", "M20 6 9 17l-5-5");

  svg.appendChild(path);

  return svg;
}
