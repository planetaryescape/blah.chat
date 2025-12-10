"use client";

import { Component, type ReactNode } from "react";
import { analytics } from "@/lib/analytics";

interface MathErrorBoundaryProps {
  children: ReactNode;
  latex?: string; // Raw LaTeX for fallback display
}

interface MathErrorBoundaryState {
  hasError: boolean;
}

/**
 * Specialized error boundary for math rendering
 * Shows a plain text fallback if KaTeX rendering completely fails
 */
export class MathErrorBoundary extends Component<
  MathErrorBoundaryProps,
  MathErrorBoundaryState
> {
  constructor(props: MathErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): MathErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.warn(
      "[MathBlock] Render error caught by boundary:",
      error,
      errorInfo,
    );

    // Track error event (for specific math error tracking)
    analytics.track("math_error", {
      error: error.message,
      latexSnippet: this.props.latex?.slice(0, 100) || "",
      isStreaming: false,
    });

    // Also capture as exception (for comprehensive error monitoring)
    analytics.captureException(error, {
      severity: "warning", // Math errors are usually recoverable
      context: "math_rendering",
      componentStack: errorInfo.componentStack ?? undefined,
      latexSnippet: this.props.latex?.slice(0, 100) || "",
    });
  }

  render() {
    if (this.state.hasError) {
      // Fallback: render as plain text with error message
      return (
        <div className="math-error-fallback rounded-lg border border-destructive/50 bg-destructive/10 p-4 my-2">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-medium text-destructive">
              Math Rendering Error
            </span>
          </div>
          {this.props.latex && (
            <pre className="text-xs font-mono bg-background/50 p-2 rounded overflow-x-auto">
              {this.props.latex}
            </pre>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
