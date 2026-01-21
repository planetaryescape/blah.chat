import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock Worker class before importing module
class MockWorker {
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;
  listeners: Map<string, Set<EventListener>> = new Map();
  terminated = false;

  constructor(_url: URL, _options?: WorkerOptions) {
    // Simulate async ready signal
    setTimeout(() => {
      this.dispatchEvent("message", { data: { type: "ready" } });
    }, 0);
  }

  postMessage(message: { id: string; content: string }) {
    if (this.terminated) return;

    // Simulate async response
    setTimeout(() => {
      this.dispatchEvent("message", {
        data: {
          id: message.id,
          html: `<p>parsed: ${message.content}</p>`,
          duration: 10,
        },
      });
    }, 10);
  }

  addEventListener(type: string, listener: EventListener) {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type)!.add(listener);
  }

  removeEventListener(type: string, listener: EventListener) {
    this.listeners.get(type)?.delete(listener);
  }

  dispatchEvent(type: string, event: Partial<MessageEvent | ErrorEvent>) {
    const listeners = this.listeners.get(type);
    if (listeners) {
      for (const listener of listeners) {
        listener(event as Event);
      }
    }
  }

  terminate() {
    this.terminated = true;
    this.listeners.clear();
  }
}

// Install mock Worker globally
vi.stubGlobal("Worker", MockWorker);

// Now import the module (gets mocked Worker)
import { getMarkdownWorker, parseMarkdownInWorker } from "../worker-manager";

describe("MarkdownWorkerManager", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Reset singleton state between tests
    const worker = getMarkdownWorker();
    worker.terminate();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe("initialization", () => {
    it("initializes worker lazily on first parse", async () => {
      const worker = getMarkdownWorker();
      expect(worker.ready).toBe(false);

      const parsePromise = worker.parse("# Hello");
      await vi.runAllTimersAsync();
      await parsePromise;

      expect(worker.ready).toBe(true);
    });

    it("reuses existing worker for multiple parses", async () => {
      const worker = getMarkdownWorker();

      const parse1 = worker.parse("content 1");
      await vi.runAllTimersAsync();
      await parse1;

      const parse2 = worker.parse("content 2");
      await vi.runAllTimersAsync();
      const result = await parse2;

      expect(result).toBe("<p>parsed: content 2</p>");
    });
  });

  describe("parse()", () => {
    it("returns parsed HTML from worker", async () => {
      const result = parseMarkdownInWorker("# Hello");
      await vi.runAllTimersAsync();

      expect(await result).toBe("<p>parsed: # Hello</p>");
    });

    it("handles concurrent parse requests", async () => {
      const results = Promise.all([
        parseMarkdownInWorker("content A"),
        parseMarkdownInWorker("content B"),
      ]);

      await vi.runAllTimersAsync();
      const [a, b] = await results;

      expect(a).toBe("<p>parsed: content A</p>");
      expect(b).toBe("<p>parsed: content B</p>");
    });
  });

  describe("timeout handling", () => {
    it("returns null on worker timeout", async () => {
      // Create a worker that never responds
      class SlowWorker extends MockWorker {
        postMessage() {
          // Never responds
        }
      }
      vi.stubGlobal("Worker", SlowWorker);

      // Reset to get new worker with slow implementation
      const worker = getMarkdownWorker();
      worker.terminate();

      const parsePromise = parseMarkdownInWorker("slow content");

      // Advance past timeout (5s)
      await vi.advanceTimersByTimeAsync(6000);

      // Should return null (fallback)
      const result = await parsePromise;
      expect(result).toBeNull();
    });
  });

  describe("fallback behavior", () => {
    it("returns null when workers not supported", async () => {
      // Remove Worker from global
      vi.stubGlobal("Worker", undefined);

      const worker = getMarkdownWorker();
      worker.terminate();

      const result = await parseMarkdownInWorker("content");
      expect(result).toBeNull();

      // Restore
      vi.stubGlobal("Worker", MockWorker);
    });
  });

  describe("terminate()", () => {
    it("resets ready state on terminate", async () => {
      const worker = getMarkdownWorker();

      // Initialize worker
      const parsePromise = worker.parse("content");
      await vi.runAllTimersAsync();
      await parsePromise;

      expect(worker.ready).toBe(true);

      // Terminate
      worker.terminate();
      expect(worker.ready).toBe(false);
    });

    it("allows re-initialization after terminate", async () => {
      const worker = getMarkdownWorker();

      // Initialize
      const first = worker.parse("first");
      await vi.runAllTimersAsync();
      await first;

      // Terminate
      worker.terminate();
      expect(worker.ready).toBe(false);

      // Re-initialize by parsing again
      const second = worker.parse("second");
      await vi.runAllTimersAsync();
      const result = await second;

      expect(worker.ready).toBe(true);
      expect(result).toBe("<p>parsed: second</p>");
    });
  });

  describe("error handling", () => {
    it("logs worker errors to console", async () => {
      const consoleErrorSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      const worker = getMarkdownWorker();
      worker.terminate();

      // Initialize with normal worker
      const parsePromise = worker.parse("content");
      await vi.runAllTimersAsync();
      await parsePromise;

      // Manually trigger error event on internal worker (simulating crash)
      // This tests that error handler is wired up
      const workerInstance = (worker as any).worker as MockWorker;
      workerInstance.dispatchEvent("error", { message: "Simulated crash" });

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "[WorkerManager] Worker error:",
        "Simulated crash",
      );

      consoleErrorSpy.mockRestore();
    });
  });

  describe("singleton", () => {
    it("getMarkdownWorker returns same instance", () => {
      const instance1 = getMarkdownWorker();
      const instance2 = getMarkdownWorker();
      expect(instance1).toBe(instance2);
    });
  });
});
