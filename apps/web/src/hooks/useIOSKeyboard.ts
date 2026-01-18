"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface IOSKeyboardState {
  keyboardVisible: boolean;
  keyboardHeight: number;
}

interface UseIOSKeyboardOptions {
  inputRef?: React.RefObject<HTMLElement | null>;
  onKeyboardShow?: (height: number) => void;
  onKeyboardHide?: () => void;
}

const KEYBOARD_THRESHOLD = 150;

function isIOS(): boolean {
  if (typeof window === "undefined") return false;
  const ua = navigator.userAgent;
  return (
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

export function useIOSKeyboard(
  options: UseIOSKeyboardOptions = {},
): IOSKeyboardState {
  const { inputRef, onKeyboardShow, onKeyboardHide } = options;
  const [state, setState] = useState<IOSKeyboardState>({
    keyboardVisible: false,
    keyboardHeight: 0,
  });

  const lastHeightRef = useRef(0);
  const isIOSDevice = useRef(false);

  const scrollInputIntoView = useCallback(() => {
    if (!inputRef?.current) return;

    requestAnimationFrame(() => {
      inputRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    });
  }, [inputRef]);

  useEffect(() => {
    isIOSDevice.current = isIOS();
    if (!isIOSDevice.current) return;

    const viewport = window.visualViewport;
    if (!viewport) return;

    const handleResize = () => {
      const windowHeight = window.innerHeight;
      const viewportHeight = viewport.height;
      const heightDiff = windowHeight - viewportHeight;

      const keyboardVisible = heightDiff > KEYBOARD_THRESHOLD;
      const keyboardHeight = keyboardVisible ? heightDiff : 0;

      if (
        keyboardVisible !== state.keyboardVisible ||
        keyboardHeight !== lastHeightRef.current
      ) {
        lastHeightRef.current = keyboardHeight;
        setState({ keyboardVisible, keyboardHeight });

        if (keyboardVisible) {
          onKeyboardShow?.(keyboardHeight);
          scrollInputIntoView();
        } else {
          onKeyboardHide?.();
        }
      }
    };

    viewport.addEventListener("resize", handleResize);
    viewport.addEventListener("scroll", handleResize);

    handleResize();

    return () => {
      viewport.removeEventListener("resize", handleResize);
      viewport.removeEventListener("scroll", handleResize);
    };
  }, [
    state.keyboardVisible,
    onKeyboardShow,
    onKeyboardHide,
    scrollInputIntoView,
  ]);

  return state;
}
