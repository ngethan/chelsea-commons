import { createFileRoute } from "@tanstack/react-router";

/**
 * Vercel cron target (see `crons` in vercel.json). Events are baked into the
 * bundle at build time by scripts/sync-luma-events.mjs, so "syncing" means
 * triggering a fresh deploy via a deploy hook; the build re-fetches Luma.
 *
 * Required Vercel env vars:
 *   VERCEL_DEPLOY_HOOK_URL — Project Settings → Git → Deploy Hooks
 *   CRON_SECRET            — Vercel sends it as a Bearer token on cron calls
 */
export const Route = createFileRoute("/api/cron/sync-events")({
	server: {
		handlers: {
			GET: async ({ request }) => {
				const secret = process.env.CRON_SECRET;
				if (
					secret &&
					request.headers.get("authorization") !== `Bearer ${secret}`
				) {
					return new Response("Unauthorized", { status: 401 });
				}

				const hookUrl = process.env.VERCEL_DEPLOY_HOOK_URL;
				if (!hookUrl) {
					return Response.json(
						{ ok: false, error: "VERCEL_DEPLOY_HOOK_URL is not set" },
						{ status: 500 },
					);
				}

				const res = await fetch(hookUrl, { method: "POST" });
				if (!res.ok) {
					return Response.json(
						{ ok: false, error: `Deploy hook returned ${res.status}` },
						{ status: 502 },
					);
				}
				return Response.json({ ok: true, triggered: true });
			},
		},
	},
});
