import { describe, expect, it } from "vitest";
import { getComposioEmailNotification } from "../composioTools";

describe("getComposioEmailNotification", () => {
  it("maps successful Gmail send and archive tools to email chime notifications", () => {
    expect(getComposioEmailNotification("GMAIL_SEND_EMAIL")).toMatchObject({
      type: "email_sent",
      data: { chimeEvent: "emailSent" },
    });
    expect(getComposioEmailNotification("GMAIL_REPLY_TO_THREAD")).toMatchObject(
      {
        type: "email_sent",
        title: "Email reply sent",
        data: { chimeEvent: "emailSent" },
      },
    );
    expect(getComposioEmailNotification("GMAIL_SEND_DRAFT")).toMatchObject({
      type: "email_sent",
      title: "Email draft sent",
      data: { chimeEvent: "emailSent" },
    });
    expect(getComposioEmailNotification("GMAIL_ARCHIVE_EMAILS")).toMatchObject({
      type: "email_archived",
      title: "Emails archived",
      data: { chimeEvent: "emailArchived" },
    });
  });

  it("ignores non-Gmail and non-exact Gmail tools", () => {
    expect(getComposioEmailNotification("SLACK_SEND_MESSAGE")).toBeNull();
    expect(getComposioEmailNotification("GMAIL_ARCHIVE_THREAD")).toBeNull();
    expect(getComposioEmailNotification("GMAIL_SEARCH_EMAILS")).toBeNull();
  });
});
