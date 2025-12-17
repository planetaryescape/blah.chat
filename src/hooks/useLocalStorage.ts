"use client";

import { useEffect, useState } from "react";

/**
 * SSR-safe localStorage hook
 *
 * Returns default value during SSR and initial client render,
 * then loads from localStorage after hydration.
 *
 * @param key - localStorage key
 * @param defaultValue - default value to use during SSR and if localStorage is empty
 */
export default function useLocalStorage<T>(
  key: string,
  defaultValue: T,
): [T, (value: T) => void] {
  const [value, setValue] = useState<T>(defaultValue);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(key);
      if (saved !== null) {
        setValue(JSON.parse(saved));
      }
    } catch (error) {
      console.warn(`Failed to load localStorage key "${key}":`, error);
    }
  }, [key]);

  const setStoredValue = (newValue: T) => {
    try {
      setValue(newValue);
      localStorage.setItem(key, JSON.stringify(newValue));
    } catch (error) {
      console.warn(`Failed to save to localStorage key "${key}":`, error);
    }
  };

  return [value, setStoredValue];
}
