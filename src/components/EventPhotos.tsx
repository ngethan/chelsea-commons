import { Link } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { getDisplayEvents } from "../lib/lumaEvents";

type Photo = {
	src: string;
	alt: string;
	/** Print-style date stamp, e.g. "06.02.26" */
	date: string;
};

const MAX_EVENT_PHOTOS = 9;

/** "2026-06-02" -> "06.02.26", matching the print-style date stamps. */
function stampDate(dateStr: string): string {
	const [y, m, d] = dateStr.split("-");
	return `${m}.${d}.${y.slice(2)}`;
}

/** The most recent past events that have a photo (gallery cover or Luma image). */
function pastEventPhotos(): Photo[] {
	return getDisplayEvents()
		.filter((e) => e.status === "past" && e.image)
		.sort((a, b) => b.date.localeCompare(a.date))
		.slice(0, MAX_EVENT_PHOTOS)
		.map((e) => ({
			src: e.image as string,
			alt: e.title,
			date: stampDate(e.date),
		}));
}

const PHOTOS: Photo[] = pastEventPhotos();

/** Alternating tilts and vertical nudges so the reel reads as prints pinned
 *  to a board rather than a grid. Hover squares a print back up. */
const TILTS = [
	"rotate-[-2.5deg]",
	"rotate-[1.75deg]",
	"rotate-[-1.25deg]",
	"rotate-[2.25deg]",
	"rotate-[-1.75deg]",
	"rotate-[1.25deg]",
];
const NUDGES = ["mt-1", "mt-5", "mt-0", "mt-6", "mt-2", "mt-4"];

function Tape({ tilt = "rotate-[-4deg]" }: { tilt?: string }) {
	return (
		<span
			aria-hidden
			className={`absolute -top-2.5 left-1/2 -translate-x-1/2 ${tilt} h-5 w-16 bg-secondary/80 border border-border/60`}
		/>
	);
}

function PhotoCard({ photo, index }: { photo: Photo; index: number }) {
	const [broken, setBroken] = useState(false);

	if (broken) return null;

	return (
		<motion.figure
			initial={{ opacity: 0, y: 20 }}
			whileInView={{ opacity: 1, y: 0 }}
			viewport={{ once: true, margin: "-50px" }}
			transition={{ duration: 0.4, delay: Math.min(index, 2) * 0.05 }}
			className={`relative shrink-0 snap-start ${NUDGES[index % NUDGES.length]}`}
		>
			<div
				className={`relative w-[68vw] sm:w-[300px] bg-card border border-border shadow-sm p-3 pb-13 ${TILTS[index % TILTS.length]}`}
			>
				<Tape tilt={index % 2 === 0 ? "rotate-[-4deg]" : "rotate-[3deg]"} />
				<img
					src={photo.src}
					alt={photo.alt}
					loading="lazy"
					decoding="async"
					onError={() => setBroken(true)}
					className="aspect-square w-full object-cover"
				/>
				<figcaption className="absolute bottom-3.5 inset-x-3 text-center font-mono text-xs lowercase text-muted-foreground truncate">
					{photo.alt} — {photo.date}
				</figcaption>
			</div>
		</motion.figure>
	);
}

/** The reward at the end of the photo reel: an empty frame waiting for you. */
function InviteCard() {
	return (
		<motion.figure
			initial={{ opacity: 0, y: 20 }}
			whileInView={{ opacity: 1, y: 0 }}
			viewport={{ once: true, margin: "-50px" }}
			transition={{ duration: 0.4 }}
			className="relative shrink-0 snap-start mt-3"
		>
			<div className="relative w-[68vw] sm:w-[300px] bg-card border border-border shadow-sm p-3 pb-13 rotate-[2deg]">
				<Tape />
				<div className="aspect-square w-full border border-border bg-muted/60 flex flex-col items-center justify-center gap-3 p-6 text-center">
					<p className="font-serif italic text-3xl text-foreground">
						You (hopefully)
					</p>
					<p className="text-sm text-muted-foreground max-w-[26ch] leading-relaxed">
						Come to the next one and we'll get you in a photo!
					</p>
					<Link
						to="/rsvp"
						target="_blank"
						rel="noopener noreferrer"
						className="no-underline text-sm uppercase tracking-wider text-foreground border-b border-foreground hover:text-muted-foreground hover:border-muted-foreground transition-colors pb-0.5"
					>
						RSVP →
					</Link>
				</div>
			</div>
		</motion.figure>
	);
}

export function EventPhotos() {
	const scrollerRef = useRef<HTMLDivElement>(null);
	const [canScrollLeft, setCanScrollLeft] = useState(false);
	const [canScrollRight, setCanScrollRight] = useState(true);

	useEffect(() => {
		const el = scrollerRef.current;
		if (!el) return;

		const update = () => {
			setCanScrollLeft(el.scrollLeft > 1);
			setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 1);
		};

		update();
		el.addEventListener("scroll", update, { passive: true });
		const observer = new ResizeObserver(update);
		observer.observe(el);
		return () => {
			el.removeEventListener("scroll", update);
			observer.disconnect();
		};
	}, []);

	const scrollByCard = (direction: 1 | -1) => {
		const el = scrollerRef.current;
		if (!el) return;
		const firstCard = el.querySelector("figure");
		const gap = 20;
		const cardWidth = firstCard ? firstCard.offsetWidth + gap : el.clientWidth;
		el.scrollBy({ left: direction * cardWidth, behavior: "smooth" });
	};

	return (
		<section className="py-16 border-t border-border" id="events">
			<div className="flex items-end justify-between gap-6 mb-8 px-6 md:px-12">
				<div className="flex flex-col gap-4">
					<h2 className="font-serif italic text-3xl md:text-4xl">
						Past events
					</h2>
					<p className="text-muted-foreground max-w-xl">
						Dinners, mixers, and gatherings across the city.
					</p>
				</div>
				<div className="shrink-0">
					<Link
						to="/events"
						className="no-underline text-sm uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
					>
						See all →
					</Link>
				</div>
			</div>

			<div
				ref={scrollerRef}
				className="overflow-x-auto overflow-y-hidden scrollbar-none snap-x snap-mandatory scroll-px-6 md:scroll-px-12 [mask-image:linear-gradient(to_right,transparent_0%,black_24px,black_calc(100%-24px),transparent_100%)] md:[mask-image:linear-gradient(to_right,transparent_0%,black_48px,black_calc(100%-48px),transparent_100%)]"
			>
				<div className="flex items-start gap-5 px-6 md:px-12 pt-6 pb-4 w-max">
					{PHOTOS.map((photo, index) => (
						<PhotoCard key={photo.src} photo={photo} index={index} />
					))}
					<InviteCard />
				</div>
			</div>

			<div className="flex items-center justify-between gap-6 px-6 md:px-12 mt-6">
				<p className="text-sm text-muted-foreground">
					Want to host or sponsor an event with us?{" "}
					<a
						href="mailto:hey@chelseacommons.co"
						className="text-foreground underline underline-offset-4 decoration-1 hover:text-muted-foreground transition-colors"
					>
						hey@chelseacommons.co
					</a>
				</p>
				<div className="flex shrink-0 gap-2">
					<button
						type="button"
						onClick={() => scrollByCard(-1)}
						disabled={!canScrollLeft}
						aria-label="Scroll photos left"
						className="flex h-11 w-11 items-center justify-center border border-border text-foreground hover:bg-foreground/5 transition-colors disabled:opacity-30 disabled:pointer-events-none"
					>
						<ChevronLeft className="w-4 h-4" />
					</button>
					<button
						type="button"
						onClick={() => scrollByCard(1)}
						disabled={!canScrollRight}
						aria-label="Scroll photos right"
						className="flex h-11 w-11 items-center justify-center border border-border text-foreground hover:bg-foreground/5 transition-colors disabled:opacity-30 disabled:pointer-events-none"
					>
						<ChevronRight className="w-4 h-4" />
					</button>
				</div>
			</div>
		</section>
	);
}
