"use node";
import { Html, Head, Body, Text } from "@react-email/components";
import { EmailContainer, EmailButton } from "../components";

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
        <EmailContainer>
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
            <br />• Budget: <strong>${budget.toFixed(2)}</strong>
            <br />• Remaining: <strong>${(budget - spent).toFixed(2)}</strong>
          </Text>
          <EmailButton href="https://blah.chat/admin/settings?tab=limits">
            Adjust Budget Limits
          </EmailButton>
        </EmailContainer>
      </Body>
    </Html>
  );
}
