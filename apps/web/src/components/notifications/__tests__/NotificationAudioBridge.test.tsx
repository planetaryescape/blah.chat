import { render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NotificationAudioBridge } from "../NotificationAudioBridge";

const { mockPlay, mockUseQuery } = vi.hoisted(() => ({
  mockPlay: vi.fn(),
  mockUseQuery: vi.fn(),
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
});
