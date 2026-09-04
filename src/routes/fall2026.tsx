import { Link, createFileRoute } from "@tanstack/react-router";
import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { CityDitherPlate } from "../components/CityDitherPlate";
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
		};
	},
	component: Fall2026,
});

type City = {
	name: string;
	state: string;
	slug: string;
};

const CITIES: City[] = [
	{ name: "New York", state: "NY", slug: "new-york" },
	{ name: "Boston", state: "MA", slug: "boston" },
	{ name: "San Francisco", state: "CA", slug: "san-francisco" },
	{ name: "Los Angeles", state: "CA", slug: "los-angeles" },
	{ name: "Austin", state: "TX", slug: "austin" },
	{ name: "Atlanta", state: "GA", slug: "atlanta" },
];

const cityImage = (city: City) => `/assets/cities/${city.slug}.jpg`;

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
					/>
				</div>
			))}
			{/* Holds the type legible over six very different photographs. */}
			<div className="absolute inset-0 bg-foreground/55" />
		</div>
	);
}

function Fall2026() {
	const [index, setIndex] = useState(0);
	const rowRefs = useRef<(HTMLLIElement | null)[]>([]);
	const headerRef = useRef<HTMLDivElement>(null);
	const listRef = useRef<HTMLElement>(null);
	const [headerHeight, setHeaderHeight] = useState(0);

	// The header is fixed, so the list has to be pushed clear of it by however
	// tall it actually is. Measured rather than guessed: the title and the CTA
	// beside it wrap differently at every width.
	useEffect(() => {
		const el = headerRef.current;
		if (!el) return;
		const measure = () => setHeaderHeight(el.offsetHeight);
		measure();
		const observer = new ResizeObserver(measure);
		observer.observe(el);
		return () => observer.disconnect();
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
			const line = window.innerHeight * 0.62;
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
			const gone = headerBottom - 24 - top;
			const solid = headerBottom + 56 - top;
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
				<div className="flex flex-col gap-10 md:flex-row md:items-start md:justify-between md:gap-16">
					<div className="max-w-xl">
						{/* The name stays upright: "Chelsea Commons" is never italicised,
						    in any medium (see AGENTS.md). The italic is carried by the
						    second line instead, which keeps the display serif the page
						    had. Drop the span's `italic` to set both lines upright. */}
						<motion.h1
							initial={{ opacity: 0, y: 15 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.4, ease: "easeOut" }}
							className="font-serif text-[clamp(2.25rem,5vw,3.75rem)] leading-[1.05] text-background"
						>
							Chelsea Commons
							<br />
							<span className="italic">Fall 2026</span>
						</motion.h1>
					</div>

					<motion.div
						initial={{ opacity: 0, y: 15 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.4, ease: "easeOut", delay: 0.1 }}
						className="flex shrink-0 flex-col items-start gap-4 md:items-end md:text-right"
					>
						<h2 className="font-serif text-2xl italic leading-tight text-background md:text-3xl">
							Come to an event
						</h2>
						{/* Inverted against the rest of the site: an ink button would
						    disappear into the photograph. link-static keeps the global
						    `main a` rule from repainting the label. */}
						<Button
							size="xl"
							className="link-static mt-1 bg-background uppercase tracking-wider text-foreground hover:bg-background/90"
							asChild
						>
							<Link to="/rsvp" target="_blank" rel="noopener noreferrer">
								Sign up for events
							</Link>
						</Button>
					</motion.div>
				</div>
			</div>

			<main
				ref={listRef}
				className="relative z-10 pt-[32rem] md:pt-[28rem]"
				style={headerHeight ? { paddingTop: headerHeight + 120 } : undefined}
			>
				<ul className="px-6 md:px-12">
					{CITIES.map((city, i) => (
						<li
							key={city.name}
							ref={(el) => {
								rowRefs.current[i] = el;
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
						</li>
					))}
				</ul>
			</main>
		</div>
	);
}
