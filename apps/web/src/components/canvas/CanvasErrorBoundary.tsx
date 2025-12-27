"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";
import { Component, type ReactNode } from "react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class CanvasErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Canvas error:", error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="h-full flex flex-col items-center justify-center gap-4 p-8 text-center">
            <AlertTriangle className="w-12 h-12 text-destructive" />
            <div>
              <h3 className="font-semibold mb-1">Something went wrong</h3>
              <p className="text-sm text-muted-foreground mb-4">
                The Canvas editor encountered an error.
              </p>
              <p className="text-xs text-muted-foreground font-mono mb-4 max-w-md break-all">
                {this.state.error?.message}
              </p>
            </div>
            <Button onClick={this.handleRetry} variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
          </div>
        )
      );
    }

    return this.props.children;
  }
}
