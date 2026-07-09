#!/usr/bin/env node
/**
 * Sync Chelsea Commons events from the Luma calendar API into
 * src/data/luma-events.generated.json.
 *
 * Runs server-side only (build time). The browser never talks to api.luma.com.
 */
import { existsSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUTPUT_PATH = path.join(ROOT, "src", "data", "luma-events.generated.json");

const CALENDAR_API_ID = process.env.LUMA_CALENDAR_API_ID || "cal-Ab7IiaASyPX2MKb";
const API_BASE = "https://api.luma.com";
const PAGINATION_LIMIT = 50;
const DETAIL_CONCURRENCY = 4;

const LUMA_HEADERS = {
	accept: "application/json",
	"x-luma-client-type": "luma-web",
	"x-luma-timezone": "America/New_York",
};

async function lumaFetch(pathname, params) {
	const url = new URL(pathname, API_BASE);
	for (const [k, v] of Object.entries(params)) {
		if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
	}
	const res = await fetch(url, { headers: LUMA_HEADERS });
	if (!res.ok) {
		throw new Error(`Luma API ${url.pathname} returned ${res.status} ${res.statusText}`);
	}
	return res.json();
}

/** Fetch all calendar entries for a given period, following cursor pagination. */
async function fetchAllEntries(period) {
	const entries = [];
	let cursor;
	for (;;) {
		const data = await lumaFetch("/calendar/get-items", {
			calendar_api_id: CALENDAR_API_ID,
			period,
			pagination_limit: PAGINATION_LIMIT,
			pagination_cursor: cursor,
		});
		const pageEntries = Array.isArray(data.entries) ? data.entries : [];
		entries.push(...pageEntries);
		if (data.has_more && data.next_cursor) {
			cursor = data.next_cursor;
		} else {
			break;
		}
	}
	return entries;
}

/** Convert Luma's ProseMirror-like description_mirror JSON to plain text. */
function descriptionMirrorToText(node) {
	if (!node || typeof node !== "object") return "";
	if (node.type === "text") return node.text ?? "";
	if (node.type === "hard_break") return "\n";
	const children = Array.isArray(node.content) ? node.content : [];
	const childText = children.map(descriptionMirrorToText);
	if (node.type === "doc") {
		return childText.filter((t) => t.trim().length > 0).join("\n\n");
	}
	// Paragraph-like blocks: return inline-joined content; doc joins blocks.
	return childText.join("");
}

function extractDescription(mirror) {
	const text = descriptionMirrorToText(mirror).replace(/\n{3,}/g, "\n\n").trim();
	return text.length > 0 ? text : undefined;
}

const dateFmtCache = new Map();
function getFormatters(timezone) {
	if (!dateFmtCache.has(timezone)) {
		dateFmtCache.set(timezone, {
			date: new Intl.DateTimeFormat("en-CA", {
				timeZone: timezone,
				year: "numeric",
				month: "2-digit",
				day: "2-digit",
			}),
			time: new Intl.DateTimeFormat("en-US", {
				timeZone: timezone,
				hour: "numeric",
				minute: "2-digit",
				hour12: true,
			}),
		});
	}
	return dateFmtCache.get(timezone);
}

function formatDate(iso, timezone) {
	return getFormatters(timezone).date.format(new Date(iso)); // en-CA -> YYYY-MM-DD
}

function formatTime(iso, timezone) {
	// Normalize narrow no-break spaces some ICU versions emit before AM/PM.
	return getFormatters(timezone).time.format(new Date(iso)).replace(/[\u202f\u00a0]/g, " ");
}

function normalizeLocation(geo) {
	if (!geo || typeof geo !== "object") return "Location TBA";
	if (geo.mode === "shown") {
		return geo.address || geo.short_address || geo.city_state || "New York, NY";
	}
	return geo.sublocality || geo.city_state || geo.city || "New York, NY";
}

function normalizeAddress(geo) {
	if (!geo || typeof geo !== "object" || geo.mode !== "shown") return undefined;
	return geo.full_address || geo.short_address || undefined;
}

function normalizeEntry(entry, status) {
	const event = entry.event ?? {};
	const timezone = event.timezone || "America/New_York";
	const geo = event.geo_address_info;
	const hosts = Array.isArray(entry.hosts)
		? entry.hosts.map((h) => ({
				name: h.name,
				avatar: h.avatar_url || undefined,
				username: h.username ?? null,
			}))
		: undefined;

	return {
		id: event.url || event.api_id,
		title: event.name,
		date: formatDate(event.start_at, timezone),
		time: formatTime(event.start_at, timezone),
		endTime: event.end_at ? formatTime(event.end_at, timezone) : undefined,
		location: normalizeLocation(geo),
		address: normalizeAddress(geo),
		image: event.cover_url || event.social_image_url || undefined,
		rsvpUrl: event.url ? `https://luma.com/${event.url}` : undefined,
		status,
		lumaEventApiId: event.api_id,
		lumaCalendarEventApiId: entry.api_id,
		hosts: hosts && hosts.length > 0 ? hosts : undefined,
	};
}

/** Run tasks with limited concurrency. */
async function mapWithConcurrency(items, limit, fn) {
	const results = new Array(items.length);
	let nextIndex = 0;
	async function worker() {
		for (;;) {
			const i = nextIndex++;
			if (i >= items.length) return;
			results[i] = await fn(items[i], i);
		}
	}
	await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
	return results;
}

async function attachDescriptions(events) {
	await mapWithConcurrency(events, DETAIL_CONCURRENCY, async (event) => {
		try {
			const data = await lumaFetch("/event/get", { event_api_id: event.lumaEventApiId });
			const description = extractDescription(data?.description_mirror);
			if (description) event.description = description;
		} catch (err) {
			console.warn(`warn: failed to fetch details for ${event.lumaEventApiId}: ${err.message}`);
		}
	});
}

function sortKey(e) {
	return `${e.date} ${e.time ?? ""}`;
}

async function main() {
	console.log(`Syncing Luma events for calendar ${CALENDAR_API_ID}...`);

	const [pastEntries, futureEntries] = await Promise.all([
		fetchAllEntries("past"),
		fetchAllEntries("future"),
	]);
	console.log(`Fetched ${pastEntries.length} past, ${futureEntries.length} future entries.`);

	const lumaEvents = [
		...pastEntries.map((e) => normalizeEntry(e, "past")),
		...futureEntries.map((e) => normalizeEntry(e, "upcoming")),
	];

	await attachDescriptions(lumaEvents);

	const upcoming = lumaEvents
		.filter((e) => e.status === "upcoming")
		.sort((a, b) => sortKey(a).localeCompare(sortKey(b)));
	const past = lumaEvents
		.filter((e) => e.status !== "upcoming")
		.sort((a, b) => sortKey(b).localeCompare(sortKey(a)));

	const output = {
		generatedAt: new Date().toISOString(),
		calendarApiId: CALENDAR_API_ID,
		events: [...upcoming, ...past].map((e) =>
			Object.fromEntries(Object.entries(e).filter(([, v]) => v !== undefined)),
		),
	};

	await writeFile(OUTPUT_PATH, `${JSON.stringify(output, null, "\t")}\n`, "utf8");
	console.log(`Wrote ${output.events.length} events to ${path.relative(ROOT, OUTPUT_PATH)}`);
}

main().catch((err) => {
	console.error(`error: Luma sync failed: ${err.message}`);
	if (existsSync(OUTPUT_PATH)) {
		console.error("Keeping existing generated file; not overwriting with partial data.");
		process.exit(0);
	}
	console.error("No existing generated file found; failing the build.");
	process.exit(1);
});
