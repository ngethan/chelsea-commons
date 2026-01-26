import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Navbar } from "../components/Navbar";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "../components/ui/dialog";
import { ScrollVelocityRow } from "../components/ui/scroll-based-velocity";
import { buildSeoTags } from "../site-config";

export const Route = createFileRoute("/about")({
	head: () =>
		buildSeoTags({
			title: "About - Chelsea Commons",
			description: "Our vision and the people behind Chelsea Commons",
			path: "/about",
		}),
	component: About,
});

function FitText({
	children,
	className,
	style,
}: {
	children: React.ReactNode;
	className?: string;
	style?: React.CSSProperties;
}) {
	const containerRef = useRef<HTMLDivElement>(null);
	const measureRef = useRef<HTMLSpanElement>(null);
	const [fontSize, setFontSize] = useState(10);

	useEffect(() => {
		const container = containerRef.current;
		const measure = measureRef.current;
		if (!container || !measure) return;

		const updateSize = () => {
			const containerWidth = container.offsetWidth;
			const measureWidth = measure.offsetWidth;
			if (measureWidth > 0) {
				setFontSize((containerWidth / measureWidth) * 10);
			}
		};

		document.fonts.ready.then(updateSize);
		const observer = new ResizeObserver(updateSize);
		observer.observe(container);
		return () => observer.disconnect();
	}, []);

	return (
		<div ref={containerRef} className="w-full">
			<span
				ref={measureRef}
				aria-hidden
				style={{
					position: "absolute",
					visibility: "hidden",
					fontSize: "10px",
					whiteSpace: "nowrap",
				}}
			>
				{children}
			</span>
			<span
				className={className}
				style={{
					display: "block",
					fontSize: `${fontSize}px`,
					whiteSpace: "nowrap",
					lineHeight: 0.85,
					...style,
				}}
			>
				{children}
			</span>
		</div>
	);
}

type Person = {
	name: string;
	company: string;
	prevCompany?: string;
	bio: string;
	linkedin: string;
	image: string | null;
};

function PersonCard({ person }: { person: Person }) {
	const [open, setOpen] = useState(false);

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<button
				type="button"
				onClick={() => setOpen(true)}
				className="text-left group cursor-pointer"
			>
				<div className="aspect-square bg-muted mb-4 flex items-center justify-center overflow-hidden">
					{person.image ? (
						<img
							src={person.image}
							alt={person.name}
							className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
						/>
					) : (
						<span className="text-muted-foreground text-sm">Photo</span>
					)}
				</div>
				<p className="text-foreground font-medium">{person.name}</p>
				<p className="text-muted-foreground text-sm">{person.company}</p>
			</button>

			<DialogContent className="sm:max-w-lg">
				<DialogHeader>
					<DialogTitle className="text-xl">{person.name}</DialogTitle>
					<DialogDescription>
						{person.prevCompany
							? `${person.company} · Prev ${person.prevCompany}`
							: person.company}
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-4">
					<div className="aspect-video bg-muted flex items-center justify-center overflow-hidden">
						{person.image ? (
							<img
								src={person.image}
								alt={person.name}
								className="w-full h-full object-cover"
							/>
						) : (
							<span className="text-muted-foreground text-sm">Photo</span>
						)}
					</div>

					<div className="space-y-3">
						<p className="text-foreground text-lg leading-relaxed whitespace-pre-line">
							{person.bio}
						</p>
						<a
							href={person.linkedin}
							target="_blank"
							rel="noopener noreferrer"
							className="inline-block text-sm text-foreground underline hover:text-muted-foreground transition-colors"
						>
							LinkedIn →
						</a>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}

const PEOPLE: Person[] = [
	{
		name: "Chirag Ohri",
		company: "JPMorgan Chase",
		bio: "TBD",
		linkedin: "https://www.linkedin.com/in/chiragohri07/",
		image: null,
	},
	{
		name: "Daniel Sung",
		company: "JPMorgan Chase",
		bio: "TBD",
		linkedin: "https://www.linkedin.com/in/danielhsung/",
		image: null,
	},
	{
		name: "Ethan Ng",
		company: "Ramp",
		bio: `Ethan is a junior at Washington University in St. Louis studying Computer Science and Finance. This summer, he'll be a Software Engineering Intern at Ramp and an 8VC fellow.

Previously, he cofounded Connect, an EdTech platform serving 10,000+ students, and was employee #1 at a startup that raised $xM to build a consumer app for relationships.

He's passionate about photography, plays piano, and plays tennis.`,
		linkedin: "https://www.linkedin.com/in/ethan--ng/",
		image: null,
	},
	{
		name: "Jackson Dietz",
		company: "BlackRock",
		bio: "TBD",
		linkedin: "https://www.linkedin.com/in/jackson-dietz-/",
		image: null,
	},
	{
		name: "Jorik Dammann",
		company: "Radial Equity Partners",
		bio: "TBD",
		linkedin: "https://www.linkedin.com/in/jorik-dammann/",
		image: null,
	},
	{
		name: "Sachin Sashti",
		company: "KPMG",
		bio: "TBD",
		linkedin: "https://www.linkedin.com/in/sachinsashti/",
		image: null,
	},
	{
		name: "Will Burkhart",
		company: "Teamworthy Ventures",
		bio: "TBD",
		linkedin: "https://www.linkedin.com/in/will-burkhart-4b525223a/",
		image: null,
	},
];

function About() {
	const [showScrollHint, setShowScrollHint] = useState(true);
	const peopleRef = useRef<HTMLElement>(null);

	useEffect(() => {
		const peopleSection = peopleRef.current;
		if (!peopleSection) return;

		const observer = new IntersectionObserver(
			([entry]) => {
				setShowScrollHint(!entry.isIntersecting);
			},
			{ threshold: 0.1 },
		);

		observer.observe(peopleSection);
		return () => observer.disconnect();
	}, []);

	return (
		<div className="min-h-dvh relative z-10">
			<Navbar />
			<main className="px-6 md:px-12">
				{/* Vision Section */}
				<section className="min-h-[50vh] md:h-[calc(100dvh-110px)] flex flex-col justify-between relative">
					<div className="max-w-3xl py-12">
						<p className="text-3xl md:text-5xl text-foreground leading-relaxed mb-8 font-serif">
							Chelsea Commons exists to <em>compound the strengths</em> of 12
							ambitious interns in New York City into an unforgettable summer.
						</p>

						<p className="text-xl md:text-3xl text-foreground leading-relaxed mb-8">
							We are curating this group to grow together, build cool stuff, and
							be the heart of a larger intern ecosystem, creating events and
							community for all New York interns, while being surrounded by
							insane talent.
						</p>
						<p className="text-xl md:text-3xl text-foreground leading-relaxed">
							Reach us at{" "}
							<a
								href="mailto:hey@chelseacommons.co"
								className="underline hover:text-muted-foreground transition-colors"
							>
								hey@chelseacommons.co
							</a>
							.
						</p>
					</div>
					<div className="flex flex-col gap-4">
						<div className="hidden md:flex items-end justify-end">
							<button
								type="button"
								onClick={() =>
									peopleRef.current?.scrollIntoView({ behavior: "smooth" })
								}
								className={`text-foreground flex items-center gap-2 tracking-widest uppercase transition-all duration-500 cursor-pointer hover:opacity-60 ${
									showScrollHint
										? "opacity-100"
										: "opacity-0 pointer-events-none"
								}`}
							>
								<span className="text-sm font-medium">Meet the team</span>
								<span className="text-lg">↓</span>
							</button>
						</div>
						<div className="border-t border-border" />
					</div>
				</section>

				{/* People Section */}
				<section ref={peopleRef} className="py-24">
					<h2 className="text-2xl font-medium text-foreground mb-12">
						The Residents
					</h2>
					<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
						{PEOPLE.map((person) => (
							<PersonCard key={person.name} person={person} />
						))}
					</div>
				</section>
			</main>

			<footer className="relative flex flex-col overflow-hidden border-t border-border">
				<div
					className="absolute inset-0 overflow-hidden"
					style={
						{
							"--aurora":
								"repeating-linear-gradient(100deg, #2d1f3d 10%, #4a1942 15%, #c94c4c 20%, #f4a261 25%, #e76f51 30%, #8b5cf6 35%)",
							maskImage:
								"linear-gradient(to bottom, transparent 0%, transparent 40%, black 100%)",
							WebkitMaskImage:
								"linear-gradient(to bottom, transparent 0%, transparent 40%, black 100%)",
						} as React.CSSProperties
					}
				>
					<div
						className="after:animate-aurora pointer-events-none absolute -inset-[10px] opacity-70 blur-[20px] will-change-transform after:absolute after:inset-0 after:mix-blend-difference after:content-['']"
						style={{
							backgroundImage: "var(--aurora)",
							backgroundSize: "200%, 400%",
							backgroundPosition: "50% 50%",
						}}
					/>
					<div
						className="absolute inset-0 opacity-30"
						style={{
							backgroundImage: "url(/grain.avif)",
							backgroundSize: "200px",
						}}
					/>
				</div>

				<div className="relative z-10 flex flex-col flex-1">
					<div className="px-6 md:px-12 py-6 flex items-center justify-between">
						<div className="text-sm text-muted-foreground">
							<a
								href="mailto:hey@chelseacommons.co"
								className="hover:text-foreground transition-colors"
							>
								hey@chelseacommons.co
							</a>
							<p>300 W 20th Street, New York, NY 10011</p>
						</div>
						<div className="flex items-center gap-6 text-sm text-muted-foreground">
							<a
								href="https://twitter.com"
								target="_blank"
								rel="noopener noreferrer"
								className="hover:text-foreground transition-colors"
							>
								Twitter
							</a>
							<a
								href="https://www.linkedin.com/company/the-chelsea-commons/"
								target="_blank"
								rel="noopener noreferrer"
								className="hover:text-foreground transition-colors"
							>
								LinkedIn
							</a>
						</div>
					</div>

					<div className="flex flex-col justify-center py-12">
						<FitText className="font-serif text-8xl tracking-tight text-white opacity-75 leading-none select-none">
							CHELSEA
						</FitText>
						<FitText className="font-serif text-8xl tracking-tight text-white opacity-75 leading-none select-none">
							COMMONS
						</FitText>
					</div>

					<div className="border-t border-border py-4">
						<ScrollVelocityRow baseVelocity={3}>
							<span className="text-sm text-muted-foreground mx-8">
								NEW YORK CITY
							</span>
							<span className="text-sm text-muted-foreground mx-8">✦</span>
							<span className="text-sm text-muted-foreground mx-8">
								SUMMER 2026
							</span>
							<span className="text-sm text-muted-foreground mx-8">✦</span>
							<span className="text-sm text-muted-foreground mx-8">
								12 RESIDENTS
							</span>
							<span className="text-sm text-muted-foreground mx-8">✦</span>
							<span className="text-sm text-muted-foreground mx-8">
								MANHATTAN
							</span>
							<span className="text-sm text-muted-foreground mx-8">✦</span>
						</ScrollVelocityRow>
					</div>
				</div>
			</footer>
		</div>
	);
}
