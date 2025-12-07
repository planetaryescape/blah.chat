"use client";

import { useEffect, useRef } from "react";
import { analytics } from "@/lib/analytics";

/**
 * Enhances KaTeX-rendered math elements with copy-to-clipboard buttons
 * Works with Streamdown's built-in math rendering (rehype-katex)
 *
 * Adds interactive copy buttons to display math equations
 * Extracts LaTeX source from MathML annotations
 */
export function useMathCopyButtons<T extends HTMLElement = HTMLElement>(
  containerRef: React.RefObject<T | null>,
) {
  const addedButtonsRef = useRef<Set<Element>>(new Set());

  useEffect(() => {
    if (!containerRef.current) return;

    // Find all display math blocks (skip inline)
    const mathElements =
      containerRef.current.querySelectorAll(".katex-display");

    mathElements.forEach((mathElement) => {
      // Skip if already enhanced
      if (addedButtonsRef.current.has(mathElement)) return;

      // Extract LaTeX source from MathML annotation
      const annotation = mathElement.querySelector(
        'annotation[encoding="application/x-tex"]',
      );
      const latexSource = annotation?.textContent || "";

      if (!latexSource) return;

      // Wrap in interactive container
      const wrapper = document.createElement("div");
      wrapper.className = "group relative";

      // Move math element into wrapper
      mathElement.parentNode?.insertBefore(wrapper, mathElement);
      wrapper.appendChild(mathElement);

      // Create copy button with safe DOM methods
      const button = document.createElement("button");
      button.className =
        "absolute right-2 top-2 h-8 w-8 flex items-center justify-center rounded-md border border-border bg-background opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 hover:bg-accent hover:text-accent-foreground";
      button.setAttribute("aria-label", "Copy LaTeX source");
      button.setAttribute("type", "button");

      // Create SVG icons using safe DOM methods
      const copyIcon = createCopyIcon();
      const checkIcon = createCheckIcon();

      button.appendChild(copyIcon);
      button.appendChild(checkIcon);

      // Copy handler
      button.addEventListener("click", async (e) => {
        e.preventDefault();
        e.stopPropagation();

        try {
          const wrappedSource = `$$${latexSource}$$`;

          // Try dual clipboard (plain + HTML)
          if (navigator.clipboard && ClipboardItem) {
            const katexHtml =
              mathElement.querySelector(".katex-html")?.innerHTML;

            if (katexHtml) {
              const htmlBlob = new Blob([katexHtml], { type: "text/html" });
              const textBlob = new Blob([wrappedSource], {
                type: "text/plain",
              });

              await navigator.clipboard.write([
                new ClipboardItem({
                  "text/plain": textBlob,
                  "text/html": htmlBlob,
                }),
              ]);
            } else {
              await navigator.clipboard.writeText(wrappedSource);
            }
          } else {
            await navigator.clipboard.writeText(wrappedSource);
          }

          // Visual feedback
          copyIcon.classList.add("hidden");
          checkIcon.classList.remove("hidden");

          setTimeout(() => {
            copyIcon.classList.remove("hidden");
            checkIcon.classList.add("hidden");
          }, 2000);

          // Track analytics
          analytics.track("math_copied", {
            format: "both",
            equationLength: latexSource.length,
          });
        } catch (error) {
          console.error("Failed to copy math:", error);
          // Fallback
          try {
            await navigator.clipboard.writeText(`$$${latexSource}$$`);
          } catch (fallbackError) {
            console.error("Fallback copy also failed:", fallbackError);
          }
        }
      });

      wrapper.appendChild(button);
      addedButtonsRef.current.add(mathElement);
    });
  }, [containerRef]);
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
