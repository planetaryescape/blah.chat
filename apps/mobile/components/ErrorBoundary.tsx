import { Component, type ErrorInfo, type ReactNode } from "react";
import { Text, View } from "react-native";
import { AnimatedPressable } from "@/components/ui/AnimatedPressable";
import { layout, palette, spacing, typography } from "@/lib/theme/designSystem";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.props.onError?.(error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <View
          style={{
            padding: spacing.md,
            backgroundColor: palette.glassLow,
            borderRadius: layout.radius.md,
            alignItems: "center",
            gap: spacing.sm,
          }}
        >
          <Text
            style={{
              fontFamily: typography.body,
              fontSize: 14,
              color: palette.error,
              textAlign: "center",
            }}
          >
            Something went wrong
          </Text>
          <AnimatedPressable
            onPress={this.handleRetry}
            style={{
              paddingHorizontal: spacing.md,
              paddingVertical: spacing.xs,
              borderRadius: layout.radius.sm,
              backgroundColor: palette.glassMedium,
            }}
          >
            <Text
              style={{
                fontFamily: typography.bodySemiBold,
                fontSize: 13,
                color: palette.starlight,
              }}
            >
              Try Again
            </Text>
          </AnimatedPressable>
        </View>
      );
    }

    return this.props.children;
  }
}
