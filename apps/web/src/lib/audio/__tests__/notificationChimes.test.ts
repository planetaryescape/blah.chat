import { describe, expect, it } from "vitest";
import { resolveNotificationChime } from "../notificationChimes";

describe("resolveNotificationChime", () => {
  it("returns no chime when disabled and different configured chimes for sent and archived actions when enabled", () => {
    const sounds = {
      emailReceived: "arrival",
      emailSent: "sent",
      emailArchived: "archive",
      messageSent: "sent",
      conversationArchived: "archive",
      notification: "notify",
    } as const;

    expect(resolveNotificationChime("emailReceived", false, sounds)).toBeNull();
    expect(resolveNotificationChime("emailSent", true, sounds)).toBe("sent");
    expect(resolveNotificationChime("emailArchived", true, sounds)).toBe(
      "archive",
    );
  });
});
