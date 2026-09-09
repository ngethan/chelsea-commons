/**
 * Clicks that were not a person.
 *
 * Every link goes out in an email you wrote by hand, so between you and the
 * reader sit link unfurlers (Slack, iMessage, WhatsApp), mail security
 * scanners that follow every URL on delivery, and the odd crawler. Each one
 * is a GET on /u/<ref> and each one looks exactly like the reader opening it.
 *
 * The filter runs on read, not on write: every hit is stored with its user
 * agent, and this predicate decides which of them to count. That way the
 * heuristic can be wrong today and improved next month without having thrown
 * the evidence away, which is not true of a filter baked into the insert.
 */
const AUTOMATED = [
	// Chat and social unfurlers.
	/slackbot/i,
	/twitterbot/i,
	/facebookexternalhit/i,
	/whatsapp/i,
	/telegrambot/i,
	/discordbot/i,
	/linkedinbot/i,
	/skypeuripreview/i,
	/redditbot/i,
	/embedly/i,
	/iframely/i,
	// Mail clients and the proxies in front of them.
	/googleimageproxy/i,
	/ms-office/i,
	/microsoft office/i,
	/outlook/i,
	/safelinks/i,
	// Mail security, which follows links on delivery.
	/proofpoint/i,
	/mimecast/i,
	/barracuda/i,
	/symantec/i,
	/forcepoint/i,
	/urldefense/i,
	// Scripted fetches.
	/curl\//i,
	/wget/i,
	/python-requests/i,
	/node-fetch/i,
	/axios/i,
	/headlesschrome/i,
	/phantomjs/i,
	// The long tail. Deliberately last: anything self-describing as a bot is
	// telling the truth, and the specific patterns above are the ones that do
	// not.
	/bot\b/i,
	/crawler/i,
	/spider/i,
	/preview/i,
	/scanner/i,
	/fetcher/i,
];

export function isAutomatedClick(
	userAgent: string | null | undefined,
): boolean {
	// No user agent at all is a script often enough, and a browser that sends
	// none is rare enough, that not counting it is the better mistake.
	if (!userAgent || !userAgent.trim()) return true;
	return AUTOMATED.some((pattern) => pattern.test(userAgent));
}

/**
 * Browsers and some mail clients warm a link before anybody has decided to
 * open it. Both headers are the request saying so, and neither is a click.
 */
export function isPrefetch(request: Request): boolean {
	const purpose =
		request.headers.get("sec-purpose") ??
		request.headers.get("purpose") ??
		request.headers.get("x-purpose");
	return Boolean(purpose && /prefetch|preview|prerender/i.test(purpose));
}
