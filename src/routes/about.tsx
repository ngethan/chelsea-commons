import { createFileRoute } from "@tanstack/react-router";
import { motion } from "motion/react";
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
	head: () => {
		const seo = buildSeoTags({
			title: "About - THE CHELSEA COMMONS",
			description:
				"Learn more about why we're building THE CHELSEA COMMONS and who our residents are. 12 ambitious interns from companies like Ramp, JPMorgan, and BlackRock.",
			path: "/about",
		});
		return {
			title: seo.title,
			meta: seo.meta,
			links: seo.links,
		};
	},
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
							loading="lazy"
							className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
						/>
					) : (
						<span className="text-muted-foreground text-sm">Photo</span>
					)}
				</div>
				<p className="text-foreground font-medium">{person.name}</p>
				<p className="text-muted-foreground text-sm">{person.company}</p>
			</button>

			<DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle className="text-xl">{person.name}</DialogTitle>
					<DialogDescription>
						{person.prevCompany
							? `${person.company} · Prev ${person.prevCompany}`
							: person.company}
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-4">
					<div className="aspect-[4/3] bg-muted flex items-center justify-center overflow-hidden">
						{person.image ? (
							<img
								src={person.image}
								alt={person.name}
								loading="lazy"
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
		bio: `I'm a junior studying Economics at the University of Southern California. This summer, I'll be interning at J.P. Morgan within their Commercial & Investment Banking Division.

Academically, I'm involved in research and recently published a clean energy paper in Energy Economics. I also have experience in policy and advocacy, having served as a Student Assembly Delegate where I represented student concerns at various conferences. I've previously interned with startups, and I'm deeply interested in building a company of my own in the future.

Outside of work, I love playing and watching sports - especially soccer (Hala Madrid), basketball, and tennis. I also enjoy playing a few hands of poker every now and then. Okay, I swear it's not gambling. Just probability and game theory.`,
		linkedin: "https://www.linkedin.com/in/chiragohri07/",
		image: "/assets/residents/ChiragOhri.webp",
	},
	{
		name: "Daniel Sung",
		company: "JPMorgan Chase",
		bio: `I'm a student at Vanderbilt University studying Human and Organizational Development as a Peabody Honors Scholar. This summer, I'll be a Marketing Learning Development Program Analyst at JPMorgan!

In the past, I've been the youngest NBA intern in league history, managed Vanderbilt men's basketball team, and been featured in Fortune magazine twice for my work in sports and entrepreneurship.

When I'm not working, you'll find me hooping, playing pickleball, or hitting the slopes snowboarding.`,
		linkedin: "https://www.linkedin.com/in/danielhsung/",
		image: "/assets/residents/DanielSung.webp",
	},
	{
		name: "Ethan Ng",
		company: "Ramp",
		bio: `I'm currently a junior at WashU studying CS and Finance. This summer, I'll be a SWE at Ramp and an 8VC fellow.

I previously cofounded an EdTech now company serving 10,000+ students and was employee #1 at a startup that raised $X,000,000 to build a consumer app for relationships.

In my free time, I love to play tennis, play piano, and do photography! Also super interested in cars and have a 2004 350Z.`,
		linkedin: "https://www.linkedin.com/in/ethan--ng/",
		image: "/assets/residents/EthanNg-v2.webp",
	},
	{
		name: "Jackson Dietz",
		company: "BlackRock",
		bio: `I'm a junior at Emory double-majoring in Computer Science and Business. This summer, I'll be joining BlackRock Aladdin as a Product Management Intern. Previously, I held a PM internship at Coca-Cola alongside a DS/ML role at a New York–based fintech, PEX.

I'm currently interning abroad in Rome at WorldLift, a global enterprise SEO and content-intelligence platform.

Outside of work, I play bass in the Emory University Symphony Orchestra and in a rock band on campus. My all-time top five artists: Radiohead, Led Zeppelin, King Gizzard & the Lizard Wizard, Dmitri Shostakovich, and Zohar Argov.`,
		linkedin: "https://www.linkedin.com/in/jackson-dietz-/",
		image: "/assets/residents/JacksonDietz-v3.webp",
	},
	{
		name: "Jorik Dammann",
		company: "Radial Equity Partners",
		bio: `I'm a Yale sophomore studying Economics & Mathematics and trying to score goals for the Men's Soccer team. This summer, I'll be a private equity intern at Radial Equity Partners.

Previously, I've interned at Q2 Software and Recursion Works. I'm also the founder and creator of RootOn, a high school sports app.

I dabble in competitive modular origami, am an avid fan of German rap, and strive to become a 10th-Dan tea master.`,
		linkedin: "https://www.linkedin.com/in/jorik-dammann/",
		image: "/assets/residents/JorikDammann.webp",
	},
	{
		name: "Robert Tezock",
		company: "Figma",
		bio: `I'm a Junior at The University of Texas at Austin studying Computer Science. I'll be joining Figma & Nvidia this coming Summer and Fall, both as a Software Engineering Intern.

Professionally, I'm largely interested in distributed systems & making applications scale. I've previously worked at small companies, large companies, and startups, and each experience has shaped my perspective on how to build applications that impact users globally.

Outside of work, you can either catch me playing basketball, watching anime (huge fan of Attack on Titan & One Piece), or dabbling around in something new- I always enjoy a new adventure :)`,
		linkedin: "https://www.linkedin.com/in/tezock/",
		image: "/assets/residents/RobertTezock.webp",
	},
	{
		name: "Sachin Sashti",
		company: "KPMG",
		bio: `I'm a senior at Penn State studying Finance, Accounting, and Philosophy. This summer, I'll be an M&A Consultant Intern at KPMG and I'm building a SaaS startup with a unicorn entrepreneur.

In the past, I've presented a policy proposal to EU delegates, was a Collegiate Debate National Finalist, and led the implementation of the first EVs into an F500 company's supply chain!

I love every type of game and hope to have a weekly resident game night :)`,
		linkedin: "https://www.linkedin.com/in/sachinsashti/",
		image: "/assets/residents/SachinSashti.webp",
	},
	{
		name: "Will Burkhart",
		company: "Teamworthy Ventures",
		bio: `I'm a sophomore at Vanderbilt majoring in math. When I'm not in class, I build software to make it easier for researchers to get funding from the DoD. Researchers from 10+ universities have used my software.

More generally, national security fires me up. Last summer, I interned at a Stanford national security center, worked with the Army's 75th Ranger Regiment, met four star generals (two of them), and worked on an autonomous weapon system to limit friendly fire. This summer, I'll be working in VC at Teamworthy Ventures.

A Tale of Two Cities by Dickens is my favorite book. My favorite movie is La La Land. My favorite artist is Olivia Dean. My favorite day is chest day. Fun fact: I lived in Spain for a year in high school and now I speak Spanish.`,
		linkedin: "https://www.linkedin.com/in/will-burkhart-4b525223a/",
		image: "/assets/residents/WillBurkhart.webp",
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
						<motion.p
							initial={{ opacity: 0, y: 15 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.4, ease: "easeOut" }}
							className="text-3xl md:text-5xl text-foreground leading-relaxed mb-8 font-serif italic"
						>
							12 Interns. 12 Companies. 1 Summer.
						</motion.p>

						<motion.p
							initial={{ opacity: 0, y: 15 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.4, ease: "easeOut", delay: 0.1 }}
							className="text-xl md:text-3xl text-foreground leading-relaxed mb-8"
						>
							We are bringing this group together to grow, build cool stuff, and
							be the heart of a larger intern ecosystem. Our residents include
							Stanford AI researchers, D1 athletes, and the NBA's youngest ever
							intern—incoming at companies like Ramp, JPMorgan, and BlackRock.
						</motion.p>

						<motion.p
							initial={{ opacity: 0, y: 15 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.4, ease: "easeOut", delay: 0.15 }}
							className="text-xl md:text-3xl text-foreground leading-relaxed mb-8"
						>
							We're backed by a unicorn founder and a Warp executive. We have 5
							spots left, apply now!
						</motion.p>

						<motion.p
							initial={{ opacity: 0, y: 15 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.4, ease: "easeOut", delay: 0.2 }}
							className="text-xl md:text-3xl text-foreground leading-relaxed"
						>
							Reach us at{" "}
							<a
								href="mailto:hey@chelseacommons.co"
								className="underline hover:text-muted-foreground transition-colors"
							>
								hey@chelseacommons.co
							</a>
							.
						</motion.p>
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
					<motion.h2
						initial={{ opacity: 0, y: 15 }}
						whileInView={{ opacity: 1, y: 0 }}
						viewport={{ once: true, margin: "-100px" }}
						transition={{ duration: 0.3 }}
						className="text-2xl font-medium text-foreground mb-12"
					>
						The Residents
					</motion.h2>
					<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
						{PEOPLE.map((person, index) => (
							<motion.div
								key={person.name}
								initial={{ opacity: 0, y: 20 }}
								whileInView={{ opacity: 1, y: 0 }}
								viewport={{ once: true, margin: "-50px" }}
								transition={{ duration: 0.3, delay: index * 0.05 }}
							>
								<PersonCard person={person} />
							</motion.div>
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

					<div className="flex flex-col justify-center py-10">
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
