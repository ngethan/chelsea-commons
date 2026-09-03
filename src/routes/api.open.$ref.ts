import { recordOpen, refFrom } from "@/lib/tracking";
import { createFileRoute } from "@tanstack/react-router";

/** 1x1 transparent GIF, the smallest thing every email client will render. */
const PIXEL = Buffer.from(
	"R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
	"base64",
);

/**
 * Open pixel. Always returns the image, whatever happens to the write, so a
 * tracking outage never shows a broken-image box inside someone's inbox.
 */
export const Route = createFileRoute("/api/open/$ref")({
	server: {
		handlers: {
			GET: async ({ request, params }) => {
				const ref = refFrom(params, request);

				if (ref) {
					await recordOpen(ref, request);
				}

				return new Response(PIXEL, {
					status: 200,
					headers: {
						"content-type": "image/gif",
						"content-length": String(PIXEL.byteLength),
						// Without this, Gmail's image proxy caches the pixel and
						// only the first open ever reaches us.
						"cache-control": "no-store, no-cache, must-revalidate, private",
						pragma: "no-cache",
						expires: "0",
					},
				});
			},
		},
	},
});
