import { createFileRoute } from "@tanstack/react-router";
import { CalendarDays, ExternalLink, MapPin, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { Footer } from "../components/Footer";
import { Navbar } from "../components/Navbar";
import { PartnersStrip } from "../components/PartnersStrip";
import { Button } from "../components/ui/button";
import { type CCEvent, getDisplayEvents, localDateStr } from "../lib/lumaEvents";
import { buildSeoTags } from "../site-config";

export const Route = createFileRoute("/events")({
	head: () => {
		const seo = buildSeoTags({
			title: "Events - Chelsea Commons",
			description:
				"Events, dinners, and gatherings throughout Summer 2026 in NYC",
			path: "/events",
		});
		return {
			title: seo.title,
			meta: seo.meta,
			links: seo.links,
		};
	},
	component: Events,
});

function formatLongDate(dateStr: string): string {
	const [y, m, day] = dateStr.split("-").map(Number);
	const d = new Date(y, m - 1, day);
	return d.toLocaleDateString("en-US", {
		weekday: "long",
		month: "long",
		day: "numeric",
	});
}

function formatShortDate(dateStr: string): string {
	const [y, m, day] = dateStr.split("-").map(Number);
	const d = new Date(y, m - 1, day);
	return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function EventTile({
	event,
	index,
	onClick,
}: {
	event: CCEvent;
	index: number;
	onClick: () => void;
}) {
	return (
		<motion.button
			type="button"
			onClick={onClick}
			initial={{ opacity: 0, y: 20 }}
			whileInView={{ opacity: 1, y: 0 }}
			viewport={{ once: true, margin: "-50px" }}
			transition={{ duration: 0.4, delay: index * 0.05 }}
			className="text-left group cursor-pointer w-full"
		>
			<div className="aspect-square bg-muted mb-4 overflow-hidden relative">
				{event.image ? (
					<img
						src={event.image}
						alt={event.title}
						loading="lazy"
						className="absolute inset-0 w-full h-full object-cover"
					/>
				) : (
					<div className="absolute inset-0 flex items-center justify-center px-6 text-center">
						<span className="font-serif italic text-foreground/80 text-3xl md:text-4xl leading-tight">
							{event.title}
						</span>
					</div>
				)}
			</div>
			<p className="text-foreground text-sm font-medium uppercase tracking-wider truncate">
				{event.title}
			</p>
			<p className="text-muted-foreground text-sm italic mt-1">
				{formatShortDate(event.date)} · {event.time} · {event.location}
			</p>
		</motion.button>
	);
}

function Section({
	title,
	events,
	emptyText,
	onSelect,
}: {
	title: string;
	events: CCEvent[];
	emptyText: string;
	onSelect: (e: CCEvent) => void;
}) {
	return (
		<section>
			<motion.h2
				initial={{ opacity: 0, y: 15 }}
				whileInView={{ opacity: 1, y: 0 }}
				viewport={{ once: true, margin: "-50px" }}
				transition={{ duration: 0.3 }}
				className="text-foreground text-4xl md:text-5xl font-normal tracking-tight mb-10 md:mb-14"
			>
				{title}
			</motion.h2>

			{events.length === 0 ? (
				<p className="text-muted-foreground text-base md:text-lg italic">
					{emptyText}
				</p>
			) : (
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-12">
					{events.map((event, i) => (
						<EventTile
							key={event.id}
							event={event}
							index={i}
							onClick={() => onSelect(event)}
						/>
					))}
				</div>
			)}
		</section>
	);
}

function EventDrawer({
	event,
	onClose,
}: {
	event: CCEvent | null;
	onClose: () => void;
}) {
	useEffect(() => {
		if (!event) return;
		const handler = (e: KeyboardEvent) => {
			if (e.key === "Escape") onClose();
		};
		window.addEventListener("keydown", handler);
		return () => window.removeEventListener("keydown", handler);
	}, [event, onClose]);

	useEffect(() => {
		document.body.style.overflow = event ? "hidden" : "";
		return () => {
			document.body.style.overflow = "";
		};
	}, [event]);

	return (
		<AnimatePresence>
			{event && (
				<>
					<motion.div
						key="backdrop"
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						transition={{ duration: 0.2 }}
						className="fixed inset-0 bg-foreground/50 backdrop-blur-sm z-(--z-modal-backdrop)"
						onClick={onClose}
					/>
					<motion.div
						key="drawer"
						initial={{ x: "100%" }}
						animate={{ x: 0 }}
						exit={{ x: "100%" }}
						transition={{ type: "spring", damping: 28, stiffness: 280 }}
						className="fixed right-0 top-0 h-full w-full sm:w-[500px] z-(--z-modal) flex flex-col overflow-hidden border-l border-border bg-popover"
					>
						<div className="shrink-0 flex items-center justify-between px-6 py-5 border-b border-border">
							<span className="text-muted-foreground text-sm tracking-widest uppercase">
								Event details
							</span>
							<button
								type="button"
								onClick={onClose}
								className="p-2 rounded-lg hover:bg-foreground/10 transition-colors text-muted-foreground hover:text-foreground"
							>
								<X className="w-5 h-5" />
							</button>
						</div>

						<div className="flex-1 overflow-y-auto">
							{event.gallery && event.gallery.length > 0 ? (
								<div className="grid grid-cols-2 gap-1">
									{event.gallery.map((src, i) => (
										<img
											key={src}
											src={src}
											alt={`${event.title} (${i + 1})`}
											loading={i === 0 ? undefined : "lazy"}
											className={`w-full h-full object-cover aspect-square ${
												i === 0 ? "col-span-2 aspect-video" : ""
											}`}
										/>
									))}
								</div>
							) : (
								event.image && (
									<img
										src={event.image}
										alt={event.title}
										className="w-full h-auto"
									/>
								)
							)}

							<div className="p-6 flex flex-col gap-6">
								<div>
									<h2 className="text-foreground text-3xl font-serif italic leading-tight">
										{event.title}
									</h2>
									{event.hosts && event.hosts.length > 0 && (
										<p className="text-muted-foreground text-sm italic mt-2">
											Hosted by {event.hosts.map((h) => h.name).join(", ")}
										</p>
									)}
								</div>

								<div className="flex flex-col gap-4">
									<div className="flex items-start gap-3">
										<CalendarDays className="w-5 h-5 text-muted-foreground mt-0.5 shrink-0" />
										<div>
											<p className="text-foreground text-base">
												{formatLongDate(event.date)}
											</p>
											<p className="text-muted-foreground text-base">
												{event.time}
												{event.endTime ? ` – ${event.endTime}` : ""}
											</p>
										</div>
									</div>
									<div className="flex items-start gap-3">
										<MapPin className="w-5 h-5 text-muted-foreground mt-0.5 shrink-0" />
										<div>
											<p className="text-foreground text-base">
												{event.location}
											</p>
											{event.address && (
												<p className="text-muted-foreground text-sm mt-0.5">
													{event.address}
												</p>
											)}
										</div>
									</div>
								</div>

								{event.description && (
									<div>
										<p className="text-muted-foreground text-xs uppercase tracking-widest mb-3">
											About
										</p>
										<p className="text-foreground/80 text-base leading-relaxed whitespace-pre-line">
											{event.description}
										</p>
									</div>
								)}

								{event.date >= localDateStr() && (
									<div className="pt-2">
										{event.rsvpUrl ? (
											<Button
												size="xl"
												className="w-full bg-foreground text-background hover:bg-foreground/90 text-sm md:text-base tracking-wider uppercase"
												asChild
											>
												<a
													href={event.rsvpUrl}
													target="_blank"
													rel="noopener noreferrer"
												>
													RSVP <ExternalLink className="w-4 h-4" />
												</a>
											</Button>
										) : (
											<p className="text-muted-foreground text-sm italic text-center">
												By invitation only
											</p>
										)}
									</div>
								)}
							</div>
						</div>
					</motion.div>
				</>
			)}
		</AnimatePresence>
	);
}

function Events() {
	const [selectedEvent, setSelectedEvent] = useState<CCEvent | null>(null);
	const allEvents = getDisplayEvents();
	const today = localDateStr();

	const upcoming = allEvents
		.filter((e) => e.date >= today)
		.sort((a, b) => a.date.localeCompare(b.date));
	const past = allEvents
		.filter((e) => e.date < today)
		.sort((a, b) => b.date.localeCompare(a.date));

	return (
		<div className="min-h-dvh relative z-10">
			<Navbar />
			<main className="px-6 md:px-12 pt-12 md:pt-16 pb-24">
				<div className="flex items-end justify-between gap-6 mb-10 md:mb-14">
					<div className="max-w-3xl">
						<h1 className="text-foreground text-4xl md:text-6xl font-serif italic mb-5 leading-tight">
							Events & Mixers
						</h1>
						<p className="text-muted-foreground text-base md:text-lg leading-relaxed">
							Chelsea Commons is hosting curated dinners, mixers, and gatherings
							all summer in NYC for builders, operators, and founders.
						</p>
					</div>
				</div>

				<div className="border-t border-border mb-10 md:mb-14" />

				<Section
					title="Upcoming Events"
					events={upcoming}
					emptyText="No upcoming events right now. Check back soon."
					onSelect={setSelectedEvent}
				/>

				<div className="border-t border-border my-10 md:my-14" />

				<Section
					title="Past Events"
					events={past}
					emptyText="No past events yet."
					onSelect={setSelectedEvent}
				/>
			</main>

			<PartnersStrip label="Thank you to our partners" />

			<Footer />

			<EventDrawer
				event={selectedEvent}
				onClose={() => setSelectedEvent(null)}
			/>
		</div>
	);
}
