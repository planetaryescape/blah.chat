"use node";
import { Body, Head, Hr, Html, Section, Text } from "@react-email/components";
import type { Doc } from "../../_generated/dataModel";
import { EmailButton, EmailContainer } from "../components";

// ============================================================================
// TYPES
// ============================================================================

type FeedbackPriority = "critical" | "high" | "medium" | "low" | "none";
type FeedbackType = "bug" | "feature" | "praise" | "other";
type FeedbackSentiment = "positive" | "neutral" | "negative" | "frustrated";

interface FeedbackNotificationEmailProps {
  feedback: Doc<"feedback">;
  screenshotUrl: string | null;
}

// ============================================================================
// COLOR MAPPING (duplicated for Node runtime - can't import from src/)
// ============================================================================

const PRIORITY_COLORS: Record<FeedbackPriority, string> = {
  critical: "#dc2626",
  high: "#d87945",
  medium: "#b89f42",
  low: "#6b7280",
  none: "#9ca3af",
};

const PRIORITY_BG_COLORS: Record<FeedbackPriority, string> = {
  critical: "#fee2e2",
  high: "#fed7aa",
  medium: "#fef3c7",
  low: "#f3f4f6",
  none: "#f9fafb",
};

const SENTIMENT_ICONS: Record<FeedbackSentiment, string> = {
  frustrated: "🔥",
  negative: "😟",
  neutral: "😐",
  positive: "😊",
};

function getPriorityEmoji(priority: FeedbackPriority): string {
  const map: Record<FeedbackPriority, string> = {
    critical: "🚨",
    high: "⚠️",
    medium: "📌",
    low: "💬",
    none: "📝",
  };
  return map[priority];
}

function getTypeEmoji(type: FeedbackType): string {
  const map: Record<FeedbackType, string> = {
    bug: "🐛",
    feature: "💡",
    praise: "⭐",
    other: "💬",
  };
  return map[type];
}

function getSentimentIcon(sentiment: FeedbackSentiment): string {
  return SENTIMENT_ICONS[sentiment];
}

// ============================================================================
// TRIAGE NOTES PARSER
// Format: "Summary: X | Category: Y | Sentiment: Z | Actionable: Yes/No | Notes: ..."
// ============================================================================

function extractFromNotes(
  notes: string | undefined,
  key: string,
): string | null {
  if (!notes) return null;

  const parts = notes.split(" | ");
  for (const part of parts) {
    if (part.startsWith(`${key}: `)) {
      return part.substring(key.length + 2);
    }
  }
  return null;
}

function extractSummary(notes: string | undefined): string {
  return extractFromNotes(notes, "Summary") || "No summary available";
}

function extractCategory(notes: string | undefined): string {
  return extractFromNotes(notes, "Category") || "other";
}

function extractSentiment(notes: string | undefined): FeedbackSentiment {
  const sentiment = extractFromNotes(notes, "Sentiment");
  if (
    sentiment === "positive" ||
    sentiment === "neutral" ||
    sentiment === "negative" ||
    sentiment === "frustrated"
  ) {
    return sentiment;
  }
  return "neutral";
}

function extractActionable(notes: string | undefined): boolean {
  const actionable = extractFromNotes(notes, "Actionable");
  return actionable === "Yes";
}

function extractNotes(notes: string | undefined): string | null {
  return extractFromNotes(notes, "Notes");
}

// ============================================================================
// EMAIL TEMPLATE
// ============================================================================

export function FeedbackNotificationEmail({
  feedback,
  screenshotUrl,
}: FeedbackNotificationEmailProps) {
  // Extract AI triage data
  const priority =
    (feedback.aiTriage?.suggestedPriority as FeedbackPriority) ||
    (feedback.priority as FeedbackPriority) ||
    "none";
  const sentiment = extractSentiment(feedback.aiTriage?.triageNotes);
  const summary = extractSummary(feedback.aiTriage?.triageNotes);
  const category = extractCategory(feedback.aiTriage?.triageNotes);
  const actionable = extractActionable(feedback.aiTriage?.triageNotes);
  const additionalNotes = extractNotes(feedback.aiTriage?.triageNotes);

  // Color mapping
  const priorityColor = PRIORITY_COLORS[priority];
  const priorityBg = PRIORITY_BG_COLORS[priority];
  const typeEmoji = getTypeEmoji(feedback.feedbackType as FeedbackType);
  const priorityEmoji = getPriorityEmoji(priority);
  const sentimentIcon = getSentimentIcon(sentiment);

  return (
    <Html>
      <Head />
      <Body style={{ backgroundColor: "#f6f9fc", fontFamily: "sans-serif" }}>
        <EmailContainer>
          {/* Header - Color-coded by priority */}
          <Text
            style={{
              fontSize: "24px",
              fontWeight: "bold",
              color: priorityColor,
              margin: "0 0 16px 0",
            }}
          >
            {typeEmoji} {priorityEmoji} New Feedback:{" "}
            {feedback.feedbackType.toUpperCase()}
          </Text>

          {/* AI Summary Badge */}
          {feedback.aiTriage && (
            <Section
              style={{
                backgroundColor: priorityBg,
                padding: "12px",
                borderRadius: "6px",
                borderLeft: `4px solid ${priorityColor}`,
                marginBottom: "20px",
              }}
            >
              <Text
                style={{
                  fontSize: "14px",
                  fontWeight: "600",
                  margin: "0 0 4px 0",
                  color: "#1f2937",
                }}
              >
                {sentimentIcon} AI Summary
              </Text>
              <Text
                style={{
                  fontSize: "14px",
                  margin: "0",
                  color: "#374151",
                }}
              >
                {summary}
              </Text>
            </Section>
          )}

          {/* Fallback if AI triage missing */}
          {!feedback.aiTriage && (
            <Section
              style={{
                backgroundColor: "#fef3c7",
                padding: "12px",
                borderRadius: "6px",
                marginBottom: "20px",
              }}
            >
              <Text
                style={{
                  fontSize: "14px",
                  margin: "0",
                  color: "#92400e",
                }}
              >
                ⚠️ AI triage pending or unavailable. Check admin dashboard for
                updates.
              </Text>
            </Section>
          )}

          {/* Feedback Details */}
          <Section style={{ marginBottom: "16px" }}>
            <Text
              style={{
                fontSize: "16px",
                fontWeight: "600",
                margin: "0 0 8px 0",
                color: "#111827",
              }}
            >
              Description
            </Text>
            <Text
              style={{
                fontSize: "14px",
                color: "#374151",
                margin: "0",
                lineHeight: "1.5",
              }}
            >
              {feedback.description}
            </Text>
          </Section>

          {/* Bug-specific fields */}
          {feedback.whatTheyDid && (
            <Section style={{ marginBottom: "16px" }}>
              <Text
                style={{
                  fontSize: "14px",
                  fontWeight: "600",
                  margin: "0 0 4px 0",
                  color: "#111827",
                }}
              >
                What they did
              </Text>
              <Text
                style={{
                  fontSize: "13px",
                  color: "#6b7280",
                  margin: "0",
                  lineHeight: "1.5",
                }}
              >
                {feedback.whatTheyDid}
              </Text>
            </Section>
          )}

          {feedback.whatTheySaw && (
            <Section style={{ marginBottom: "16px" }}>
              <Text
                style={{
                  fontSize: "14px",
                  fontWeight: "600",
                  margin: "0 0 4px 0",
                  color: "#111827",
                }}
              >
                What they saw
              </Text>
              <Text
                style={{
                  fontSize: "13px",
                  color: "#6b7280",
                  margin: "0",
                  lineHeight: "1.5",
                }}
              >
                {feedback.whatTheySaw}
              </Text>
            </Section>
          )}

          {feedback.whatTheyExpected && (
            <Section style={{ marginBottom: "16px" }}>
              <Text
                style={{
                  fontSize: "14px",
                  fontWeight: "600",
                  margin: "0 0 4px 0",
                  color: "#111827",
                }}
              >
                What they expected
              </Text>
              <Text
                style={{
                  fontSize: "13px",
                  color: "#6b7280",
                  margin: "0",
                  lineHeight: "1.5",
                }}
              >
                {feedback.whatTheyExpected}
              </Text>
            </Section>
          )}

          {/* Screenshot */}
          {screenshotUrl && (
            <Section style={{ marginBottom: "16px" }}>
              <Text
                style={{
                  fontSize: "14px",
                  fontWeight: "600",
                  margin: "0 0 8px 0",
                  color: "#111827",
                }}
              >
                Screenshot
              </Text>
              <img
                src={screenshotUrl}
                alt="Feedback screenshot"
                style={{
                  maxWidth: "100%",
                  borderRadius: "4px",
                  border: "1px solid #e5e7eb",
                }}
              />
            </Section>
          )}

          {feedback.screenshotStorageId && !screenshotUrl && (
            <Section style={{ marginBottom: "16px" }}>
              <Text
                style={{
                  fontSize: "13px",
                  color: "#9ca3af",
                  margin: "0",
                  fontStyle: "italic",
                }}
              >
                📎 Screenshot available (view in admin dashboard)
              </Text>
            </Section>
          )}

          <Hr style={{ borderColor: "#e5e7eb", margin: "24px 0" }} />

          {/* AI Triage Details */}
          {feedback.aiTriage && (
            <Section
              style={{
                backgroundColor: "#f9fafb",
                padding: "12px",
                borderRadius: "6px",
                marginBottom: "20px",
              }}
            >
              <Text
                style={{
                  fontSize: "14px",
                  fontWeight: "600",
                  margin: "0 0 8px 0",
                  color: "#111827",
                }}
              >
                🤖 AI Triage Analysis
              </Text>

              <Text
                style={{
                  fontSize: "13px",
                  margin: "0",
                  color: "#374151",
                  lineHeight: "1.6",
                }}
              >
                <strong>Priority:</strong> {priorityEmoji}{" "}
                {priority.toUpperCase()}
                <br />
                <strong>Sentiment:</strong> {sentimentIcon} {sentiment}
                <br />
                <strong>Category:</strong> {category}
                <br />
                <strong>Actionable:</strong> {actionable ? "✅ Yes" : "❌ No"}
              </Text>

              {feedback.aiTriage.suggestedTags &&
                feedback.aiTriage.suggestedTags.length > 0 && (
                  <Text
                    style={{
                      fontSize: "13px",
                      margin: "8px 0 0 0",
                      color: "#374151",
                    }}
                  >
                    <strong>Suggested Tags:</strong>{" "}
                    {feedback.aiTriage.suggestedTags.join(", ")}
                  </Text>
                )}

              {additionalNotes && (
                <Text
                  style={{
                    fontSize: "13px",
                    color: "#6b7280",
                    fontStyle: "italic",
                    margin: "8px 0 0 0",
                    paddingLeft: "12px",
                    borderLeft: "2px solid #d1d5db",
                  }}
                >
                  "{additionalNotes}"
                </Text>
              )}
            </Section>
          )}

          {/* User Context */}
          <Section style={{ marginBottom: "20px" }}>
            <Text
              style={{
                fontSize: "13px",
                color: "#6b7280",
                margin: "0",
                lineHeight: "1.6",
              }}
            >
              <strong>User:</strong> {feedback.userName} ({feedback.userEmail})
              <br />
              <strong>Page:</strong> {feedback.page}
              <br />
              <strong>Submitted:</strong>{" "}
              {new Date(feedback.createdAt).toLocaleString("en-US", {
                dateStyle: "medium",
                timeStyle: "short",
              })}
              <br />
              {feedback.userSuggestedUrgency && (
                <>
                  <strong>User Urgency:</strong>{" "}
                  {feedback.userSuggestedUrgency.toUpperCase()}
                </>
              )}
            </Text>
          </Section>

          {/* CTA */}
          <EmailButton href="https://blah.chat/admin/feedback">
            View in Admin Dashboard
          </EmailButton>
        </EmailContainer>
      </Body>
    </Html>
  );
}
