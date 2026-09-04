import { Link, createFileRoute } from "@tanstack/react-router";
import { motion } from "motion/react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { CityDitherPlate } from "../components/CityDitherPlate";
import { FitText } from "../components/FitText";
import { Button } from "../components/ui/button";
import { buildSeoTags } from "../site-config";

export const Route = createFileRoute("/fall2026")({
	head: () => {
		const seo = buildSeoTags({
			title: "Fall 2026 - Chelsea Commons",
			description:
				"Chelsea Commons is in six cities this fall: New York, Boston, San Francisco, Los Angeles, Austin, and Atlanta.",
			path: "/fall2026",
		});
		return {
			title: seo.title,
			meta: seo.meta,
			links: seo.links,
			// The root paints cream (page background, and a full-screen
			// #loading-screen splash) before this route's markup exists, which
			// reads as a white flash in front of a page that is entirely ink.
			// Server-rendered so it applies on first paint; !important because
			// the root sets those two inline.
			styles: [
				{
					children:
						"html,body{background-color:#2b2b2b!important}#loading-screen{background-color:#2b2b2b!important}",
				},
			],
		};
	},
	component: Fall2026,
});

type City = {
	name: string;
	state: string;
	slug: string;
	/**
	 * Where the landmark sits in the photograph, 0 to 1 from the left/top, so
	 * the crop can be panned onto it. Read off each picture by eye. Matters
	 * most on a phone, where the portrait crop keeps only the middle ~40% of a
	 * landscape frame and the subject is otherwise cut out entirely.
	 */
	focusX: number;
	focusY: number;
};

const CITIES: City[] = [
	// One World Trade and the Brooklyn Bridge tower, right of centre.
	{
		name: "New York",
		state: "NY",
		slug: "new-york",
		focusX: 0.68,
		focusY: 0.45,
	},
	// The near Zakim tower, well left of centre.
	{ name: "Boston", state: "MA", slug: "boston", focusX: 0.32, focusY: 0.5 },
	// The near Golden Gate tower.
	{
		name: "San Francisco",
		state: "CA",
		slug: "san-francisco",
		focusX: 0.31,
		focusY: 0.42,
	},
	// Downtown sits small and high; the light trails carry the lower frame.
	{
		name: "Los Angeles",
		state: "CA",
		slug: "los-angeles",
		focusX: 0.55,
		focusY: 0.42,
	},
	// Skyline sits right of centre over the water.
	{ name: "Austin", state: "TX", slug: "austin", focusX: 0.56, focusY: 0.45 },
	// Bank of America Plaza and the tower beside it, over the light trails.
	{ name: "Atlanta", state: "GA", slug: "atlanta", focusX: 0.52, focusY: 0.4 },
];

const cityImage = (city: City) => `/assets/cities/${city.slug}.jpg`;

/**
 * Where a row becomes the active one, as a fraction of the space *below the
 * header* rather than of the whole viewport. Measured from the header because
 * the header is much taller on a phone, where a fixed fraction of the viewport
 * left a dead gap between the button and the first city.
 *
 * Everything else is derived from it: the list is padded so the first row
 * starts on the line, and trailed so the last row can still reach it before
 * the page runs out of scroll.
 */
const LINE_BELOW_HEADER = 0.32;

const activeLine = (headerBottom: number) =>
	headerBottom + (window.innerHeight - headerBottom) * LINE_BELOW_HEADER;

/** Read once on mount so the server and the first client render agree. */
function usePrefersReducedMotion() {
	const [reduced, setReduced] = useState(false);

	useEffect(() => {
		const query = window.matchMedia("(prefers-reduced-motion: reduce)");
		const sync = () => setReduced(query.matches);
		sync();
		query.addEventListener("change", sync);
		return () => query.removeEventListener("change", sync);
	}, []);

	return reduced;
}

/**
 * The photograph of whichever city you're on, fixed behind the whole page.
 * Two shader canvases ping-pong so each change crossfades; mounting one per
 * city would mean six live WebGL contexts.
 */
function CityBackdrop({ index }: { index: number }) {
	const reduced = usePrefersReducedMotion();
	const [plate, setPlate] = useState<{
		slots: [number, number];
		active: 0 | 1;
	}>({ slots: [0, 0], active: 0 });

	// Warm the browser cache so a crossfade never reveals a texture that hasn't
	// loaded yet.
	useEffect(() => {
		for (const city of CITIES) {
			const img = new Image();
			img.src = cityImage(city);
		}
	}, []);

	// Hand the incoming city to whichever canvas is hidden, then flip.
	useEffect(() => {
		setPlate((prev) => {
			if (prev.slots[prev.active] === index) return prev;
			const active = (1 - prev.active) as 0 | 1;
			const slots: [number, number] = [...prev.slots];
			slots[active] = index;
			return { slots, active };
		});
	}, [index]);

	return (
		<div className="fixed inset-0 z-0 overflow-hidden bg-foreground">
			{plate.slots.map((slot, i) => (
				<div
					key={`plate-${i === 0 ? "a" : "b"}`}
					className={`absolute inset-0 transition-opacity ease-out ${
						reduced ? "duration-0" : "duration-500"
					} ${plate.active === i ? "opacity-100" : "opacity-0"}`}
				>
					<CityDitherPlate
						image={cityImage(CITIES[slot])}
						alt={CITIES[slot].name}
						focusX={CITIES[slot].focusX}
						focusY={CITIES[slot].focusY}
					/>
				</div>
			))}
			{/* Holds the type legible over six very different photographs. */}
			<div className="absolute inset-0 bg-foreground/70 md:bg-foreground/60" />
		</div>
	);
}

function Fall2026() {
	const [index, setIndex] = useState(0);
	const rowRefs = useRef<(HTMLLIElement | null)[]>([]);
	const headerRef = useRef<HTMLDivElement>(null);
	const listRef = useRef<HTMLElement>(null);
	const footerRef = useRef<HTMLDivElement>(null);
	const [listPad, setListPad] = useState<{ top: number; bottom: number }>({
		top: 0,
		bottom: 0,
	});
	const reduced = usePrefersReducedMotion();
	// The list stays hidden until it has been measured into position, so its
	// entrance covers the correction rather than the page visibly reflowing.
	const placed = listPad.top > 0;

	// Everything about the list's position is derived here: pushed clear of the
	// fixed header, with the first row parked on the sampling line, and trailed
	// by just enough room for the last row to reach that line too. The wordmark
	// below counts toward that room, so it is measured as well and the gap
	// shrinks by however tall it is. Observed rather than read once: the header
	// rewraps, and FitText resizes the wordmark after fonts load.
	useLayoutEffect(() => {
		const header = headerRef.current;
		if (!header) return;
		const footer = footerRef.current;

		const compute = () => {
			const headerH = header.offsetHeight;
			const footerH = footer?.offsetHeight ?? 0;
			const row = rowRefs.current[0]?.getBoundingClientRect().height ?? 0;
			const line = activeLine(headerH);
			setListPad({
				top: Math.max(headerH + 24, Math.round(line - row / 2)),
				// Only the second-to-last row has to reach the line under its own
				// steam; the last one is pinned by the end-of-page clamp. Sizing
				// for the last row reserved a row's worth of dead space before
				// the wordmark. The floor is just a visual gap.
				bottom: Math.max(
					64,
					Math.round(window.innerHeight - line - row * 1.5 - footerH),
				),
			});
		};

		compute();
		const observer = new ResizeObserver(compute);
		observer.observe(header);
		if (footer) observer.observe(footer);
		window.addEventListener("resize", compute);
		return () => {
			observer.disconnect();
			window.removeEventListener("resize", compute);
		};
	}, []);

	useEffect(() => {
		// Two jobs per scroll, sharing one pass of layout reads.
		const onScroll = () => {
			const headerBottom = headerRef.current?.offsetHeight ?? 0;

			// 1. Whichever row sits nearest a line below the header is the one on
			// show. Deliberately not an IntersectionObserver keyed to a narrow
			// band: when a callback landed with no row inside that band nothing
			// updated, so a fast scroll skipped cities and left the first one
			// selected at the bottom of the page. Nearest-row always resolves.
			const line = activeLine(headerBottom);
			let best = 0;
			let bestDistance = Number.POSITIVE_INFINITY;

			rowRefs.current.forEach((row, i) => {
				if (!row) return;
				const box = row.getBoundingClientRect();
				const distance = Math.abs((box.top + box.bottom) / 2 - line);
				if (distance < bestDistance) {
					bestDistance = distance;
					best = i;
				}
			});

			// Pin the ends. Nearest-row alone is a close call at the very top,
			// where the first row is hard against the header and the second sits
			// nearer the line: whether you land on the first city or the second
			// came down to a few pixels of viewport height. The clearance below
			// the header (see the list's padding) gives the first row room to
			// win on its own, and this guarantees it at any window size.
			const doc = document.documentElement;
			if (window.scrollY <= 4) best = 0;
			else if (window.scrollY + window.innerHeight >= doc.scrollHeight - 4)
				best = CITIES.length - 1;
			// React bails out when the value is unchanged, so this is free on the
			// vast majority of scroll events.
			setIndex(best);

			// 2. Rows vanish as they reach the header rather than sliding under
			// it. A mask on the list is anchored to the list's own box, so the
			// stops are re-derived from its current viewport position every
			// scroll to keep the fade parked just below the header.
			const list = listRef.current;
			if (!list) return;
			const top = list.getBoundingClientRect().top;
			// Fully gone until just past the header, then fade in over the next
			// stretch. The ramp used to start above the header bottom, which left
			// rows half-visible right where the title sits.
			const gone = headerBottom + 8 - top;
			const solid = headerBottom + 120 - top;
			const mask = `linear-gradient(to bottom, transparent ${gone}px, black ${solid}px)`;
			list.style.maskImage = mask;
			list.style.webkitMaskImage = mask;
		};

		onScroll();
		window.addEventListener("scroll", onScroll, { passive: true });
		window.addEventListener("resize", onScroll);
		return () => {
			window.removeEventListener("scroll", onScroll);
			window.removeEventListener("resize", onScroll);
		};
	}, []);

	return (
		<div className="relative">
			<CityBackdrop index={index} />

			<div
				ref={headerRef}
				className="fixed top-0 right-0 left-0 z-(--z-nav) px-6 pt-10 pb-10 md:px-12 md:pt-14 md:pb-14"
			>
				<div className="flex flex-col md:flex-row md:items-start md:justify-between md:gap-16">
					{/* The name stays upright: "Chelsea Commons" is never italicised,
				    in any medium (see AGENTS.md). The italic is carried by the
				    second line instead, which keeps the display serif the page
				    had. Drop the span's `italic` to set both lines upright. */}
					<h1 className="font-serif text-[clamp(2.25rem,5vw,3.75rem)] leading-[1.05] text-background">
						Chelsea Commons
						<br />
						<span className="italic">Fall 2026</span>
					</h1>

					<div className="mt-7 shrink-0 md:mt-0">
						{/* Inverted against the rest of the site: an ink button would
					    disappear into the photograph. link-static keeps the global
					    `main a` rule from repainting the label. */}
						<Button
							size="xl"
							className="link-static bg-background uppercase tracking-wider text-foreground hover:bg-background/90"
							asChild
						>
							<Link to="/rsvp" target="_blank" rel="noopener noreferrer">
								Sign up for events
							</Link>
						</Button>
					</div>
				</div>
			</div>

			<main
				ref={listRef}
				className="relative z-10 pt-[32rem] md:pt-[28rem]"
				style={listPad.top ? { paddingTop: listPad.top } : undefined}
			>
				<ul
					className="px-6 md:px-12"
					style={listPad.bottom ? { paddingBottom: listPad.bottom } : undefined}
				>
					{CITIES.map((city, i) => (
						<motion.li
							key={city.name}
							ref={(el) => {
								rowRefs.current[i] = el;
							}}
							initial={{ opacity: 0, y: 14 }}
							animate={placed ? { opacity: 1, y: 0 } : { opacity: 0, y: 14 }}
							transition={{
								duration: reduced ? 0 : 0.35,
								delay: reduced ? 0 : i * 0.09,
								ease: "easeOut",
							}}
							className="border-b border-background/30 first:border-t"
						>
							<div className="flex items-baseline gap-4 py-[5svh] md:gap-8 md:py-[6svh]">
								<span
									className={`font-mono text-base tracking-[0.18em] transition-colors duration-500 md:text-2xl ${
										i === index ? "text-background" : "text-background/70"
									}`}
								>
									{String(i + 1).padStart(2, "0")}
								</span>
								{/* Every city stays cream; the photograph behind is what
								    tells you which one you're on. */}
								<span
									className={`text-4xl font-medium leading-none tracking-tight text-background transition-opacity duration-500 md:text-7xl ${
										i === index ? "opacity-100" : "opacity-75"
									}`}
								>
									{city.name}
								</span>
								<span
									className={`ml-auto font-mono text-xs tracking-[0.18em] transition-colors duration-500 ${
										i === index ? "text-background" : "text-background/70"
									}`}
								>
									{city.state}
								</span>
							</div>
						</motion.li>
					))}
				</ul>

				{/* The site footer's wordmark on its own: no aurora, no contact row,
				    and cream rather than ink because this page is a dark field. */}
				{/* overflow-hidden for the same reason the site footer has it: FitText
				    derives its size from a 10px measurement, and the real render can
				    land a couple of pixels wider, which is enough to give the whole
				    page a horizontal scrollbar. */}
				<div ref={footerRef} className="overflow-hidden pb-[8svh] select-none">
					<FitText className="font-serif text-8xl leading-none tracking-tight text-background opacity-90">
						CHELSEA
					</FitText>
					<FitText className="font-serif text-8xl leading-none tracking-tight text-background opacity-90">
						COMMONS
					</FitText>
				</div>
			</main>
		</div>
	);
}
