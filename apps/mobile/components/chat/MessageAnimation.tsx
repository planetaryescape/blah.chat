import type { PropsWithChildren } from "react";
import Animated, {
  FadeIn,
  FadeOut,
  SlideInDown,
  SlideInUp,
} from "react-native-reanimated";

interface MessageAnimationProps {
  index: number;
  isUser?: boolean;
}

export function MessageAnimation({
  children,
  index,
  isUser,
}: PropsWithChildren<MessageAnimationProps>) {
  // Stagger delay based on index, cap at 5 for performance
  const delay = Math.min(index, 5) * 50;

  return (
    <Animated.View
      entering={SlideInDown.delay(delay).duration(300).springify()}
      exiting={FadeOut.duration(150)}
    >
      {children}
    </Animated.View>
  );
}

// For new messages appearing at bottom
export function NewMessageAnimation({ children }: PropsWithChildren) {
  return (
    <Animated.View
      entering={SlideInUp.duration(250).springify()}
      exiting={FadeOut.duration(150)}
    >
      {children}
    </Animated.View>
  );
}

// For streaming content updates
export function StreamingAnimation({ children }: PropsWithChildren) {
  return (
    <Animated.View entering={FadeIn.duration(200)}>{children}</Animated.View>
  );
}
