#!/usr/bin/env node
/**
 * Build an event photo-gallery manifest from the images committed under
 * public/assets/events/<eventId>/ into src/data/event-galleries.generated.json.
 *
 * Workflow:
 *   1. Run `npm run sync:galleries` once to scaffold an empty folder per event
 *      under public/assets/events/ (named after the event id). You can rename
 *      a folder to add a free-form label after the id, e.g.
 *      `8i0goieb-cory-levy-dinner` — anything starting with the id matches.
 *   2. Drop image files in it. Filenames sort the gallery; the first one
 *      (alphabetically) becomes the cover that replaces the Luma image on
 *      /events and the home screen. Name them 01.webp, 02.webp, ... to control
 *      the order.
 *   3. Run `npm run sync:galleries` (also runs automatically on build).
 */
import { existsSync } from "node:fs";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const EVENTS_DIR = path.join(ROOT, "public", "assets", "events");
const EVENTS_JSON = path.join(ROOT, "src", "data", "luma-events.generated.json");
const OUTPUT_PATH = path.join(ROOT, "src", "data", "event-galleries.generated.json");
const PUBLIC_PREFIX = "/assets/events";

const IMAGE_EXTENSIONS = new Set([
	".jpg",
	".jpeg",
	".png",
	".webp",
	".avif",
	".gif",
]);

async function loadEvents() {
	if (!existsSync(EVENTS_JSON)) return [];
	try {
		const data = JSON.parse(await readFile(EVENTS_JSON, "utf8"));
		return Array.isArray(data.events) ? data.events : [];
	} catch (err) {
		console.warn(`warn: could not read ${path.relative(ROOT, EVENTS_JSON)}: ${err.message}`);
		return [];
	}
}

/** List immediate subdirectories of public/assets/events. */
async function listGalleryDirs() {
	if (!existsSync(EVENTS_DIR)) return [];
	const entries = await readdir(EVENTS_DIR, { withFileTypes: true });
	return entries.filter((e) => e.isDirectory()).map((e) => e.name);
}

/** List image files in a gallery dir, sorted by filename. */
async function listImages(dirName) {
	const dir = path.join(EVENTS_DIR, dirName);
	const entries = await readdir(dir, { withFileTypes: true });
	return entries
		.filter((e) => e.isFile() && IMAGE_EXTENSIONS.has(path.extname(e.name).toLowerCase()))
		.map((e) => e.name)
		.sort((a, b) => a.localeCompare(b, "en", { numeric: true }))
		.map((name) => `${PUBLIC_PREFIX}/${dirName}/${name}`);
}

/** A folder belongs to an event when it's `<id>` or starts with `<id>-`. */
function folderMatchesId(dirName, id) {
	return dirName === id || dirName.startsWith(`${id}-`);
}

/** Turn a title into a filesystem-friendly label, e.g. "Cory Levy Dinner!" -> "cory-levy-dinner". */
function slugify(title) {
	return (title ?? "")
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");
}

/** Folder name to scaffold for an event: `<id>-<title-slug>` (or bare id). */
function folderNameFor(event) {
	const slug = slugify(event.title);
	return slug ? `${event.id}-${slug}` : event.id;
}

async function main() {
	const events = await loadEvents();

	// Scaffold an empty folder for every event that doesn't have one yet, so
	// there's an obvious place to drop photos. Uses the bare id as the name;
	// rename it to add a label (e.g. `<id>-cory-levy-dinner`) if you like.
	if (events.length > 0) {
		await mkdir(EVENTS_DIR, { recursive: true });
		const existing = await listGalleryDirs();
		for (const event of events) {
			if (existing.some((d) => folderMatchesId(d, event.id))) continue;
			const dirName = folderNameFor(event);
			await mkdir(path.join(EVENTS_DIR, dirName), { recursive: true });
			console.log(`Created ${PUBLIC_PREFIX}/${dirName}/`);
		}
	}

	const dirs = await listGalleryDirs();
	const galleries = {};
	const matchedDirs = new Set();

	for (const event of events) {
		const matches = dirs.filter((d) => folderMatchesId(d, event.id));
		if (matches.length === 0) continue;
		if (matches.length > 1) {
			console.warn(
				`warn: multiple folders match event "${event.id}" (${matches.join(", ")}); using "${matches[0]}".`,
			);
		}
		const dirName = matches[0];
		matchedDirs.add(dirName);
		const images = await listImages(dirName);
		// Empty folders are expected (freshly scaffolded, no photos yet).
		if (images.length === 0) continue;
		galleries[event.id] = images;
	}

	for (const dirName of dirs) {
		if (!matchedDirs.has(dirName)) {
			console.warn(
				`warn: folder "${dirName}" does not match any known event id; its photos won't appear until an event uses that id as a prefix.`,
			);
		}
	}

	const output = {
		generatedAt: new Date().toISOString(),
		galleries,
	};
	await writeFile(OUTPUT_PATH, `${JSON.stringify(output, null, "\t")}\n`, "utf8");

	const count = Object.keys(galleries).length;
	console.log(`Wrote ${count} event ${count === 1 ? "gallery" : "galleries"} to ${path.relative(ROOT, OUTPUT_PATH)}`);

	// Help the user: show the folder name to create for each event.
	if (events.length > 0) {
		console.log("\nEvent folders (drop photos into public/assets/events/):");
		for (const e of events) {
			const has = galleries[e.id]?.length;
			const marker = has ? `✓ ${has} photo${has === 1 ? "" : "s"}` : "—";
			console.log(`  ${e.id}  [${marker}]  ${e.title ?? ""}`);
		}
	}
}

main().catch((err) => {
	console.error(`error: event gallery sync failed: ${err.message}`);
	process.exit(1);
});
