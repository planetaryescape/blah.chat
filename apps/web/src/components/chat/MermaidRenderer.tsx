"use client";

import { Copy, Download, Maximize2, Minimize2 } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { fixMermaidSyntax } from "@/lib/utils/mermaidFixer";

interface MermaidRendererProps {
  code: string;
  config?: {
    theme?: "base" | "default" | "dark" | "forest" | "neutral";
    themeVariables?: Record<string, string>;
    flowchart?: Record<string, unknown>;
    sequence?: Record<string, unknown>;
    state?: Record<string, unknown>;
  };
}

// Lazy-loaded mermaid instance
let mermaidModule: typeof import("mermaid") | null = null;
let mermaidInitialized = false;

/**
 * Load mermaid dynamically to reduce initial bundle size (~72MB -> 0 on initial load)
 */
async function getMermaid() {
  if (!mermaidModule) {
    mermaidModule = await import("mermaid");
  }
  return mermaidModule.default;
}

/**
 * Manual Mermaid diagram renderer with custom controls
 * Provides fullscreen, download, and copy functionality matching Streamdown's design
 * Automatically adapts theme colors based on light/dark mode
 *
 * Performance: Mermaid is dynamically imported to avoid 400KB+ initial bundle cost
 */
export function MermaidRenderer({ code, config }: MermaidRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [copied, setCopied] = useState(false);
  const { theme, resolvedTheme } = useTheme();

  // Debounce: wait for code to stabilize before rendering (prevents errors during streaming)
  const [stableCode, setStableCode] = useState<string | null>(null);
  const [isWaitingForStable, setIsWaitingForStable] = useState(true);

  // Debounce effect: only render after code hasn't changed for 300ms
  useEffect(() => {
    setIsWaitingForStable(true);
    const timeout = setTimeout(() => {
      setStableCode(code);
      setIsWaitingForStable(false);
    }, 300);

    return () => clearTimeout(timeout);
  }, [code]);

  // Determine if we're in dark mode
  const isDark =
    resolvedTheme === "dark" ||
    (theme === "system" && resolvedTheme === "dark");

  useEffect(() => {
    const initializeMermaid = async () => {
      const mermaid = await getMermaid();
      if (!mermaidInitialized) {
        // Minimal initialization - full config happens during render
        mermaid.initialize({
          startOnLoad: false,
          theme: "base",
          suppressErrorRendering: true, // Handle errors manually with custom UI
        });
        mermaidInitialized = true;
      }
    };

    initializeMermaid();
  }, []);

  useEffect(() => {
    const renderDiagram = async () => {
      // Guard against race condition where stableCode becomes null between check and render
      if (!stableCode) return;

      try {
        setError(null);
        setIsLoading(true);

        const mermaid = await getMermaid();

        // Use built-in Mermaid themes without color overrides
        const theme = isDark ? "dark" : "default";

        // Minimal theme overrides: improve text contrast in dark mode
        const themeVars = isDark
          ? {
              // Dark mode: make text brighter/more visible (default uses #ccc)
              primaryTextColor: "#ffffff",
              secondaryTextColor: "#ffffff",
              tertiaryTextColor: "#ffffff",
              textColor: "#ffffff",
              nodeTextColor: "#ffffff",
              labelTextColor: "#ffffff",
              actorTextColor: "#ffffff",
              signalTextColor: "#ffffff",
              ...config?.themeVariables,
            }
          : config?.themeVariables || {};

        // Re-initialize mermaid with minimal config - let Mermaid handle colors
        mermaid.initialize({
          startOnLoad: false,
          theme,
          suppressErrorRendering: true, // Handle errors manually with custom UI
          themeVariables: themeVars,
          flowchart: config?.flowchart || {
            nodeSpacing: 50,
            rankSpacing: 50,
            curve: "basis",
            padding: 15,
          },
          sequence: config?.sequence || {
            actorMargin: 50,
            boxMargin: 10,
            boxTextMargin: 5,
            diagramMarginX: 50,
            diagramMarginY: 10,
            messageMargin: 35,
          },
          state: config?.state || {
            titleTopMargin: 25,
            padding: 15,
          },
        });

        const id = `mermaid-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;

        // Auto-fix common LLM-generated syntax errors
        const fixedCode = fixMermaidSyntax(stableCode);

        try {
          // Try rendering with fixed code
          const { svg: renderedSvg } = await mermaid.render(id, fixedCode);
          setSvg(renderedSvg);
        } catch (fixedError) {
          console.error(
            "[MermaidRenderer] Fixed code failed to render:",
            fixedError,
          );
          // Fallback: try original code if fix caused issues
          try {
            const { svg: renderedSvg } = await mermaid.render(id, stableCode);
            setSvg(renderedSvg);
          } catch (originalError) {
            console.error(
              "[MermaidRenderer] Original code also failed to render:",
              originalError,
            );
            throw originalError;
          }
        }
      } catch (err) {
        // Error is caught - show clean error UI (suppressErrorRendering prevents error SVG)
        setError(
          err instanceof Error ? err.message : "Failed to render diagram",
        );
      } finally {
        setIsLoading(false);
      }
    };

    if (stableCode) {
      renderDiagram();
    }
  }, [stableCode, isDark, config]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("[MermaidRenderer] Copy failed:", err);
    }
  };

  const handleDownload = () => {
    if (!svg) return;

    const blob = new Blob([svg], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `diagram-${Date.now()}.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const toggleFullscreen = () => {
    if (!isFullscreen) {
      containerRef.current?.requestFullscreen?.();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.();
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () =>
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  // Show placeholder while waiting for code to stabilize (during streaming)
  if (isWaitingForStable || !stableCode) {
    return (
      <div className="my-4 rounded border border-border bg-card">
        <div className="flex items-center gap-2 p-4 text-muted-foreground text-sm">
          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          Generating diagram...
        </div>
        <pre className="p-4 text-xs text-muted-foreground overflow-x-auto bg-muted/30 max-h-[200px]">
          {code}
        </pre>
      </div>
    );
  }

  if (error) {
    return (
      <div className="my-4 rounded border border-destructive/50 bg-destructive/10 p-4">
        <div className="flex items-center gap-2 text-sm font-medium text-destructive mb-2">
          <span>Mermaid Diagram Error</span>
        </div>
        <pre className="text-xs text-muted-foreground overflow-x-auto">
          {error}
        </pre>
        <details className="mt-2">
          <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
            Show diagram code
          </summary>
          <pre className="mt-2 text-xs text-muted-foreground overflow-x-auto bg-muted/50 p-2 rounded">
            {code}
          </pre>
        </details>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative group my-4 rounded border border-border bg-card",
        isFullscreen && "bg-background p-8",
      )}
    >
      {/* Controls toolbar */}
      <div
        className={cn(
          "absolute top-2 right-2 z-10 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity",
          isFullscreen && "opacity-100",
        )}
      >
        <button
          type="button"
          onClick={handleCopy}
          className="p-1.5 rounded bg-background/90 hover:bg-background border border-border text-muted-foreground hover:text-foreground transition-colors"
          title={copied ? "Copied!" : "Copy code"}
        >
          <Copy className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={handleDownload}
          className="p-1.5 rounded bg-background/90 hover:bg-background border border-border text-muted-foreground hover:text-foreground transition-colors"
          title="Download as SVG"
        >
          <Download className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={toggleFullscreen}
          className="p-1.5 rounded bg-background/90 hover:bg-background border border-border text-muted-foreground hover:text-foreground transition-colors"
          title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
        >
          {isFullscreen ? (
            <Minimize2 className="w-4 h-4" />
          ) : (
            <Maximize2 className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Diagram container */}
      <div
        className={cn(
          "flex items-center justify-center p-6 overflow-auto min-h-[100px]",
          isFullscreen && "h-full",
        )}
      >
        {isLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            Loading diagram...
          </div>
        ) : (
          <div
            className="w-full [&>svg]:w-full [&>svg]:h-auto [&>svg]:max-w-full"
            dangerouslySetInnerHTML={{ __html: svg }}
          />
        )}
      </div>
    </div>
  );
}
