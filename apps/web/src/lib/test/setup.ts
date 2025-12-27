/**
 * Vitest test setup
 * Provides global mocks and test configuration
 * Conditionally applies browser mocks only in jsdom environment
 */
import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

// Mock Radix UI Tooltip - requires TooltipProvider context
vi.mock("@radix-ui/react-tooltip", () => ({
  Root: ({ children }: { children: unknown }) => children,
  Trigger: ({ children }: { children: unknown }) => children,
  Portal: ({ children }: { children: unknown }) => children,
  Content: ({ children }: { children: unknown }) => children,
  Provider: ({ children }: { children: unknown }) => children,
  Arrow: () => null,
}));

// Mock Next.js navigation - requires App Router context
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
  }),
  usePathname: () => "/chat/test-id",
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({ conversationId: "test-id" }),
}));

// Only mock browser APIs when running in jsdom environment
if (typeof window !== "undefined") {
  // Mock window.matchMedia for components that use media queries
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });

  // Mock ResizeObserver for components that use it
  global.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };

  // Mock IntersectionObserver for components that use it
  global.IntersectionObserver = class IntersectionObserver {
    readonly root: Element | null = null;
    readonly rootMargin: string = "";
    readonly thresholds: ReadonlyArray<number> = [];
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords(): IntersectionObserverEntry[] {
      return [];
    }
  };
}
