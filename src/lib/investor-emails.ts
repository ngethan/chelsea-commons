import { createServerFn } from "@tanstack/react-start";
import { assertAdmin } from "./admin-auth";
import {
	CAMPAIGN_FROM,
	RESEND_BATCH_LIMIT,
	renderCampaignEmail,
	renderCampaignText,
} from "./campaign";
import { db, ensureSchema } from "./db";
import { postPath } from "./post-path";
import { getPost } from "./posts";
import type { Recipient } from "./recipients";
import { resendApiKey, resendRequest } from "./resend";
import { newRef } from "./tracking";
import { errorText } from "./utils";

function normalizeBaseUrl(baseUrl: string) {
	const trimmed = baseUrl.trim().replace(/\/$/, "");
	if (!/^https?:\/\//.test(trimmed)) {
		throw new Error(
			`Base URL must start with http:// or https:// (got "${baseUrl}")`,
		);
	}
	return trimmed;
}

type SendInput = {
	password: string;
	baseUrl: string;
	/** Slug of the post in content/blog; also the campaign name. */
	slug: string;
	subject: string;
	recipients: Recipient[];
};

type BatchResponse = { data?: Array<{ id?: string }> };

/**
 * Rows are written before the send so a ref always resolves, even if Resend
 * fails halfway through: a link that 404s is worse than a row marked failed.
 */
export const sendCampaign = createServerFn({ method: "POST" })
	.inputValidator((data: SendInput) => data)
	.handler(async ({ data }) => {
		assertAdmin(data.password);
		const baseUrl = normalizeBaseUrl(data.baseUrl);
		const apiKey = resendApiKey();

		if (data.recipients.length === 0) {
			throw new Error("No recipients.");
		}
		if (!data.slug) {
			throw new Error("Pick an update to send.");
		}
		if (!data.subject.trim()) {
			throw new Error("Subject is empty.");
		}

		const destination = postPath(data.slug);
		const description = getPost(data.slug)?.description ?? null;

		await ensureSchema();
		const sql = db();

		const prepared = data.recipients.map((r) => ({
			...r,
			ref: newRef(),
		}));

		// One HTTP request rather than one per recipient: the Neon driver sends
		// each statement over its own connection otherwise, which for a hundred
		// investors is a hundred serial round trips before a single mail goes out.
		await sql.transaction(
			prepared.map(
				(r) => sql`
					insert into email_sends (ref, campaign, email, name, destination, status)
					values (
						${r.ref}, ${data.slug}, ${r.email}, ${r.name}, ${destination}, 'pending'
					)
				`,
			),
		);

		let sent = 0;
		let failed = 0;

		for (let i = 0; i < prepared.length; i += RESEND_BATCH_LIMIT) {
			const chunk = prepared.slice(i, i + RESEND_BATCH_LIMIT);
			const payload = chunk.map((r) => ({
				from: CAMPAIGN_FROM,
				to: r.email,
				subject: data.subject,
				html: renderCampaignEmail({
					ref: r.ref,
					name: r.name,
					baseUrl,
					description,
				}),
				text: renderCampaignText({
					ref: r.ref,
					name: r.name,
					baseUrl,
					description,
				}),
				// Carries the ref into Resend's own dashboard so a delivery or
				// bounce there can be matched back to a row here.
				tags: [{ name: "ref", value: r.ref }],
			}));

			try {
				const result = await resendRequest<BatchResponse>(
					apiKey,
					"/emails/batch",
					payload,
				);
				// Resend returns ids in request order.
				await sql.transaction(
					chunk.map(
						(r, index) => sql`
							update email_sends
							set status = 'sent', resend_id = ${result.data?.[index]?.id ?? null}
							where ref = ${r.ref}
						`,
					),
				);
				sent += chunk.length;
			} catch (err) {
				const message = errorText(err);
				await sql`
					update email_sends set status = 'failed', error = ${message}
					where ref = any(${chunk.map((r) => r.ref)})
				`;
				failed += chunk.length;
			}
		}

		return { sent, failed, total: prepared.length };
	});

/** Sends one copy to yourself with a real ref, so the whole loop is testable. */
export const sendCampaignPreview = createServerFn({ method: "POST" })
	.inputValidator(
		(data: {
			password: string;
			baseUrl: string;
			slug: string;
			subject: string;
			to: string;
		}) => data,
	)
	.handler(async ({ data }) => {
		assertAdmin(data.password);
		const baseUrl = normalizeBaseUrl(data.baseUrl);
		const apiKey = resendApiKey();

		await ensureSchema();
		const sql = db();
		const ref = newRef();
		const description = getPost(data.slug)?.description ?? null;

		await sql`
			insert into email_sends (ref, campaign, email, name, destination, status)
			values (
				${ref},
				${`${data.slug}-preview`},
				${data.to},
				${"Preview"},
				${postPath(data.slug)},
				'pending'
			)
		`;

		const result = await resendRequest<{ id?: string }>(apiKey, "/emails", {
			from: CAMPAIGN_FROM,
			to: data.to,
			subject: `[preview] ${data.subject}`,
			html: renderCampaignEmail({ ref, name: "Preview", baseUrl, description }),
			text: renderCampaignText({ ref, name: "Preview", baseUrl, description }),
			tags: [{ name: "ref", value: ref }],
		});

		await sql`
			update email_sends set status = 'sent', resend_id = ${result.id ?? null}
			where ref = ${ref}
		`;

		return { ref, id: result.id ?? null };
	});

export type CampaignRow = {
	ref: string;
	campaign: string;
	email: string;
	name: string | null;
	status: string;
	destination: string | null;
	error: string | null;
	// Timestamps arrive as real Date objects: the server-fn transport
	// round-trips them through seroval rather than JSON.
	created_at: Date;
	opens: number;
	clicks: number;
	first_open: Date | null;
	last_open: Date | null;
	first_click: Date | null;
};

export const getCampaignReport = createServerFn({ method: "POST" })
	.inputValidator((data: { password: string }) => data)
	.handler(async ({ data }) => {
		assertAdmin(data.password);
		await ensureSchema();
		const sql = db();

		const rows = (await sql`
			select
				s.ref,
				s.campaign,
				s.email,
				s.name,
				s.status,
				s.destination,
				s.error,
				s.created_at,
				count(e.id) filter (where e.kind = 'open')::int as opens,
				count(e.id) filter (where e.kind = 'click')::int as clicks,
				min(e.created_at) filter (where e.kind = 'open') as first_open,
				max(e.created_at) filter (where e.kind = 'open') as last_open,
				min(e.created_at) filter (where e.kind = 'click') as first_click
			from email_sends s
			left join email_events e on e.ref = s.ref
			group by s.ref
			order by s.created_at desc
		`) as unknown as CampaignRow[];

		return { rows };
	});

export type SendEvent = {
	id: number;
	kind: "open" | "click";
	target: string | null;
	user_agent: string | null;
	ip: string | null;
	created_at: Date;
};

/** Every recorded open and click for one send, newest first. */
export const getSendEvents = createServerFn({ method: "POST" })
	.inputValidator((data: { password: string; ref: string }) => data)
	.handler(async ({ data }) => {
		assertAdmin(data.password);
		await ensureSchema();
		const sql = db();

		const events = (await sql`
			select id, kind, target, user_agent, ip, created_at
			from email_events
			where ref = ${data.ref}
			order by created_at desc
		`) as unknown as SendEvent[];

		return { events };
	});

export const deleteSend = createServerFn({ method: "POST" })
	.inputValidator((data: { password: string; ref: string }) => data)
	.handler(async ({ data }) => {
		assertAdmin(data.password);
		await ensureSchema();
		const sql = db();
		await sql`delete from email_sends where ref = ${data.ref}`;
		return { ok: true };
	});
