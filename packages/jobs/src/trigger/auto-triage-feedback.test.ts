import {
  createUserRepository,
  feedbackEntries,
} from "@blah-chat/persistence-postgres";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { createTestPersistenceDb } from "../../../persistence-postgres/src/testing/pglite";
import { triageFeedbackEntry } from "./auto-triage-feedback";

describe("triageFeedbackEntry", () => {
  it("stores AI triage on a Postgres feedback entry", async () => {
    const db = await createTestPersistenceDb();
    const users = createUserRepository(db);

    const user = await users.upsertFromClerk({
      clerkId: "clerk_feedback_triage",
      email: "feedback-triage@example.com",
      name: "Feedback Triage",
    });

    const [feedback] = await db
      .insert(feedbackEntries)
      .values({
        userId: user.id,
        userEmail: user.email,
        userName: user.name,
        page: "/chat",
        feedbackType: "bug",
        description:
          "Comparison mode stopped both streams when I only stopped one.",
        status: "new",
        priority: "none",
        createdAt: 1,
        updatedAt: 1,
      })
      .returning();

    const result = await triageFeedbackEntry(
      { feedbackId: feedback!.id },
      {
        db,
        now: () => 123,
        generateTriage: async () => ({
          priority: "high",
          suggestedTags: ["comparison", "streaming"],
          summary: "Stopping one branch cancels both comparison streams",
          category: "bug",
          actionable: true,
          sentiment: "frustrated",
          notes: "Likely shared cancel token",
        }),
      },
    );

    expect(result).toMatchObject({
      success: true,
      triage: {
        priority: "high",
      },
    });

    const storedFeedback = await db.query.feedbackEntries.findFirst({
      where: eq(feedbackEntries.id, feedback!.id),
    });

    expect(storedFeedback?.aiTriage).toEqual({
      suggestedPriority: "high",
      suggestedTags: ["comparison", "streaming"],
      triageNotes:
        "Summary: Stopping one branch cancels both comparison streams | Category: bug | Sentiment: frustrated | Actionable: Yes | Notes: Likely shared cancel token",
      summary: "Stopping one branch cancels both comparison streams",
      category: "bug",
      actionable: true,
      sentiment: "frustrated",
      createdAt: 123,
    });
  });
});
