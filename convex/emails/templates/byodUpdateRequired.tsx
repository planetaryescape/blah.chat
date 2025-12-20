"use node";
import { Body, Head, Html, Text, Link } from "@react-email/components";
import { EmailButton, EmailContainer } from "../components";

export function BYODUpdateRequiredEmail({
	currentVersion,
	latestVersion,
}: {
	currentVersion: number;
	latestVersion: number;
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
							color: "#d97706",
						}}
					>
						Database Update Available
					</Text>
					<Text style={{ fontSize: "16px", color: "#374151" }}>
						A new schema version is available for your blah.chat BYOD database.
					</Text>
					<Text style={{ fontSize: "14px", color: "#6b7280" }}>
						• Current version: <strong>v{currentVersion}</strong>
						<br />• Latest version: <strong>v{latestVersion}</strong>
					</Text>
					<Text style={{ fontSize: "14px", color: "#374151" }}>
						<strong>To update:</strong>
					</Text>
					<Text style={{ fontSize: "14px", color: "#6b7280" }}>
						1. Go to Settings → Database in blah.chat
						<br />
						2. Download the new schema package
						<br />
						3. Run{" "}
						<code
							style={{
								backgroundColor: "#f3f4f6",
								padding: "2px 6px",
								borderRadius: "4px",
								fontFamily: "monospace",
							}}
						>
							bunx convex deploy
						</code>{" "}
						in the extracted folder
						<br />
						4. Refresh the settings page to verify
					</Text>
					<EmailButton href="https://blah.chat/settings?tab=database">
						Update Now
					</EmailButton>
					<Text
						style={{ fontSize: "12px", color: "#9ca3af", marginTop: "16px" }}
					>
						If you have questions, check our{" "}
						<Link
							href="https://blah.chat/docs/byod"
							style={{ color: "#6366f1" }}
						>
							BYOD documentation
						</Link>{" "}
						or contact support.
					</Text>
				</EmailContainer>
			</Body>
		</Html>
	);
}
