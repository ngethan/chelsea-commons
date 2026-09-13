import { isAdmin } from "@/lib/roles";
import { createTRPCContext } from "@/server/trpc/init";
import { createFileRoute } from "@tanstack/react-router";
import { put } from "@vercel/blob";

/**
 * Where a photo dropped into a post goes.
 *
 * Not tRPC: this takes bytes, and putting a multi-megabyte image through a
 * JSON envelope means base64 and a third more of everything. Same boundary as
 * the rest of the admin all the same, resolved the same way.
 *
 * Vercel Blob rather than a bucket of our own. The URL it hands back is
 * already served from an edge CDN, so there is no CDN here to build, and
 * `addRandomSuffix` means two files called `IMG_4821.jpeg` are two photos
 * rather than one overwriting the other.
 */
const MAX_BYTES = 12_000_000;

const TYPES = new Set([
	"image/jpeg",
	"image/png",
	"image/webp",
	"image/avif",
	"image/gif",
]);

async function POST({ request }: { request: Request }) {
	const ctx = await createTRPCContext({ headers: request.headers });
	if (!ctx.user) return new Response("Unauthorized", { status: 401 });
	if (!isAdmin(ctx.role)) return new Response("Forbidden", { status: 403 });

	if (!process.env.BLOB_READ_WRITE_TOKEN) {
		return Response.json(
			{ error: "BLOB_READ_WRITE_TOKEN is not set, so uploads are off." },
			{ status: 503 },
		);
	}

	const form = await request.formData().catch(() => null);
	const file = form?.get("file");

	if (!(file instanceof File)) {
		return Response.json({ error: "No file." }, { status: 400 });
	}
	if (!TYPES.has(file.type)) {
		return Response.json({ error: "Images only." }, { status: 415 });
	}
	if (file.size > MAX_BYTES) {
		return Response.json(
			{ error: "That image is too large." },
			{ status: 413 },
		);
	}

	try {
		const blob = await put(`writing/${file.name}`, file, {
			access: "public",
			addRandomSuffix: true,
			contentType: file.type,
		});
		return Response.json({ url: blob.url });
	} catch (err) {
		console.error("[upload] failed", err);
		return Response.json({ error: "Upload failed." }, { status: 502 });
	}
}

export const Route = createFileRoute("/api/upload")({
	server: { handlers: { POST } },
});
