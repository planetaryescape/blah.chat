"use client";

import { useEffect, useRef, useState } from "react";

export function useTypewriter(text: string, speed = 50, delay = 500) {
  const [displayText, setDisplayText] = useState("");
  const [isComplete, setIsComplete] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const timeout = setTimeout(() => {
      let i = 0;
      intervalRef.current = setInterval(() => {
        if (i < text.length) {
          setDisplayText(text.slice(0, i + 1));
          i++;
        } else {
          if (intervalRef.current) clearInterval(intervalRef.current);
          setIsComplete(true);
        }
      }, speed);
    }, delay);

    return () => {
      clearTimeout(timeout);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [text, speed, delay]);

  return { displayText, isComplete };
}
