import { isPrefetch } from "@/lib/bots";
import { recordClick, refFrom, resolveRef } from "@/lib/tracking";
import { createFileRoute } from "@tanstack/react-router";

/**
 * The short link that goes in an investor update: /u/<ref>. Records the click,
 * then redirects to the post that ref was addressed to.
 *
 * Unknown, malformed and revoked refs all 404. Answering any of them
 * differently would tell whoever is holding a dead link that it was once real.
 */
export const Route = createFileRoute("/u/$ref")({
	server: {
		handlers: {
			GET: async ({ request, params }) => {
				const ref = refFrom(params, request);

				// A browser warming the link is not somebody opening it. Resolve the
				// destination but record nothing.
				const slug = isPrefetch(request)
					? await resolveRef(ref)
					: await recordClick(ref, request);

				if (!slug) {
					return new Response("Not found", {
						status: 404,
						headers: { "cache-control": "no-store" },
					});
				}

				// The ref is recorded above and deliberately left out of the
				// redirect: in the URL it would leak into browser history, into the
				// referrer of any outbound link, and into any copy of the link the
				// reader forwards on.
				const destination = new URL(
					`/writing/${slug}`,
					new URL(request.url).origin,
				);

				return new Response(null, {
					status: 302,
					headers: {
						location: destination.toString(),
						"cache-control": "no-store",
					},
				});
			},
		},
	},
});
