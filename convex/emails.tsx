"use node";
import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Button,
} from "@react-email/components";

export function BudgetWarningEmail({
  percentUsed,
  spent,
  budget,
}: {
  percentUsed: number;
  spent: number;
  budget: number;
}) {
  return (
    <Html>
      <Head />
      <Body style={{ backgroundColor: "#f6f9fc", fontFamily: "sans-serif" }}>
        <Container
          style={{
            margin: "40px auto",
            padding: "20px",
            backgroundColor: "#ffffff",
            borderRadius: "8px",
          }}
        >
          <Section>
            <Text
              style={{
                fontSize: "24px",
                fontWeight: "bold",
                color: "#e11d48",
              }}
            >
              ⚠️ Budget Alert: {percentUsed.toFixed(0)}% Used
            </Text>
            <Text style={{ fontSize: "16px", color: "#374151" }}>
              Your blah.chat AI budget is at{" "}
              <strong>{percentUsed.toFixed(1)}%</strong> usage.
            </Text>
            <Text style={{ fontSize: "14px", color: "#6b7280" }}>
              • Spent: <strong>${spent.toFixed(2)}</strong>
              <br />
              • Budget: <strong>${budget.toFixed(2)}</strong>
              <br />• Remaining: <strong>${(budget - spent).toFixed(2)}</strong>
            </Text>
            <Button
              href="https://blah.chat/admin/settings?tab=limits"
              style={{
                backgroundColor: "#8b5cf6",
                color: "#ffffff",
                padding: "12px 24px",
                borderRadius: "6px",
                textDecoration: "none",
                display: "inline-block",
                marginTop: "16px",
              }}
            >
              Adjust Budget Limits
            </Button>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

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
        <Container
          style={{
            margin: "40px auto",
            padding: "20px",
            backgroundColor: "#ffffff",
            borderRadius: "8px",
          }}
        >
          <Section>
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
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
