"use node";
import { Body, Head, Html, Text } from "@react-email/components";
import { EmailContainer } from "../components";

export function ApiCreditsExhaustedEmail({
  errorMessage,
  modelId,
}: {
  errorMessage: string;
  modelId: string;
}) {
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
            🚨 API Credits Exhausted
          </Text>
          <Text style={{ fontSize: "16px", color: "#374151" }}>
            A generation request failed due to exhausted API credits.
          </Text>
          <Text
            style={{
              fontSize: "14px",
              color: "#6b7280",
              fontFamily: "monospace",
              backgroundColor: "#f3f4f6",
              padding: "12px",
              borderRadius: "4px",
            }}
          >
            Model: {modelId}
            <br />
            Error: {errorMessage}
          </Text>
          <Text style={{ fontSize: "14px", color: "#6b7280" }}>
            <strong>Action required:</strong> Add credits to your Vercel AI
            Gateway account or provider API key.
          </Text>
        </EmailContainer>
      </Body>
    </Html>
  );
}
