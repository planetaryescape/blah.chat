import { describe, expect, it } from "vitest";
import { getComposioEmailNotification } from "../composioTools";

describe("getComposioEmailNotification", () => {
  it("maps successful Gmail send and archive tools to email chime notifications", () => {
    expect(getComposioEmailNotification("GMAIL_SEND_EMAIL")).toMatchObject({
      type: "email_sent",
      data: { chimeEvent: "emailSent" },
    });
    expect(getComposioEmailNotification("GMAIL_ARCHIVE_THREAD")).toMatchObject({
      type: "email_archived",
      data: { chimeEvent: "emailArchived" },
    });
  });

  it("ignores non-Gmail tools", () => {
    expect(getComposioEmailNotification("SLACK_SEND_MESSAGE")).toBeNull();
  });
});
