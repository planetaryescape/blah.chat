"use client";

import { useEffect, useRef, useState } from "react";

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
const KEYBOARD_ANIMATION_DELAY = 300;

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
  const wasVisibleRef = useRef(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    if (!isIOS()) return;

    const viewport = window.visualViewport;
    if (!viewport) return;

    const scrollInputIntoView = () => {
      if (!inputRef?.current || !mountedRef.current) return;

      setTimeout(() => {
        if (!mountedRef.current) return;
        inputRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }, KEYBOARD_ANIMATION_DELAY);
    };

    const handleResize = () => {
      if (!mountedRef.current) return;

      const windowHeight = window.innerHeight;
      const viewportHeight = viewport.height;
      const heightDiff = windowHeight - viewportHeight;

      const keyboardVisible = heightDiff > KEYBOARD_THRESHOLD;
      const keyboardHeight = keyboardVisible ? heightDiff : 0;

      const wasVisible = wasVisibleRef.current;
      if (
        keyboardVisible !== wasVisible ||
        keyboardHeight !== lastHeightRef.current
      ) {
        wasVisibleRef.current = keyboardVisible;
        lastHeightRef.current = keyboardHeight;
        setState({ keyboardVisible, keyboardHeight });

        if (keyboardVisible && !wasVisible) {
          onKeyboardShow?.(keyboardHeight);
          scrollInputIntoView();
        } else if (!keyboardVisible && wasVisible) {
          onKeyboardHide?.();
        }
      }
    };

    viewport.addEventListener("resize", handleResize);
    viewport.addEventListener("scroll", handleResize);

    handleResize();

    return () => {
      mountedRef.current = false;
      viewport.removeEventListener("resize", handleResize);
      viewport.removeEventListener("scroll", handleResize);
    };
  }, [inputRef, onKeyboardShow, onKeyboardHide]);

  return state;
}
