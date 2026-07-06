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
}

/**
 * Events synced from the Chelsea Commons Luma calendar at build time
 * (scripts/sync-luma-events.mjs).
 */
export function getDisplayEvents(): CCEvent[] {
	return generatedJson.events as CCEvent[];
}
