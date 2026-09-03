import { recordClick, refFrom } from "@/lib/tracking";
import { createFileRoute } from "@tanstack/react-router";

/**
 * Where to send a link whose ref we can't resolve: a truncated or mangled URL,
 * or a row that has been deleted. Deliberately a constant rather than "the
 * newest post": posts are private letters written for specific lists, so
 * resolving an unknown ref to whatever shipped most recently would hand an
 * old campaign's recipient a letter meant for a different audience.
 */
const FALLBACK_DESTINATION = "/";

/**
 * The short link that goes in an investor email: /u/<ref>. Records the click,
 * then redirects to whichever post that ref was addressed to.
 */
export const Route = createFileRoute("/u/$ref")({
	server: {
		handlers: {
			GET: async ({ request, params }) => {
				const ref = refFrom(params, request);

				const recorded = ref ? await recordClick(ref, request) : null;
				const target = recorded ?? FALLBACK_DESTINATION;

				// The ref is recorded above and deliberately left out of the
				// redirect: in the URL it would leak into browser history, the
				// referrer sent to any outbound link, and any copy of the link
				// the recipient forwards on.
				const destination = new URL(target, new URL(request.url).origin);

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
