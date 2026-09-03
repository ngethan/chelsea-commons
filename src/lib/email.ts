import { createServerFn } from "@tanstack/react-start";
import { assertAdmin } from "./admin-auth";
import { CAMPAIGN_FROM, RESEND_BATCH_LIMIT } from "./campaign";
import { resendApiKey, resendRequest } from "./resend";

const EMAIL_SUBJECT = "Thank You for Applying";

const EMAIL_HTML = `<div dir="ltr"><div>Hi,</div><br><div>Thank you so much for taking the time to apply to Chelsea Commons. We were genuinely blown away by the depth and thoughtfulness of the applications we received.</div><br><div>We have now finalized our 12-person living cohort for this summer, but Chelsea Commons will be more than just a house. We are going to throw intern events ranging from builder nights and hackathons to pickleball tournaments and yacht parties, backed by some of the best VCs and startups. We'd love for you to be there, and you can sign up here: <a href="https://chelseacommons.co/rsvp">https://chelseacommons.co/rsvp</a></div><br><div>Regardless, we really do appreciate your interest and the time you put into your application. I hope our paths cross this summer in NYC. Also, feel free to reach out to our founder, Sachin, at <a href="mailto:sksashti@gmail.com">sksashti@gmail.com</a>, with ideas on how to make this community the best it can be!!</div><br><div>Warmly,</div><div>The Chelsea Commons</div></div>`;

export const sendTestEmail = createServerFn({ method: "POST" })
	.inputValidator((data: { password: string; to: string }) => data)
	.handler(async ({ data }) => {
		assertAdmin(data.password);
		const apiKey = resendApiKey();

		const result = await resendRequest(apiKey, "/emails", {
			from: CAMPAIGN_FROM,
			to: data.to,
			subject: EMAIL_SUBJECT,
			html: EMAIL_HTML,
		});

		return { success: true, id: result.id as string };
	});

export const sendBulkEmails = createServerFn({ method: "POST" })
	.inputValidator((data: { password: string; recipients: string[] }) => data)
	.handler(async ({ data }) => {
		assertAdmin(data.password);
		const apiKey = resendApiKey();

		const batches = [];
		for (let i = 0; i < data.recipients.length; i += RESEND_BATCH_LIMIT) {
			batches.push(
				data.recipients.slice(i, i + RESEND_BATCH_LIMIT).map((to) => ({
					from: CAMPAIGN_FROM,
					to,
					subject: EMAIL_SUBJECT,
					html: EMAIL_HTML,
				})),
			);
		}

		const results = [];
		for (const batch of batches) {
			const result = await resendRequest(apiKey, "/emails/batch", batch);
			results.push(result);
		}

		return {
			success: true,
			batches: results.length,
			total: data.recipients.length,
		};
	});
