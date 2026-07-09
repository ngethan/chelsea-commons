import galleriesJson from "../data/event-galleries.generated.json";
import generatedJson from "../data/luma-events.generated.json";

export interface CCEventHost {
	name: string;
	avatar?: string;
	username?: string | null;
}

export interface CCEvent {
	id: string;
	title: string;
	date: string; // YYYY-MM-DD in event timezone
	time: string;
	endTime?: string;
	location: string;
	address?: string;
	description?: string;
	image?: string;
	rsvpUrl?: string;
	status: "upcoming" | "past";
	lumaEventApiId?: string;
	lumaCalendarEventApiId?: string;
	hosts?: CCEventHost[];
	/**
	 * Photos uploaded for this event, in display order. When present, the
	 * first image replaces `image` as the cover. Sourced from
	 * public/assets/events/<id>/ via scripts/sync-event-galleries.mjs.
	 */
	gallery?: string[];
}

const galleriesById = galleriesJson.galleries as Record<string, string[]>;

/**
 * Events synced from the Chelsea Commons Luma calendar at build time
 * (scripts/sync-luma-events.mjs), merged with any uploaded photo galleries
 * (scripts/sync-event-galleries.mjs). When an event has a gallery, its first
 * photo overrides the Luma cover image.
 */
export function getDisplayEvents(): CCEvent[] {
	const events = generatedJson.events as CCEvent[];
	return events.map((event) => {
		const gallery = galleriesById[event.id];
		if (!gallery || gallery.length === 0) return event;
		return { ...event, gallery, image: gallery[0] };
	});
}
