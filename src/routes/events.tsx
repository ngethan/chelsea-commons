import { createFileRoute } from "@tanstack/react-router";
import {
	CalendarDays,
	ChevronLeft,
	ChevronRight,
	Clock,
	ExternalLink,
	LayoutGrid,
	List,
	MapPin,
	Search,
	X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { Navbar } from "../components/Navbar";
import eventsJson from "../data/events.json";
import { cn } from "../lib/utils";
import { buildSeoTags } from "../site-config";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Host {
	name: string;
	avatar: string;
}

interface CCEvent {
	id: string;
	title: string;
	date: string;
	time: string;
	endTime?: string;
	location: string;
	address?: string;
	description?: string;
	hosts: Host[];
	image?: string;
	rsvpUrl?: string;
	status: string;
}

// ─── Route ───────────────────────────────────────────────────────────────────

export const Route = createFileRoute("/events")({
	head: () => {
		const seo = buildSeoTags({
			title: "Events - THE CHELSEA COMMONS",
			description:
				"Exclusive events, dinners, and intern mixers throughout Summer 2026 in NYC",
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

// ─── Helpers ─────────────────────────────────────────────────────────────────

function localDateStr(): string {
	const d = new Date();
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatDateHeader(dateStr: string): string {
	const [y, m, day] = dateStr.split("-").map(Number);
	const d = new Date(y, m - 1, day);
	const weekday = d.toLocaleDateString("en-US", { weekday: "long" });
	const month = d.toLocaleDateString("en-US", { month: "long" });
	return `${month} ${day} · ${weekday}`;
}

function formatMonthYear(year: number, month: number): string {
	return new Date(year, month, 1).toLocaleDateString("en-US", {
		month: "long",
		year: "numeric",
	});
}

function groupByDate(
	events: CCEvent[],
): Array<{ date: string; events: CCEvent[] }> {
	const map: Record<string, CCEvent[]> = {};
	for (const e of events) {
		if (!map[e.date]) map[e.date] = [];
		map[e.date].push(e);
	}
	return Object.entries(map)
		.sort(([a], [b]) => a.localeCompare(b))
		.map(([date, evts]) => ({ date, events: evts }));
}

// ─── HostAvatars ─────────────────────────────────────────────────────────────

function HostAvatars({ hosts }: { hosts: Host[] }) {
	const visible = hosts.slice(0, 3);
	const extra = hosts.length - 3;
	const names = hosts.map((h) => h.name.split(" ")[0]).join(", ");

	return (
		<div className="flex items-center gap-2.5 min-w-0">
			<div className="flex -space-x-2 shrink-0">
				{visible.map((host) => (
					<img
						key={host.name}
						src={host.avatar}
						alt={host.name}
						className="w-6 h-6 rounded-full border border-white/20 object-cover"
					/>
				))}
				{extra > 0 && (
					<div className="w-6 h-6 rounded-full bg-muted border border-white/10 flex items-center justify-center text-[10px] text-muted-foreground">
						+{extra}
					</div>
				)}
			</div>
			<span className="text-muted-foreground text-sm truncate">{names}</span>
		</div>
	);
}

// ─── EventCard (grid view) ────────────────────────────────────────────────────

function EventCard({
	event,
	onClick,
	isSelected,
}: {
	event: CCEvent;
	onClick: () => void;
	isSelected: boolean;
}) {
	return (
		<motion.button
			type="button"
			onClick={onClick}
			whileHover={{ y: -1 }}
			transition={{ duration: 0.15 }}
			className={cn(
				"w-full text-left rounded-xl border transition-colors duration-150 overflow-hidden flex",
				isSelected
					? "border-white/25 bg-white/[0.08]"
					: "border-border bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/15",
			)}
		>
			<div className="flex-1 p-5 flex flex-col gap-3 min-w-0">
				<div className="flex items-center gap-2">
					<Clock className="w-4 h-4 text-muted-foreground shrink-0" />
					<span className="text-muted-foreground text-sm">
						{event.time}
						{event.endTime ? ` – ${event.endTime}` : ""}
					</span>
				</div>
				<h3 className="text-foreground font-medium text-lg leading-snug">
					{event.title}
				</h3>
				{event.hosts.length > 0 && <HostAvatars hosts={event.hosts} />}
				<div className="flex items-center gap-2">
					<MapPin className="w-4 h-4 text-muted-foreground shrink-0" />
					<span className="text-muted-foreground text-sm truncate">
						{event.location}
					</span>
				</div>
			</div>
			{event.image && (
				<div className="w-24 shrink-0 m-4 ml-0 rounded-lg overflow-hidden self-center">
					<img
						src={event.image}
						alt={event.title}
						className="w-full aspect-square object-cover"
					/>
				</div>
			)}
		</motion.button>
	);
}

// ─── EventRow (list view) ─────────────────────────────────────────────────────

function EventRow({
	event,
	onClick,
	isSelected,
}: {
	event: CCEvent;
	onClick: () => void;
	isSelected: boolean;
}) {
	return (
		<motion.button
			type="button"
			onClick={onClick}
			whileHover={{ x: 2 }}
			transition={{ duration: 0.15 }}
			className={cn(
				"w-full text-left py-3 px-4 rounded-lg border transition-colors duration-150 flex items-center gap-4",
				isSelected
					? "border-white/25 bg-white/[0.08]"
					: "border-transparent hover:bg-white/[0.04] hover:border-border",
			)}
		>
			<div className="flex items-center gap-2 shrink-0">
				<Clock className="w-4 h-4 text-muted-foreground" />
				<span className="text-muted-foreground text-sm w-20">{event.time}</span>
			</div>
			<div className="flex-1 flex items-center gap-2.5 min-w-0">
				<span className="text-foreground text-base font-medium truncate">
					{event.title}
				</span>
				<div className="hidden sm:flex items-center gap-1.5 shrink-0 text-muted-foreground">
					<span className="text-muted-foreground/40">·</span>
					<MapPin className="w-3.5 h-3.5" />
					<span className="text-sm">{event.location}</span>
				</div>
			</div>
		</motion.button>
	);
}

// ─── MiniCalendar ─────────────────────────────────────────────────────────────

function MiniCalendar({
	eventDates,
	onDateClick,
}: {
	eventDates: Set<string>;
	onDateClick: (date: string) => void;
}) {
	const now = new Date();
	const [year, setYear] = useState(now.getFullYear());
	const [month, setMonth] = useState(now.getMonth());

	const daysInMonth = new Date(year, month + 1, 0).getDate();
	const firstDay = new Date(year, month, 1).getDay();
	const today = localDateStr();

	const cells: (number | null)[] = [
		...Array<null>(firstDay).fill(null),
		...Array.from({ length: daysInMonth }, (_, i) => i + 1),
	];

	function prevMonth() {
		if (month === 0) {
			setYear((y) => y - 1);
			setMonth(11);
		} else {
			setMonth((m) => m - 1);
		}
	}

	function nextMonth() {
		if (month === 11) {
			setYear((y) => y + 1);
			setMonth(0);
		} else {
			setMonth((m) => m + 1);
		}
	}

	return (
		<div className="border border-border rounded-xl p-5 bg-white/[0.03]">
			<div className="flex items-center justify-between mb-5">
				<button
					type="button"
					onClick={prevMonth}
					className="p-1.5 rounded hover:bg-white/10 transition-colors text-muted-foreground hover:text-foreground"
				>
					<ChevronLeft className="w-5 h-5" />
				</button>
				<span className="text-foreground text-lg font-semibold">
					{formatMonthYear(year, month)}
				</span>
				<button
					type="button"
					onClick={nextMonth}
					className="p-1.5 rounded hover:bg-white/10 transition-colors text-muted-foreground hover:text-foreground"
				>
					<ChevronRight className="w-5 h-5" />
				</button>
			</div>

			<div className="grid grid-cols-7 mb-2">
				{["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
					<div
						key={d}
						className="text-center text-sm text-muted-foreground py-2"
					>
						{d}
					</div>
				))}
			</div>

			<div className="grid grid-cols-7 gap-y-1.5">
				{cells.map((day, i) => {
					if (!day) return <div key={`empty-${i}`} />;
					const ds = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
					const hasEvent = eventDates.has(ds);
					const isToday = ds === today;
					return (
						<button
							key={ds}
							type="button"
							onClick={() => hasEvent && onDateClick(ds)}
							disabled={!hasEvent}
							className={cn(
								"relative flex flex-col items-center justify-center h-10 rounded-lg text-sm transition-colors",
								hasEvent
									? "cursor-pointer hover:bg-white/10 text-foreground font-medium"
									: "cursor-default text-muted-foreground",
								isToday && "ring-1 ring-white/20",
							)}
						>
							<span>{day}</span>
							{hasEvent && (
								<span className="absolute bottom-1 w-1.5 h-1.5 rounded-full bg-foreground/50" />
							)}
						</button>
					);
				})}
			</div>
		</div>
	);
}

// ─── EventDrawer ─────────────────────────────────────────────────────────────

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
						className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
						onClick={onClose}
					/>
					<motion.div
						key="drawer"
						initial={{ x: "100%" }}
						animate={{ x: 0 }}
						exit={{ x: "100%" }}
						transition={{ type: "spring", damping: 28, stiffness: 280 }}
						className="fixed right-0 top-0 h-full w-full sm:w-[500px] z-50 flex flex-col overflow-hidden border-l border-border"
						style={{ backgroundColor: "oklch(0.17 0 0)" }}
					>
						<div
							className="shrink-0 flex items-center justify-between px-6 py-5 border-b border-border"
							style={{ backgroundColor: "oklch(0.17 0 0)" }}
						>
							<span className="text-muted-foreground text-base">
								Event details
							</span>
							<button
								type="button"
								onClick={onClose}
								className="p-2 rounded-lg hover:bg-white/10 transition-colors text-muted-foreground hover:text-foreground"
							>
								<X className="w-5 h-5" />
							</button>
						</div>

						<div className="flex-1 overflow-y-auto">
							{event.image && (
								<div className="w-full h-56 shrink-0 overflow-hidden">
									<img
										src={event.image}
										alt={event.title}
										className="w-full h-full object-cover"
									/>
								</div>
							)}

							<div className="p-6 flex flex-col gap-6">
								<h2 className="text-foreground text-3xl font-medium leading-tight">
									{event.title}
								</h2>

								<div className="flex flex-col gap-4">
									<div className="flex items-start gap-3">
										<CalendarDays className="w-5 h-5 text-muted-foreground mt-0.5 shrink-0" />
										<div>
											<p className="text-foreground text-base">
												{formatDateHeader(event.date)}
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

								{event.hosts.length > 0 && (
									<div>
										<p className="text-muted-foreground text-[11px] uppercase tracking-widest mb-4">
											Hosted by
										</p>
										<div className="flex flex-col gap-3">
											{event.hosts.map((host) => (
												<div
													key={host.name}
													className="flex items-center gap-3"
												>
													<img
														src={host.avatar}
														alt={host.name}
														className="w-10 h-10 rounded-full object-cover border border-border"
													/>
													<span className="text-foreground text-base">
														{host.name}
													</span>
												</div>
											))}
										</div>
									</div>
								)}

								{event.description && (
									<div>
										<p className="text-muted-foreground text-[11px] uppercase tracking-widest mb-3">
											About
										</p>
										<p className="text-foreground/75 text-base leading-relaxed">
											{event.description}
										</p>
									</div>
								)}

								<div className="pt-2">
									{event.rsvpUrl ? (
										<a
											href={event.rsvpUrl}
											target="_blank"
											rel="noopener noreferrer"
											className="w-full flex items-center justify-center gap-2 bg-foreground text-background rounded-lg py-4 text-base font-medium hover:opacity-90 transition-opacity"
										>
											RSVP <ExternalLink className="w-4 h-4" />
										</a>
									) : (
										<button
											type="button"
											disabled
											className="w-full flex items-center justify-center bg-white/5 text-muted-foreground rounded-lg py-4 text-base cursor-not-allowed"
										>
											RSVP coming soon
										</button>
									)}
								</div>
							</div>
						</div>
					</motion.div>
				</>
			)}
		</AnimatePresence>
	);
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function Events() {
	const [activeTab, setActiveTab] = useState<"upcoming" | "past">("upcoming");
	const [selectedEvent, setSelectedEvent] = useState<CCEvent | null>(null);
	const [searchQuery, setSearchQuery] = useState("");
	const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
	const dateRefs = useRef<Record<string, HTMLDivElement | null>>({});

	const allEvents = eventsJson.events as CCEvent[];
	const today = localDateStr();

	const filteredEvents = allEvents
		.filter((e) =>
			activeTab === "upcoming" ? e.date >= today : e.date < today,
		)
		.filter((e) => {
			if (!searchQuery.trim()) return true;
			const q = searchQuery.toLowerCase();
			return (
				e.title.toLowerCase().includes(q) ||
				e.location.toLowerCase().includes(q) ||
				e.hosts.some((h) => h.name.toLowerCase().includes(q))
			);
		});

	const grouped = groupByDate(filteredEvents);
	const eventDates = new Set(allEvents.map((e) => e.date));

	function scrollToDate(dateStr: string) {
		const match = allEvents.find((e) => e.date === dateStr);
		if (!match) return;
		const targetTab = match.date >= today ? "upcoming" : "past";
		setActiveTab(targetTab);
		setTimeout(() => {
			dateRefs.current[dateStr]?.scrollIntoView({
				behavior: "smooth",
				block: "start",
			});
		}, 80);
	}

	const emptyMessage = searchQuery.trim()
		? `No events match "${searchQuery}"`
		: `No ${activeTab} events.`;

	return (
		<div className="min-h-dvh relative z-10">
			<Navbar />
			<main className="px-6 md:px-12 pt-8 pb-24">
				{/* Page header */}
				<motion.div
					initial={{ opacity: 0, y: 15 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.4, ease: "easeOut" }}
					className="mb-6"
				>
					<h1 className="text-foreground text-4xl md:text-5xl font-serif italic mb-3">
						Events & Mixers
					</h1>
					<p className="text-muted-foreground text-base md:text-lg">
						Exclusive events, dinners, and mixers throughout Summer 2026.
					</p>
				</motion.div>

				{/* Two-column layout */}
				<div className="flex gap-10 items-start">
					{/* Left: timeline + event list */}
					<div className="flex-1 min-w-0">
						<AnimatePresence mode="wait">
							{grouped.length === 0 ? (
								<motion.p
									key="empty"
									initial={{ opacity: 0 }}
									animate={{ opacity: 1 }}
									exit={{ opacity: 0 }}
									className="text-muted-foreground text-base py-16 text-center"
								>
									{emptyMessage}
								</motion.p>
							) : (
								<motion.div
									key={`${activeTab}-${viewMode}`}
									initial={{ opacity: 0, y: 8 }}
									animate={{ opacity: 1, y: 0 }}
									exit={{ opacity: 0, y: -8 }}
									transition={{ duration: 0.22 }}
								>
									{/* Timeline wrapper */}
									<div className="relative">
										{/* Vertical line */}
										<div className="absolute left-[7px] top-3 bottom-0 w-px bg-white/10" />

										<div className="flex flex-col gap-10">
											{grouped.map(({ date, events: evts }) => (
												<div
													key={date}
													className="relative pl-7"
													ref={(el) => {
														dateRefs.current[date] = el;
													}}
												>
													{/* Timeline dot — centered on the date header text */}
													<div className="absolute left-[1px] top-[7px] w-3 h-3 rounded-full bg-white/30 border border-white/15 z-10" />

													{/* Date header */}
													<p className="text-foreground text-base md:text-lg font-semibold mb-4">
														{formatDateHeader(date)}
													</p>

													{/* Cards or rows */}
													<div
														className={cn(
															"flex flex-col",
															viewMode === "grid" ? "gap-3" : "gap-1",
														)}
													>
														{evts.map((event) =>
															viewMode === "grid" ? (
																<EventCard
																	key={event.id}
																	event={event}
																	onClick={() => setSelectedEvent(event)}
																	isSelected={selectedEvent?.id === event.id}
																/>
															) : (
																<EventRow
																	key={event.id}
																	event={event}
																	onClick={() => setSelectedEvent(event)}
																	isSelected={selectedEvent?.id === event.id}
																/>
															),
														)}
													</div>
												</div>
											))}
										</div>
									</div>
								</motion.div>
							)}
						</AnimatePresence>
					</div>

					{/* Right: sticky sidebar — desktop only */}
					<div className="hidden lg:flex flex-col gap-4 w-80 shrink-0 sticky top-24">
						{/* Search + view toggle on the same line */}
						<div className="flex items-center gap-2">
							<div className="relative flex-1">
								<Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
								<input
									type="text"
									placeholder="Search events…"
									value={searchQuery}
									onChange={(e) => setSearchQuery(e.target.value)}
									className="w-full bg-white/[0.04] border border-border rounded-xl pl-9 pr-3 py-2.5 text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-white/25 transition-colors"
								/>
							</div>
							<div className="flex items-center gap-0.5 shrink-0 bg-white/5 border border-border rounded-xl p-1">
								<button
									type="button"
									onClick={() => setViewMode("grid")}
									className={cn(
										"p-2 rounded-lg transition-colors",
										viewMode === "grid"
											? "bg-white/15 text-foreground"
											: "text-muted-foreground hover:text-foreground",
									)}
									aria-label="Grid view"
								>
									<LayoutGrid className="w-4 h-4" />
								</button>
								<button
									type="button"
									onClick={() => setViewMode("list")}
									className={cn(
										"p-2 rounded-lg transition-colors",
										viewMode === "list"
											? "bg-white/15 text-foreground"
											: "text-muted-foreground hover:text-foreground",
									)}
									aria-label="List view"
								>
									<List className="w-4 h-4" />
								</button>
							</div>
						</div>

						<MiniCalendar eventDates={eventDates} onDateClick={scrollToDate} />

						{/* Upcoming / Past toggle — desktop only */}
						<div className="flex bg-white/5 border border-border rounded-full p-1 gap-0.5">
							{(["upcoming", "past"] as const).map((tab) => (
								<button
									key={tab}
									type="button"
									onClick={() => setActiveTab(tab)}
									className={cn(
										"flex-1 py-2.5 rounded-full text-base capitalize transition-all duration-200",
										activeTab === tab
											? "bg-foreground text-background font-medium"
											: "text-muted-foreground hover:text-foreground",
									)}
								>
									{tab}
								</button>
							))}
						</div>
					</div>
				</div>
			</main>

			<EventDrawer
				event={selectedEvent}
				onClose={() => setSelectedEvent(null)}
			/>
		</div>
	);
}
