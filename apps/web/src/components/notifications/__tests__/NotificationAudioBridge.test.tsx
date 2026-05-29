import { render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NotificationAudioBridge } from "../NotificationAudioBridge";

const { mockPlay, mockUseQuery, mockConsoleWarn } = vi.hoisted(() => ({
  mockPlay: vi.fn(),
  mockUseQuery: vi.fn(),
  mockConsoleWarn: vi.fn(),
}));

vi.mock("@/hooks/useNotificationChimes", () => ({
  useNotificationChimes: () => ({ play: mockPlay }),
}));

vi.mock("@tanstack/react-query", () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
}));

describe("NotificationAudioBridge", () => {
  beforeEach(() => {
    mockPlay.mockClear();
    mockUseQuery.mockReset();
    mockConsoleWarn.mockClear();
    vi.spyOn(console, "warn").mockImplementation(mockConsoleWarn);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("rejects HTTP failures from the latest unread notification poll", async () => {
    let queryFn: (() => Promise<unknown>) | undefined;
    mockUseQuery.mockImplementation(
      (options: { queryFn: () => Promise<unknown> }) => {
        queryFn = options.queryFn;
        return {
          data: undefined,
          isError: false,
          status: "pending",
        };
      },
    );
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response("auth required", {
          status: 401,
          statusText: "Unauthorized",
        }),
      ),
    );

    render(<NotificationAudioBridge />);

    await expect(queryFn?.()).rejects.toThrow(
      "Failed to fetch latest unread notification (401 Unauthorized): auth required",
    );
  });

  it("plays the email arrival chime only after a newer unread email notification appears", async () => {
    mockUseQuery.mockReturnValue({
      data: {
        id: "email-1",
        type: "email_received",
        title: "New email",
        message: "Initial unread email",
        read: false,
        createdAt: 1,
      },
      isFetched: true,
      status: "success",
    });

    const { rerender } = render(<NotificationAudioBridge />);

    expect(mockPlay).not.toHaveBeenCalled();

    mockUseQuery.mockReturnValue({
      data: {
        id: "email-2",
        type: "email_received",
        title: "New email",
        message: "New unread email",
        read: false,
        createdAt: 2,
      },
      isFetched: true,
      status: "success",
    });

    rerender(<NotificationAudioBridge />);

    await waitFor(() => {
      expect(mockPlay).toHaveBeenCalledWith("emailReceived");
    });
  });

  it("does not chime for the first unread notification loaded after a pending query", () => {
    mockUseQuery.mockReturnValue({
      data: undefined,
      isFetched: false,
      status: "pending",
    });

    const { rerender } = render(<NotificationAudioBridge />);

    mockUseQuery.mockReturnValue({
      data: {
        id: "email-1",
        type: "email_received",
        title: "New email",
        message: "Existing unread email",
        read: false,
        createdAt: 1,
      },
      isFetched: true,
      status: "success",
    });

    rerender(<NotificationAudioBridge />);

    expect(mockPlay).not.toHaveBeenCalled();
  });

  it("logs poll failures without capturing baseline", async () => {
    mockUseQuery.mockReturnValue({
      data: undefined,
      error: new Error("401 Unauthorized"),
      isError: true,
      status: "error",
    });

    const { rerender } = render(<NotificationAudioBridge />);

    expect(mockConsoleWarn).toHaveBeenCalledWith(
      "Failed to poll latest unread notification",
      expect.objectContaining({ error: expect.any(Error) }),
    );

    mockUseQuery.mockReturnValue({
      data: {
        id: "email-1",
        type: "email_received",
        title: "New email",
        message: "First successful unread email",
        read: false,
        createdAt: 1,
      },
      isError: false,
      status: "success",
    });

    rerender(<NotificationAudioBridge />);

    expect(mockPlay).not.toHaveBeenCalled();

    mockUseQuery.mockReturnValue({
      data: {
        id: "email-2",
        type: "email_received",
        title: "New email",
        message: "New unread email",
        read: false,
        createdAt: 2,
      },
      isError: false,
      status: "success",
    });

    rerender(<NotificationAudioBridge />);

    await waitFor(() => {
      expect(mockPlay).toHaveBeenCalledWith("emailReceived");
    });
  });
});
