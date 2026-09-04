/**
 * The wrapper email. Deliberately short: its only job is to get the reader
 * onto the post, which is where the tracked /u/<ref> link points and where the
 * real content lives. The campaign name is the post's slug, set per send, so
 * there is no campaign constant here.
 */
export const CAMPAIGN_FROM = "Chelsea Commons <hey@chelseacommons.co>";

/** Resend's batch endpoint caps at 100 messages per call. */
export const RESEND_BATCH_LIMIT = 100;

export function trackedLinkUrl(baseUrl: string, ref: string) {
	return `${baseUrl.replace(/\/$/, "")}/u/${ref}`;
}

export function trackingPixelUrl(baseUrl: string, ref: string) {
	return `${baseUrl.replace(/\/$/, "")}/api/open/${ref}`;
}

export type CampaignEmail = {
	ref: string;
	name?: string | null;
	baseUrl: string;
	/**
	 * The post's own `description`. Without it the email describes whichever
	 * post happened to be first, which is wrong the moment a second one ships.
	 */
	description?: string | null;
};

const DEFAULT_DESCRIPTION =
	"Where the house and the founding cohort stand, the partners we've signed, and a couple of things we could genuinely use your help with.";

/**
 * The body, once. The HTML and plain-text parts are two renderings of these
 * same lines rather than two copies of the prose, which is what let the two
 * drift apart the first time round. `link` marks where the tracked URL goes:
 * inline in HTML, on its own line in text.
 */
function paragraphs(opts: CampaignEmail): Array<string | { link: string }> {
	const greeting = opts.name?.trim() ? `Hi ${opts.name.trim()},` : "Hi,";
	const description = opts.description?.trim() || DEFAULT_DESCRIPTION;

	return [
		greeting,
		"You're receiving this because you've supported Chelsea Commons, whether with time, money, or advice. We're grateful for that.",
		`We put together an update. ${description.replace(/\.?$/, ".")}`,
		{ link: trackedLinkUrl(opts.baseUrl, opts.ref) },
		"Thank you again for being in our corner.",
		"– The Chelsea Commons team",
	];
}

export function renderCampaignEmail(opts: CampaignEmail) {
	// Zero styling on purpose: no <style>, no inline CSS, no wrapper widths, no
	// document shell. Every client then renders it in its own default font, so
	// it reads as a message someone typed rather than a designed campaign.
	//
	// The div/br structure is what Gmail's compose box itself emits, which is
	// why it survives Gmail's HTML sanitiser untouched and matches a hand-typed
	// mail exactly. &ndash; is written as an entity so the dash does not depend
	// on the charset header surviving.
	//
	// The 1x1 image is the only thing here that is not typed text; it is what
	// makes open tracking work at all, and it is the reason this is HTML rather
	// than a text/plain-only send.
	const body = paragraphs(opts)
		.map((part) =>
			typeof part === "string"
				? `<div>${part.replace("–", "&ndash;")}</div>`
				: `<div>You can <a href="${part.link}">read it here</a>.</div>`,
		)
		.join("<br>");

	const pixel = trackingPixelUrl(opts.baseUrl, opts.ref);
	return `<div dir="ltr">${body}</div><img src="${pixel}" width="1" height="1" alt="">`;
}

export function renderCampaignText(opts: CampaignEmail) {
	return paragraphs(opts)
		.map((part) =>
			typeof part === "string" ? part : `Read it here: ${part.link}`,
		)
		.join("\n\n");
}
