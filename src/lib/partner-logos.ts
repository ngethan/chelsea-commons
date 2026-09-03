/**
 * Name to logo, so a ```partners block in a post lists plain names and the
 * renderer resolves the artwork.
 *
 * Keys are kept in step with the display names in PartnersStrip.tsx and
 * LogoStrip.tsx, which hold their own copies of this mapping. Those three
 * lists should really be one exported registry the strips select from; until
 * then, prefer the name as those files spell it when adding an entry here.
 */
export const PARTNER_LOGOS: Record<string, string> = {
	a16z: "/assets/partners/a16z-logo.webp",
	Amazon: "/assets/partners/amazon-logo.png",
	BoxGroup: "/assets/partners/boxgroup-logo.png",
	Cursor: "/assets/partners/cursor-logo.webp",
	Felicis: "/assets/partners/felicis-logo.png",
	"First Round Capital": "/assets/partners/firstround-logo.webp",
	"General Catalyst": "/assets/partners/generalcatalyst-logo.png",
	"Harvey AI": "/assets/partners/harvey-logo.png",
	"Lerer Hippeau": "/assets/partners/lererhippeau-logo.png",
	M13: "/assets/partners/m13-logo.png",
	"Menlo Ventures": "/assets/partners/menloventures-logo.png",
	Mercury: "/assets/partners/mercury-logo.webp",
	OpenAI: "/assets/partners/openai-logo.webp",
	"Pareto Holdings": "/assets/partners/pareto-logo.png",
	Ramp: "/assets/partners/ramp-logo.png",
	Rho: "/assets/partners/rho-logo.webp",
	Soxton: "/assets/partners/soxton-logo.png",
	"TQ Ventures": "/assets/partners/tqventures-logo.png",
	"Z Fellows": "/assets/partners/zfellows-logo.png",
	"8VC": "/assets/brands/8vc-logo.png",
	BCG: "/assets/brands/bcg-logo.png",
	BlackRock: "/assets/brands/blackrock-logo.png",
	Figma: "/assets/brands/figma-logo.png",
	"JPMorgan Chase": "/assets/brands/jpmc-logo.png",
	KPMG: "/assets/brands/kpmg-logo.webp",
	Nvidia: "/assets/brands/nvidia-logo.png",
	Robinhood: "/assets/brands/robinhood-logo.svg",
	"Scale AI": "/assets/brands/scale-logo.webp",
	"Teamworthy Ventures": "/assets/brands/teamworthy-logo.png",
	"Verition Fund Management": "/assets/brands/verition-logo.webp",
	Warp: "/assets/brands/warp-logo.png",
	"Y Combinator": "/assets/brands/yc-logo.svg",
};

/**
 * Names are matched loosely: case, spaces and punctuation are ignored, so the
 * spelling on the marketing pages ("Harvey AI") and a shorter one written in a
 * letter ("Harvey") both resolve. A miss returns null and the caller renders
 * the plain name, so a typo degrades to text rather than a blank cell.
 */
const NORMALIZED = new Map(
	Object.entries(PARTNER_LOGOS).map(([name, logo]) => [normalize(name), logo]),
);

function normalize(name: string) {
	return name.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function partnerLogo(name: string) {
	return NORMALIZED.get(normalize(name)) ?? null;
}
