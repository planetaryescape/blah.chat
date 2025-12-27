"use client";

import { Component, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { analytics } from "@/lib/analytics";
import { classifyErrorSeverity, extractErrorContext } from "@/lib/errorUtils";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught error:", error, errorInfo);

    // Track error to PostHog
    try {
      const severity = classifyErrorSeverity(error, "react_render");
      const context = extractErrorContext(error, errorInfo);

      analytics.captureException(error, {
        severity,
        componentStack: errorInfo.componentStack ?? undefined,
        context: "react_render",
        ...context,
      });
    } catch (trackingError) {
      console.error("Failed to track error to PostHog:", trackingError);
    }
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex min-h-screen items-center justify-center p-4">
          <div className="max-w-md space-y-4 text-center">
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold">Something went wrong</h2>
              <p className="text-muted-foreground">
                An error occurred while rendering this page. Please try again.
              </p>
            </div>
            {this.state.error && (
              <details className="text-left text-sm">
                <summary className="cursor-pointer font-medium">
                  Error details
                </summary>
                <pre className="mt-2 overflow-auto rounded-lg bg-muted p-4">
                  {this.state.error.message}
                </pre>
              </details>
            )}
            <div className="flex gap-2 justify-center">
              <Button
                onClick={() => {
                  this.setState({ hasError: false });
                  window.location.reload();
                }}
              >
                Reload page
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  this.setState({ hasError: false });
                  window.location.href = "/";
                }}
              >
                Go home
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
