import { sendBulkEmails, sendTestEmail } from "@/lib/email";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

export const Route = createFileRoute("/email-test")({
	component: EmailTest,
});

function EmailTest() {
	const [status, setStatus] = useState("");
	const [loading, setLoading] = useState(false);
	const [bulkEmails, setBulkEmails] = useState("");
	// These endpoints send mail from the project's domain, so they require the
	// same admin secret as /admin/emails.
	const [password, setPassword] = useState("");

	const handleTestSend = async () => {
		setLoading(true);
		setStatus("Sending...");
		try {
			const result = await sendTestEmail({
				data: { password, to: "ethanng157@gmail.com" },
			});
			setStatus(`Test email sent! ID: ${result.id}`);
		} catch (err) {
			setStatus(`Error: ${err instanceof Error ? err.message : String(err)}`);
		} finally {
			setLoading(false);
		}
	};

	const handleBulkSend = async () => {
		const recipients = bulkEmails
			.split("\n")
			.map((e) => e.trim())
			.filter((e) => e.length > 0 && e.includes("@"));

		if (recipients.length === 0) {
			setStatus("No valid emails found");
			return;
		}

		const confirmed = window.confirm(
			`Send rejection email to ${recipients.length} recipients?`,
		);
		if (!confirmed) return;

		setLoading(true);
		setStatus(`Sending to ${recipients.length} recipients...`);
		try {
			const result = await sendBulkEmails({ data: { password, recipients } });
			setStatus(
				`Bulk send complete! ${result.total} emails across ${result.batches} batch(es)`,
			);
		} catch (err) {
			setStatus(`Error: ${err instanceof Error ? err.message : String(err)}`);
		} finally {
			setLoading(false);
		}
	};

	return (
		<div
			style={{
				maxWidth: 600,
				margin: "60px auto",
				fontFamily: "system-ui",
				padding: 20,
				position: "relative",
				zIndex: 10,
				color: "white",
			}}
		>
			<h1 style={{ fontSize: 24, marginBottom: 24 }}>
				Chelsea Commons — Email Sender
			</h1>

			<section style={{ marginBottom: 32 }}>
				<label
					htmlFor="admin-password"
					style={{ display: "block", marginBottom: 8, color: "#aaa" }}
				>
					Admin password
				</label>
				<input
					id="admin-password"
					type="password"
					value={password}
					onChange={(e) => setPassword(e.target.value)}
					style={{
						width: "100%",
						padding: 10,
						fontSize: 14,
						borderRadius: 6,
						border: "1px solid #444",
						background: "#111",
						color: "white",
					}}
				/>
			</section>

			<section style={{ marginBottom: 40 }}>
				<h2 style={{ fontSize: 18, marginBottom: 12 }}>Test Send</h2>
				<p style={{ color: "#aaa", marginBottom: 12 }}>
					Sends to ethanng157@gmail.com
				</p>
				<button
					type="button"
					onClick={handleTestSend}
					disabled={loading}
					style={{
						padding: "10px 20px",
						background: loading ? "#999" : "#8b5cf6",
						color: "white",
						border: "none",
						borderRadius: 6,
						cursor: loading ? "not-allowed" : "pointer",
						fontSize: 14,
					}}
				>
					{loading ? "Sending..." : "Send Test Email"}
				</button>
			</section>

			<section style={{ marginBottom: 40 }}>
				<h2 style={{ fontSize: 18, marginBottom: 12 }}>Bulk Send</h2>
				<p style={{ color: "#aaa", marginBottom: 12 }}>
					Paste emails below, one per line. Will batch in groups of 100.
				</p>
				<textarea
					value={bulkEmails}
					onChange={(e) => setBulkEmails(e.target.value)}
					placeholder={"email1@example.com\nemail2@example.com"}
					rows={10}
					style={{
						width: "100%",
						padding: 12,
						borderRadius: 6,
						border: "1px solid #555",
						fontFamily: "monospace",
						backgroundColor: "#2a2a2a",
						color: "white",
						fontSize: 13,
						marginBottom: 12,
						boxSizing: "border-box",
					}}
				/>
				<button
					type="button"
					onClick={handleBulkSend}
					disabled={loading}
					style={{
						padding: "10px 20px",
						background: loading ? "#999" : "#dc2626",
						color: "white",
						border: "none",
						borderRadius: 6,
						cursor: loading ? "not-allowed" : "pointer",
						fontSize: 14,
					}}
				>
					{loading ? "Sending..." : "Send Bulk Emails"}
				</button>
			</section>

			{status && (
				<div
					style={{
						padding: 16,
						background: status.startsWith("Error") ? "#fef2f2" : "#f0fdf4",
						borderRadius: 8,
						color: status.startsWith("Error") ? "#dc2626" : "#16a34a",
						fontSize: 14,
					}}
				>
					{status}
				</div>
			)}
		</div>
	);
}
