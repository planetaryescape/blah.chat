"use node";
import { Body, Head, Html, Link, Text } from "@react-email/components";
import { EmailContainer } from "../components";

export function GenerationErrorAlertEmail({
  userEmail,
  conversationId,
  messageId,
  modelId,
  errorMessage,
  errorType,
  failedModels,
}: {
  userEmail?: string;
  conversationId: string;
  messageId: string;
  modelId: string;
  errorMessage: string;
  errorType: string;
  failedModels: string[];
}) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://blah.chat";
  const conversationUrl = `${appUrl}/chat/${conversationId}`;

  return (
    <Html>
      <Head />
      <Body style={{ backgroundColor: "#f6f9fc", fontFamily: "sans-serif" }}>
        <EmailContainer>
          <Text
            style={{
              fontSize: "24px",
              fontWeight: "bold",
              color: "#dc2626",
            }}
          >
            Auto-Router Failure
          </Text>
          <Text style={{ fontSize: "16px", color: "#374151" }}>
            Generation failed after exhausting all retry attempts.
          </Text>

          <Text
            style={{
              fontSize: "14px",
              color: "#6b7280",
              fontFamily: "monospace",
              backgroundColor: "#f3f4f6",
              padding: "12px",
              borderRadius: "4px",
              wordBreak: "break-word",
            }}
          >
            <strong>Error Type:</strong> {errorType}
            <br />
            <br />
            <strong>Last Model:</strong> {modelId}
            <br />
            <br />
            <strong>Failed Models:</strong> {failedModels.join(", ")}
            <br />
            <br />
            <strong>Error:</strong> {errorMessage}
          </Text>

          <Text style={{ fontSize: "14px", color: "#6b7280" }}>
            <strong>User:</strong> {userEmail || "Unknown"}
            <br />
            <strong>Message ID:</strong> {messageId}
          </Text>

          <Link
            href={conversationUrl}
            style={{
              display: "inline-block",
              backgroundColor: "#2563eb",
              color: "#ffffff",
              padding: "10px 20px",
              borderRadius: "6px",
              textDecoration: "none",
              fontSize: "14px",
              fontWeight: "500",
            }}
          >
            View Conversation
          </Link>

          <Text
            style={{ fontSize: "12px", color: "#9ca3af", marginTop: "20px" }}
          >
            This is an automated alert. A feedback entry has been created for
            tracking.
          </Text>
        </EmailContainer>
      </Body>
    </Html>
  );
}
