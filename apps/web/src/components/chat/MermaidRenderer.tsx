"use client";

import { Copy, Download, Maximize2, Minimize2 } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

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

  // Determine if we're in dark mode
  const isDark =
    resolvedTheme === "dark" ||
    (theme === "system" && resolvedTheme === "dark");

  useEffect(() => {
    const initializeMermaid = async () => {
      const mermaid = await getMermaid();
      if (!mermaidInitialized) {
        mermaid.initialize({
          startOnLoad: false,
          theme: config?.theme || "base",
          themeVariables: config?.themeVariables || {},
          flowchart: config?.flowchart || {
            nodeSpacing: 50,
            rankSpacing: 50,
            curve: "basis",
          },
          sequence: config?.sequence || {
            actorMargin: 50,
            boxMargin: 10,
            boxTextMargin: 5,
            diagramMarginX: 50,
            diagramMarginY: 10,
            messageMargin: 35,
          },
          state: config?.state || { titleTopMargin: 25 },
        });
        mermaidInitialized = true;
      }
    };

    initializeMermaid();
  }, [config]);

  useEffect(() => {
    const renderDiagram = async () => {
      try {
        setError(null);
        setIsLoading(true);

        const mermaid = await getMermaid();

        // Get theme-specific colors
        const themeVars = isDark
          ? {
              // Dark mode colors
              primaryColor: "#d4a574", // warm gold (same)
              primaryTextColor: "#e8dfd4", // light beige text
              primaryBorderColor: "#e89f5f", // bright orange border
              lineColor: "#b8b8b8", // lighter gray lines
              secondaryColor: "#3d3d3d", // dark gray
              tertiaryColor: "#e89f5f", // deep orange
              background: "#1a1a1a", // dark background
              mainBkg: "#2d2d2d", // dark card bg
              secondBkg: "#3d3d3d", // darker muted bg
              textColor: "#e8dfd4", // light text
              nodeBorder: "#d4a574", // gold borders
              clusterBkg: "#2d2d2d", // dark cluster background
              clusterBorder: "#b88a5f", // darker gold cluster border
              edgeLabelBackground: "#2d2d2d", // dark edge label bg
            }
          : {
              // Light mode colors
              primaryColor: "#d4a574",
              primaryTextColor: "#2d2d2d",
              primaryBorderColor: "#b88a5f",
              lineColor: "#8b8b8b",
              secondaryColor: "#e8dfd4",
              tertiaryColor: "#e89f5f",
              background: "#f0ebe5",
              mainBkg: "#fdfcfb",
              secondBkg: "#e8dfd4",
              textColor: "#2d2d2d",
            };

        // Re-initialize mermaid with theme-specific colors
        mermaid.initialize({
          startOnLoad: false,
          theme: "base",
          themeVariables: { ...themeVars, ...config?.themeVariables },
          flowchart: config?.flowchart || {
            nodeSpacing: 50,
            rankSpacing: 50,
            curve: "basis",
          },
          sequence: config?.sequence || {
            actorMargin: 50,
            boxMargin: 10,
            boxTextMargin: 5,
            diagramMarginX: 50,
            diagramMarginY: 10,
            messageMargin: 35,
          },
          state: config?.state || { titleTopMargin: 25 },
        });

        const id = `mermaid-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
        const { svg: renderedSvg } = await mermaid.render(id, code);
        setSvg(renderedSvg);
      } catch (err) {
        console.error("[MermaidRenderer] Render error:", err);
        setError(
          err instanceof Error ? err.message : "Failed to render diagram",
        );
      } finally {
        setIsLoading(false);
      }
    };

    if (code) {
      renderDiagram();
    }
  }, [code, isDark, config]);

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
          <div dangerouslySetInnerHTML={{ __html: svg }} />
        )}
      </div>
    </div>
  );
}
