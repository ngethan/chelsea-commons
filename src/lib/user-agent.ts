/**
 * A user agent string, said in three words: the browser and the device,
 * which is what somebody reading a list of opens wants to know. The full
 * string stays on the row as a tooltip for the day the guess is wrong.
 */
const BROWSERS: Array<[RegExp, string]> = [
	[/edg(e|a|ios)?\//i, "Edge"],
	[/opr\/|opera/i, "Opera"],
	[/samsungbrowser/i, "Samsung Internet"],
	[/firefox|fxios/i, "Firefox"],
	[/crios|chrome/i, "Chrome"],
	[/safari/i, "Safari"],
];

const DEVICES: Array<[RegExp, string]> = [
	[/ipad/i, "iPad"],
	[/iphone/i, "iPhone"],
	[/android/i, "Android"],
	[/windows/i, "Windows"],
	[/macintosh|mac os x/i, "Mac"],
	[/cros/i, "ChromeOS"],
	[/linux/i, "Linux"],
];

export function describeAgent(userAgent: string | null | undefined): string {
	if (!userAgent?.trim()) return "";
	const browser = BROWSERS.find(([re]) => re.test(userAgent))?.[1];
	const device = DEVICES.find(([re]) => re.test(userAgent))?.[1];
	if (browser && device) return `${browser} on ${device}`;
	return browser ?? device ?? "";
}
